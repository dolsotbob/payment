// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./interfaces/IVault.sol";

contract Payment is
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    // ===== Constants =====
    uint256 private constant BPS_DENOMINATOR = 10_000; // 100% = 10,000
    uint16 private constant DEFAULT_MAX_DISCOUNT_BPS = 9_000; // 90%

    // ===== Storage =====
    IERC20 public token; // token은 결제에 사용할 ERC20 토큰; 자동 getter 함수 생성
    address public vaultAddress; // 정산/캐시백 담당 Vault
    uint16 public cashbackBps; // 0~10000 (예: 200 = 2%)
    uint16 public maxDiscountBps; // 기본 9000 권장

    struct CouponRule {
        address nft;
        uint256 id;
        uint16 discountBps; // 0~10000
        uint64 expiresAt; // 0이면 무기한
        bool enabled;
        bool consumable; // 1회성 사용 여부
    }

    // key: keccak256(nft, id) - 특정 NFT와 토큰 ID 조합에 대한 할인 쿠폰 규칙을 저장
    // nft는 쿠폰 NFT의 컨트랙트 주소, id는 쿠폰 NFT의 컨트랙트 주소
    mapping(bytes32 => CouponRule) private rules;
    // 사용 여부: buyer => nft => id => used?(true면 이미 사용됨, false면 사용 가능)
    // 이 구매자(buyer)가, 이 NFT(nft)의 특정 토큰 ID(id) 쿠폰을 이미 사용했는지” 를 나타내는 불린 플래그
    mapping(address => mapping(address => mapping(uint256 => bool)))
        private used;

    // ===== Events =====
    // 할인 미사용이면 discountBps/discountAmount는 0으로 기록
    // cashbackBps: 예: 200 = 2%
    // cashbackAmount: priceAfter 기준
    event Paid(
        address indexed buyer,
        address indexed vault,
        uint256 priceBefore,
        uint256 priceAfter,
        uint16 discountBps,
        uint256 discountAmount,
        uint16 cashbackBps,
        uint256 cashbackAmount
    );

    event CouponApplied(
        address indexed buyer,
        address indexed nft,
        uint256 indexed id,
        uint16 appliedBps,
        uint256 discountAmount,
        bool consumed
    );

    event ConfigUpdated(
        address token,
        address vault,
        uint16 cashbackBps,
        uint16 maxDiscountBps
    );

    event CouponRuleSet(
        bytes32 indexed key,
        address indexed nft,
        uint256 indexed id,
        uint16 discountBps,
        uint64 expiresAt,
        bool enabled,
        bool consumable
    );
    event CouponRuleDisabled(bytes32 indexed key);

    // ===== Constructor (logic contract 잠금) =====
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // 구현컨트랙트 직접 초기화 금지(업그레이더블 보안 템플릿)
    }

    // ===== Initializer =====
    // 프록시 최초 배포 시 1회 초기 설정(토큰/볼트/캐시백BPS/최대할인 BPS)
    function initialize(
        address _token,
        address _vaultAddress,
        uint16 _cashbackBps,
        uint16 _maxDiscountBps,
        address _initialOwner
    ) external initializer {
        require(_token != address(0), "Invalid token address");
        require(_vaultAddress != address(0), "Invalid vault address");
        require(_initialOwner != address(0), "owner=0");
        require(
            _cashbackBps <= BPS_DENOMINATOR &&
                _maxDiscountBps <= BPS_DENOMINATOR,
            "bps"
        );

        // 업그레이더블 모듈 초기화. (v5 기준: 오너를 msg.sender로 설정)
        __Ownable_init(_initialOwner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        // 스토리지에 초기값 저장. maxDiscountBps 미지정(0)이면 기본 90% 캡
        token = IERC20(_token);
        vaultAddress = _vaultAddress;
        cashbackBps = _cashbackBps;
        maxDiscountBps = (_maxDiscountBps == 0)
            ? DEFAULT_MAX_DISCOUNT_BPS
            : _maxDiscountBps;

        // 설정 변경 히스토리 남기기
        emit ConfigUpdated(_token, _vaultAddress, _cashbackBps, maxDiscountBps);
    }

    // ===== UUPS auth =====
    // UUPS 업그레이드 권한 체크(onlyOwner)
    // UUPS 업그레이드 권한을 오너로 제한. (Timelock/Multisig를 owner로 세팅하면 거버넌스 보호)
    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ===== Admin (최소 구성) =====
    // 관리자용 설정(토큰/볼트/캐시백BPS/최대할인BPS) 일괄 업데이트(옵션 항목만 반영)
    function setConfig(
        address _token,
        address _vault,
        uint16 _cashbackBps,
        uint16 _maxDiscountBps
    ) external onlyOwner {
        // 입력값이 유효할 때만 반영(부분 업데이트 허용)
        if (_token != address(0)) token = IERC20(_token);
        if (_vault != address(0)) vaultAddress = _vault;
        if (_cashbackBps <= BPS_DENOMINATOR) cashbackBps = _cashbackBps;
        if (_maxDiscountBps != 0 && _maxDiscountBps <= BPS_DENOMINATOR)
            maxDiscountBps = _maxDiscountBps;

        // 변경 내역 이벤트
        emit ConfigUpdated(
            address(token),
            vaultAddress,
            cashbackBps,
            maxDiscountBps
        );
    }

    // 특정 NFT(id) 쿠폰 룰 등록/갱신
    // 룰 검증(주소/만분율) -> 키 생성 -> 저장.(필요시 별도 RuleSet 이벤트 추가 가능)
    function setCouponRule(CouponRule calldata rule) external onlyOwner {
        // 1) 주소/컨트랙트 유효성
        require(rule.nft != address(0), "invalid nft");
        require(rule.nft.code.length > 0, "nft not a contract"); // OZ Address 안 쓰고도 체크 가능(≥0.8.10)

        // 2) 할인율 범위 (BPS: 100% = 10_000)
        require(rule.discountBps <= BPS_DENOMINATOR, "bps > 100%");

        // 3) 만료일 유효성 (0=무기한 허용, 그 외에는 미래여야 함)
        if (rule.expiresAt != 0) {
            require(rule.expiresAt > block.timestamp, "already expired");
        }

        // 4) 키 생성 및 이전 값 스냅샷(감사·디버깅용)
        bytes32 key = _ruleKey(rule.nft, rule.id);
        // CouponRule memory prev = rules[key];  // 추후 변경 이력 로그에 사용

        // 5) 저장(동일 키 존재 시 업데이트)
        rules[key] = rule;

        // 6) 이벤트: 인덱싱 용이하게 필드로 펼쳐서 기록
        emit CouponRuleSet(
            key,
            rule.nft,
            rule.id,
            rule.discountBps,
            rule.expiresAt,
            rule.enabled,
            rule.consumable
        );
        // (struct 통째로 이벤트에 넣는 것은 비권장)
    }

    // 쿠폰 룰 비활성화
    // 활성 플래그만 false로 전환(룰 자체는 남겨 히스토리 유지)
    function disableCouponRule(address nft, uint256 id) external onlyOwner {
        bytes32 key = _ruleKey(nft, id); // rules 매핑에서 해당 규칙 찾는데 사용
        rules[key].enabled = false;
        emit CouponRuleDisabled(key);
    }

    // ===== Payment: permit + 할인 + 캐시백 + 정산 =====
    // EIP-2612 permit + 할인 + 캐시백 + Vault 정산을 한 번에 처리. 재진입 보호
    function permitAndPayWithCashback(
        address owner,
        uint256 value, // permit allowance (보통 결제 금액 이상 )
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        uint256 price,
        address couponNft, // 0 주소면 사용 안함
        uint256 couponId,
        bool useCoupon
    ) external nonReentrant {
        require(owner != address(0), "Invalid owner address");
        require(price > 0, "price = 0");
        require(deadline >= block.timestamp, "permit expired");
        require(!useCoupon || couponNft != address(0), "couponNft=0");

        // 0) 미리 할인 견적(permit 전에 조기 실패 가능)
        uint256 quotedAfter;
        uint16 quotedBps;
        string memory reason;
        (
            quotedAfter,
            quotedBps /* skip willConsume */,
            ,
            reason
        ) = _previewDiscount(price, owner, couponNft, couponId);

        uint256 afterPrice = price;
        uint16 appliedBps = 0;
        if (useCoupon) {
            require(
                bytes(reason).length == 0 ||
                    keccak256(bytes(reason)) == keccak256(bytes("noop")),
                reason
            );
            afterPrice = quotedAfter;
            appliedBps = quotedBps;
        }

        // permit allowance 부족 시 조기 실패
        require(value >= afterPrice, "permit value < price");

        // 1) permit 실행: 오프체인 서명으로 allowance를 부여
        // 서명을 통해 approve 없이도 허용
        IERC20Permit(address(token)).permit(
            owner,
            address(this),
            value,
            deadline,
            v,
            r,
            s
        );

        // 2) 할인 적용: 룰 유효성 체크, 1회성 쿠폰이면 사용 체크 기록
        uint256 discount;
        bool consumed;
        if (useCoupon && (couponNft != address(0))) {
            (afterPrice, discount, appliedBps, consumed) = _discount(
                price,
                owner,
                couponNft,
                couponId,
                true
            );
        }

        // 3) 수금: 할인 후 금액만큼 Payment로 전송(표준/비표준 토큰 모두 안전 처리)
        token.safeTransferFrom(owner, address(this), afterPrice);

        // 4) 정산(잔액 vault로 전송) (SafeERC20)
        token.safeTransfer(vaultAddress, afterPrice);

        // 5) 캐시백 (기본: 할인 후 금액 기준)
        uint256 cashback = (afterPrice * cashbackBps) / BPS_DENOMINATOR;
        if (cashback > 0) {
            IVault(vaultAddress).provideCashback(owner, cashback);
        }

        // 6) 영수증 이벤트
        // 쿠폰을 사용하려고 시도했다면(주소가 0이 아니고 useCoupon=true) 할인 0이어도 이벤트 기록
        bool triedCoupon = useCoupon && couponNft != address(0);
        if (triedCoupon) {
            emit CouponApplied(
                owner,
                couponNft,
                couponId,
                appliedBps, // 할인 없으면 0
                discount, // 할인 없으면 0
                consumed // 소비형이 아니거나 미적용이면 false
            );
        }

        emit Paid(
            owner,
            vaultAddress,
            price,
            afterPrice,
            appliedBps, // 0일 수 있음
            discount, // 0일 수 있음
            cashbackBps,
            cashback
        );
    }

    // ===== Views =====
    function getTokenAddress() external view returns (address) {
        return address(token);
    }

    function getVaultAddress() external view returns (address) {
        return vaultAddress;
    }

    function getCouponRule(
        address nft,
        uint256 id
    ) external view returns (CouponRule memory) {
        return rules[_ruleKey(nft, id)];
    }

    // 프론트 견적용 뷰(할인 결과/사유 미리보기)
    function quoteDiscounted(
        uint256 price,
        address buyer,
        address nft,
        uint256 id
    )
        external
        view
        returns (
            uint256 discounted, // 할인 적용 후 결제 금액
            uint16 appliedBps, // 적용된 할인율
            bool willConsume, // 이 호출이 실제 결제였다면 쿠폰을 소모했을지 여부
            string memory reason
        )
    {
        return _previewDiscount(price, buyer, nft, id);
    }

    // ===== Internals =====
    // (내부) 쿠폰 룰 식별키 생성(nft, id => bytes32 고유키)
    // internal pure: 내부에서만 쓰이고, 상태를 읽지 않아서 pure
    function _ruleKey(address nft, uint256 id) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(nft, id));
    }

    // (내부, view) 룰 검증·적용 시뮬레이션, 사유 문자열 제공
    function _previewDiscount(
        uint256 price,
        address buyer,
        address nft,
        uint256 id
    )
        internal
        view
        returns (
            uint256 discounted,
            uint16 appliedBps,
            bool willConsume,
            string memory reason
        )
    {
        // 조기 중료
        // 가격 0원이거나, 쿠폰 미사용(= nft 0주소)이면 계산할 게 없음
        // 할인 전 금액 그대로, 할인율 0, 소모 없음, 사유 "noop"
        if (price == 0 || nft == address(0)) {
            return (price, 0, false, "noop");
        }

        // 	위의 _ruleKey로 룰 키 생성 후, 저장된 룰 구조체를 읽어옴.
        bytes32 key = _ruleKey(nft, id);
        CouponRule memory r = rules[key];

        // 룰이 비활성화면 할인 불가
        if (!r.enabled) return (price, 0, false, "disabled");
        // 만료 검사: expiresAt가 0이면 무기한, 아니면 현재 시간이 지나면 만료
        if (r.expiresAt != 0 && block.timestamp > r.expiresAt)
            return (price, 0, false, "expired");
        // 소유 검사: 구매자가 해당 id의 쿠폰 NFT를 1개 이상 보유해야 함. 없으면 "no-balance"
        if (IERC1155(nft).balanceOf(buyer, id) == 0)
            return (price, 0, false, "no-balance");
        // 소모형 쿠폰이고 이미 이 구매자/쿠폰 조합이 사용 처리됨이면 재사용 불가 → "consumed"
        if (r.consumable && used[buyer][nft][id])
            return (price, 0, false, "consumed");

        // 상한선(cap): 관리자가 maxDiscountBps를 지정했으면 그 값을, 아니면 기본 상한 사용
        // 과도한 할인으로 0원 결제되지 않도록 보호
        uint16 cap = (maxDiscountBps == 0)
            ? DEFAULT_MAX_DISCOUNT_BPS
            : maxDiscountBps; // 기본 90%
        // 룰에 명시된 할인율과 cap 중 더 작은 값을 실제 적용률로 선택
        uint16 bps = r.discountBps > cap ? cap : r.discountBps;
        // 할인액 계산. 정수 나눗셈이라 버림이 일어나며, 이는 과소 청구 방지 효과
        uint256 discount = (price * bps) / BPS_DENOMINATOR; // 바닥 내림(과소 청구 방지)

        return (price - discount, bps, r.consumable, "");
    }

    // (내부, state) 실제 할인 적용 및 1회성 쿠폰 “사용 체크”
    function _discount(
        uint256 price,
        address buyer,
        address nft,
        uint256 id,
        bool useCoupon
    )
        private
        returns (
            uint256 afterPrice,
            uint256 discount,
            uint16 bps,
            bool consumed
        )
    {
        if (!useCoupon || nft == address(0)) return (price, 0, 0, false);

        bytes32 key = _ruleKey(nft, id);
        CouponRule memory r = rules[key];

        if (!r.enabled) return (price, 0, 0, false);
        if (r.expiresAt != 0 && block.timestamp > r.expiresAt)
            return (price, 0, 0, false);
        if (IERC1155(nft).balanceOf(buyer, id) == 0)
            return (price, 0, 0, false);
        if (r.consumable && used[buyer][nft][id]) return (price, 0, 0, false);

        uint16 cap = (maxDiscountBps == 0)
            ? DEFAULT_MAX_DISCOUNT_BPS
            : maxDiscountBps;
        bps = r.discountBps > cap ? cap : r.discountBps;
        discount = (price * bps) / BPS_DENOMINATOR;
        afterPrice = price - discount;

        if (r.consumable) {
            used[buyer][nft][id] = true; // 결제 실패 시 전체 revert되어 원복됨
            consumed = true;
        }
    }

    // 업그레이드 여유 슬롯
    // ----- 항상 __gap은 "마지막"에 유지 -----
    uint256[50] private __gap; // 기존과 동일하게 두세요(칸 여유 유지)
}
