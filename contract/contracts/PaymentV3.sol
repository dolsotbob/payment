// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import {IERC1155} from "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "./interfaces/IVault.sol";

/**
 * @title Payment (V3)
 * @notice 업그레이더블 결제 컨트랙트. ERC20 결제 + 캐시백 + ERC1155 쿠폰 할인.
 * @dev V3-minimal: 스토리지 변경 없음. 편의 뷰(getCouponRules, canUseCoupon, ruleKey)만 추가.
 *      기존 프록시에서 upgradeTo(newImpl)만으로 교체 가능.
 */
contract PaymentV3 is
    UUPSUpgradeable,
    OwnableUpgradeable,
    ReentrancyGuardUpgradeable
{
    using SafeERC20 for IERC20;

    // ===== Constants =====
    uint256 private constant BPS_DENOMINATOR = 10_000; // 100% = 10,000
    uint16 private constant DEFAULT_MAX_DISCOUNT_BPS = 9_000; // 90%

    // ===== Storage (변경 금지: 순서/타입 유지) =====
    IERC20 public token; // 결제에 사용할 ERC20 토큰
    address public vaultAddress; // 정산/캐시백 Vault
    uint16 public cashbackBps; // 0~10000
    uint16 public maxDiscountBps; // 기본 9000 권장

    struct CouponRule {
        address nft; // ERC1155 쿠폰 컨트랙트
        uint256 id; // 토큰 ID
        uint16 discountBps; // 0~10000
        uint64 expiresAt; // 0 = 무기한
        bool enabled; // 사용 가능 여부
        bool consumable; // 1회성 사용 여부(소모형)
    }

    struct DiscountQuote {
        uint256 quotedAfter; // 할인 후 금액
        uint16 quotedBps; // 적용 Bps
        bool willConsume; // 소모형 쿠폰인지
        string reason; // 실패 사유 (빈 문자열이면 정상) - view 전용
    }

    // ==== Custom Errors ====
    error CouponDisabled();
    error CouponExpired();
    error CouponNoBalance();
    error CouponConsumed();
    error CouponNoop();

    // key: keccak256(nft, id)
    mapping(bytes32 => CouponRule) private rules;

    // 사용 여부: buyer => nft => id => used?
    mapping(address => mapping(address => mapping(uint256 => bool)))
        private used;

    // ===== Events =====
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

    event CouponRuleDisabled(
        bytes32 indexed key,
        address indexed nft,
        uint256 indexed id
    );

    // ===== Constructor (logic 잠금) =====
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers(); // 구현컨트랙트 직접 초기화 금지(업그레이더블 보안 템플릿)
    }

    // ===== Initializer =====
    // 업그레이드 시 호출되지 않음
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

        __Ownable_init(_initialOwner);
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        token = IERC20(_token);
        vaultAddress = _vaultAddress;
        cashbackBps = _cashbackBps;
        maxDiscountBps = (_maxDiscountBps == 0)
            ? DEFAULT_MAX_DISCOUNT_BPS
            : _maxDiscountBps;

        emit ConfigUpdated(_token, _vaultAddress, _cashbackBps, maxDiscountBps);
    }

    // ===== UUPS auth =====
    function _authorizeUpgrade(address) internal override onlyOwner {}

    // ===== Admin =====
    // 관리자용 설정(토큰/볼트/캐시백BPS/최대할인BPS) 일괄 업데이트(옵션 항목만 반영)
    function setConfig(
        address _token,
        address _vault,
        uint16 _cashbackBps,
        uint16 _maxDiscountBps
    ) external onlyOwner {
        if (_token != address(0)) token = IERC20(_token);
        if (_vault != address(0)) vaultAddress = _vault;
        if (_cashbackBps <= BPS_DENOMINATOR) cashbackBps = _cashbackBps;
        if (_maxDiscountBps != 0 && _maxDiscountBps <= BPS_DENOMINATOR)
            maxDiscountBps = _maxDiscountBps;

        emit ConfigUpdated(
            address(token),
            vaultAddress,
            cashbackBps,
            maxDiscountBps
        );
    }

    function setCouponRule(CouponRule calldata rule) external onlyOwner {
        require(rule.nft != address(0), "invalid nft");
        require(rule.nft.code.length > 0, "nft not a contract");
        require(
            IERC165(rule.nft).supportsInterface(0xd9b67a26),
            "nft !ERC1155"
        );
        require(rule.discountBps <= BPS_DENOMINATOR, "bps > 100%");

        if (rule.expiresAt != 0) {
            require(rule.expiresAt > block.timestamp, "already expired");
        }

        bytes32 key = _ruleKey(rule.nft, rule.id);
        rules[key] = rule;

        emit CouponRuleSet(
            key,
            rule.nft,
            rule.id,
            rule.discountBps,
            rule.expiresAt,
            rule.enabled,
            rule.consumable
        );
    }

    function disableCouponRule(address nft, uint256 id) external onlyOwner {
        bytes32 key = _ruleKey(nft, id);
        rules[key].enabled = false;
        emit CouponRuleDisabled(key, nft, id);
    }

    // ===== Internals: 검증 + 견적 =====
    function _validateAndQuote(
        uint256 price,
        address buyer,
        address nft,
        uint256 id
    )
        internal
        view
        returns (uint256 afterPrice, uint16 appliedBps, bool willConsume)
    {
        if (price == 0 || nft == address(0)) revert CouponNoop();

        bytes32 key = _ruleKey(nft, id);
        CouponRule memory r = rules[key];

        if (!r.enabled) revert CouponDisabled();
        if (r.expiresAt != 0 && block.timestamp > r.expiresAt)
            revert CouponExpired();
        if (IERC1155(nft).balanceOf(buyer, id) == 0) revert CouponNoBalance();
        if (r.consumable && used[buyer][nft][id]) revert CouponConsumed();

        uint16 cap = (maxDiscountBps == 0)
            ? DEFAULT_MAX_DISCOUNT_BPS
            : maxDiscountBps;
        appliedBps = r.discountBps > cap ? cap : r.discountBps;

        uint256 discount = (price * appliedBps) / BPS_DENOMINATOR;
        afterPrice = price - discount;
        willConsume = r.consumable;
    }

    // try/catch용 external view 래퍼
    function _tryValidateAndQuote(
        uint256 price,
        address buyer,
        address nft,
        uint256 id
    ) external view returns (uint256, uint16, bool) {
        return _validateAndQuote(price, buyer, nft, id);
    }

    // ===== Payment: permit + 할인 + 캐시백 + 정산 =====
    function permitAndPayWithCashback(
        address owner,
        uint256 value, // permit allowance(결제금액 이상 권장)
        uint256 deadline,
        uint8 v,
        bytes32 r,
        bytes32 s,
        uint256 price,
        address couponNft, // 0 주소면 쿠폰 미사용
        uint256 couponId,
        bool useCoupon
    ) external nonReentrant {
        require(owner != address(0), "Invalid owner address");
        require(price > 0, "price = 0");
        require(deadline >= block.timestamp, "permit expired");
        require(!useCoupon || couponNft != address(0), "couponNft=0");

        // 0) 견적 1회
        uint256 afterPrice = price;
        uint16 appliedBps = 0;
        bool willConsume = false;
        if (useCoupon && couponNft != address(0)) {
            (afterPrice, appliedBps, willConsume) = _validateAndQuote(
                price,
                owner,
                couponNft,
                couponId
            );
        }

        // permit allowance 확인
        require(value >= afterPrice, "permit value < price");

        // 1) permit 실행
        IERC20Permit(address(token)).permit(
            owner,
            address(this),
            value,
            deadline,
            v,
            r,
            s
        );

        // 2) 수금
        uint256 balBefore = token.balanceOf(address(this));
        token.safeTransferFrom(owner, address(this), afterPrice);
        uint256 received = token.balanceOf(address(this)) - balBefore;
        require(received > 0, "transfer failed");

        // 3) 정산
        token.safeTransfer(vaultAddress, received);

        // 4) 캐시백
        uint256 cashback = (received * cashbackBps) / BPS_DENOMINATOR;
        if (cashback > 0) {
            IVault(vaultAddress).provideCashback(owner, cashback);
        }

        // 5) 소모형이면 결제 "성공" 이후에만 소모 처리
        if (useCoupon && couponNft != address(0) && willConsume) {
            used[owner][couponNft][couponId] = true;
        }

        // 6) 이벤트
        bool triedCoupon = useCoupon && couponNft != address(0);
        uint256 discount = price > afterPrice ? (price - afterPrice) : 0;

        if (triedCoupon) {
            emit CouponApplied(
                owner,
                couponNft,
                couponId,
                appliedBps,
                discount,
                willConsume
            );
        }

        emit Paid(
            owner,
            vaultAddress,
            price,
            received,
            appliedBps,
            discount,
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

    /// @notice 프론트 견적용(문자열 사유 포함)
    function quoteDiscounted(
        uint256 price,
        address buyer,
        address nft,
        uint256 id
    )
        external
        view
        returns (
            uint256 discounted,
            uint16 appliedBps,
            bool willConsume,
            string memory reason
        )
    {
        try this._tryValidateAndQuote(price, buyer, nft, id) returns (
            uint256 a,
            uint16 b,
            bool c
        ) {
            return (a, b, c, "");
        } catch (bytes memory data) {
            bytes4 sel;
            assembly {
                sel := mload(add(data, 0x20))
            }
            if (sel == CouponNoop.selector) return (price, 0, false, "noop");
            if (sel == CouponDisabled.selector)
                return (price, 0, false, "disabled");
            if (sel == CouponExpired.selector)
                return (price, 0, false, "expired");
            if (sel == CouponNoBalance.selector)
                return (price, 0, false, "no-balance");
            if (sel == CouponConsumed.selector)
                return (price, 0, false, "consumed");
            return (price, 0, false, "error");
        }
    }

    function isCouponUsed(
        address buyer,
        address nft,
        uint256 id
    ) external view returns (bool) {
        return used[buyer][nft][id];
    }

    // ===== New convenience views (V3-minimal) =====

    /// @notice 여러 규칙을 한 번에 조회(프론트 최적화)
    function getCouponRules(
        address[] calldata nfts,
        uint256[] calldata ids
    ) external view returns (CouponRule[] memory out) {
        require(nfts.length == ids.length, "length mismatch");
        out = new CouponRule[](nfts.length);
        for (uint256 i = 0; i < nfts.length; i++) {
            out[i] = rules[_ruleKey(nfts[i], ids[i])];
        }
    }

    /// @notice 결제 전에 쿠폰 사용 가능 여부만 간단 확인(사유 포함)
    function canUseCoupon(
        address buyer,
        address nft,
        uint256 id
    ) external view returns (bool ok, string memory reason) {
        bytes32 key = _ruleKey(nft, id);
        CouponRule memory r = rules[key];
        if (!r.enabled) return (false, "disabled");
        if (r.expiresAt != 0 && block.timestamp > r.expiresAt)
            return (false, "expired");
        if (IERC1155(nft).balanceOf(buyer, id) == 0)
            return (false, "no-balance");
        if (r.consumable && used[buyer][nft][id]) return (false, "consumed");
        return (true, "");
    }

    /// @notice ruleKey 헬퍼(인덱싱/로그 분석 편의)
    function ruleKey(address nft, uint256 id) external pure returns (bytes32) {
        return _ruleKey(nft, id);
    }

    // ===== Internals =====
    function _ruleKey(address nft, uint256 id) internal pure returns (bytes32) {
        // 이미 운영 중인 키 방식 유지(호환성)
        return keccak256(abi.encodePacked(nft, id));
    }

    // 업그레이드 여유 슬롯 (변경 없음)
    uint256[50] private __gap;
}
