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
        bool enabled; // 사용 가능 여부
        bool consumable; // 1회성 사용 여부
    }

    struct DiscountQuote {
        uint256 quotedAfter; // 할인 후 금액
        uint16 quotedBps; // 적용 Bps
        bool willConsume; // 소모형 쿠폰인지
        string reason; //실패 사유("")면 정상
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

        // 업그레이더블 모듈 초기화
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
        // rule.nft: CouponRule 구조체의 nft (address 타입)
        // address.code: 해당 주소에 배포된 바이트코드(bytes)를 반환.
        // 이 bytes 값이 빈 배열이면 해당 주소에 스마트 컨트랙트가 없다는 뜻 (일반 주소이거나 아직 컨트랙트 미배포 상태)
        require(rule.nft.code.length > 0, "nft not a contract");

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
        // rules: bytes32키에 대응하는 CouponRule 구조체를 저장하는 매핑
        // rule: CouponRule 구조체 값
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

    // 할인 시뮬레이션(조회) - 프리뷰에서만 사용, 상태 변경 없음
    function _quoteDiscountCore(
        uint256 price,
        address buyer,
        address nft,
        uint256 id
    )
        internal
        view
        returns (
            uint256 afterPrice,
            uint256 discount,
            uint16 bps,
            bool willConsume,
            string memory reason
        )
    {
        // 쿠폰 안 쓰는 경우(0주소) 바로 반환
        if (price == 0 || nft == address(0)) {
            return (price, 0, 0, false, "noop");
        }

        // 룰 조회
        bytes32 key = _ruleKey(nft, id);
        CouponRule memory r = rules[key];

        if (!r.enabled) return (price, 0, 0, false, "disabled");
        if (r.expiresAt != 0 && block.timestamp > r.expiresAt)
            // 만료 체크
            return (price, 0, 0, false, "expired");
        if (IERC1155(nft).balanceOf(buyer, id) == 0)
            // 보유 체크 (ERC1155 가정)
            return (price, 0, 0, false, "no-balance");
        if (r.consumable && used[buyer][nft][id])
            return (price, 0, 0, false, "consumed");

        // 할인율 상한
        uint16 cap = (maxDiscountBps == 0)
            ? DEFAULT_MAX_DISCOUNT_BPS
            : maxDiscountBps;
        uint16 appliedBps = r.discountBps > cap ? cap : r.discountBps;

        // 할인 계산
        discount = (price * appliedBps) / BPS_DENOMINATOR;
        afterPrice = price - discount;

        return (afterPrice, discount, appliedBps, r.consumable, "");
    }

    // 할인 적용 + 필요 시 쿠폰 소모 처리 - 결제 단계에서 사용
    // _quoteDiscountCore와의 차이점: 상태 변경(쿠폰 소모 처리)가 포함됨;
    // consume이 false면 소모 처리 없이 미리보기처럼 동작
    function _discountCore(
        uint256 price,
        address owner,
        address couponNft,
        uint256 couponId,
        bool consume
    )
        internal
        returns (
            uint256 afterPrice,
            uint256 discount,
            uint16 bps,
            bool consumed,
            string memory reason
        )
    {
        (afterPrice, discount, bps, consumed, reason) = _quoteDiscountCore(
            price,
            owner,
            couponNft,
            couponId
        );

        if (bytes(reason).length != 0) {
            consumed = false;
            return (afterPrice, discount, bps, consumed, reason);
        }

        // 실제 결제 단계에서만 소모 처리 (결제 실패 시 revert로 원복됨)
        if (consume && consumed) {
            used[owner][couponNft][couponId] = true;
        } else {
            consumed = false;
        }
    }

    // 프리뷰 (permit 전에 조회용)
    // 프론트에서 “쿠폰 유효/얼마 할인되는지”를 결제 전에 알 수 있도록
    function _previewDiscount(
        uint256 price,
        address owner,
        address couponNft,
        uint256 couponId
    ) internal view returns (DiscountQuote memory q) {
        (
            uint256 afterP, // 할인 적용 후 예상 결제액
            ,
            // 내부에서 계산된 discount 값(여기서는 안 씀)
            uint16 bps, // 적용될 할인율 (BPS)
            bool willConsume, // 이 쿠폰이 소모형인지(결제였다면 소모될지) )
            string memory reason // 실패 사유(빈 문자열이면 정상)
        ) = _quoteDiscountCore(price, owner, couponNft, couponId);
        // 받은 값을 DiscountQuote 구조체 q에 담아 반환
        q.quotedAfter = afterP;
        q.quotedBps = bps;
        q.willConsume = willConsume;
        q.reason = reason;
    }

    // ===== Payment: permit + 할인 + 캐시백 + 정산 =====
    // EIP-2612 permit + 할인 + 캐시백 + Vault 정산을 한 번에 처리. 재진입 보호
    // nonReentrant: OZ ReentrancyGuard에서 제공하는 modifier
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

        // 0) 프리뷰: permit 전에 조기 실패 가능
        // _previewDiscount()를 호출해 할인 가능 여부와 결과 조회
        DiscountQuote memory q = _previewDiscount(
            price,
            owner,
            couponNft,
            couponId
        );
        // 쿠폰 사용 시 실패 사유 확인
        if (useCoupon) {
            // 빈 문자열이면 정상
            require(bytes(q.reason).length == 0, q.reason);
        }

        // 할인 후 결제 금액, 할인율 확정
        uint256 afterPrice = useCoupon ? q.quotedAfter : price;
        uint16 appliedBps = useCoupon ? q.quotedBps : 0;

        // permit allowance 부족 시 조기 실패
        // value는 permit 서명으로 부여할 allowance(토큰 전송 한도)
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
            uint256 after2;
            uint16 bps2;
            string memory reason2;
            (after2, discount, bps2, consumed, reason2) = _discountCore(
                price,
                owner,
                couponNft,
                couponId,
                true // consume
            );
            require(bytes(reason2).length == 0, reason2);
            require(
                after2 == afterPrice && bps2 == appliedBps,
                "quote mismatch"
            );
            afterPrice = after2;
            appliedBps = bps2;
        }

        // 3) 수금: 할인 후 금액만큼 Payment로 전송(표준/비표준 토큰 모두 안전 처리)
        // fee-on-transfer 대비 — 실제 수령액 기준 처리
        uint256 balBefore = token.balanceOf(address(this));
        token.safeTransferFrom(owner, address(this), afterPrice);
        uint256 received = token.balanceOf(address(this)) - balBefore;
        require(received > 0, "transfer failed");

        // 4) 정산(잔액 vault로 전송) (SafeERC20) - 반드시 received 기준
        token.safeTransfer(vaultAddress, received);

        // 5) 캐시백 (기본: 실제 수령액 기준)
        uint256 cashback = (received * cashbackBps) / BPS_DENOMINATOR;
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
            received, // 실수령액 기록
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
            bool willConsume, // 실제 결제였다면 소모될지
            string memory reason
        )
    {
        DiscountQuote memory q = _previewDiscount(price, buyer, nft, id);
        return (q.quotedAfter, q.quotedBps, q.willConsume, q.reason);
    }

    // ===== Internals =====
    // (내부) 쿠폰 룰 식별키 생성(nft, id => bytes32 고유키)
    // internal pure: 내부에서만 쓰이고, 상태를 읽지 않아서 pure
    function _ruleKey(address nft, uint256 id) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(nft, id));
    }

    // 업그레이드 여유 슬롯
    // ----- 항상 __gap은 "마지막"에 유지 -----
    uint256[50] private __gap; // 기존과 동일하게 두세요(칸 여유 유지)
}
