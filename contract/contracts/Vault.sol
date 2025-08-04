// UUPS + TimeLock 연동 가능한 구조
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/interfaces/IERC20.sol";

contract Vault is Initializable, OwnableUpgradeable, UUPSUpgradeable {
    // ===== Storage layout V1 =========
    IERC20 public token; // Vault가 보관할 ERC20 토큰 컨트랙트 주소 저장
    address public treasury; // Vault의 잔액을 보낼(수익을 인출할) 기본 지갑 주소
    address public paymentContract; // 캐시백 요청 권한이 있는 컨트랙트 주소 저장

    // ===== Events ======
    event CashbackCharged(
        address indexed from,
        uint256 amount,
        uint256 newBalance
    );
    event DebugChargeCashback(
        address indexed sender,
        uint256 balance,
        uint256 allowance,
        uint256 requested
    );

    event CashbackProvided(address indexed to, uint256 amount);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event PaymentContractSet(address paymentContract);

    // 생성자 정의 모두 삭제

    // ======= Modifiers ========
    // 커스텀 modifier: provideCashback() 같은 민감한 함수는 paymentContract에서만 호출 가능하도록 제한
    modifier onlyPayment() {
        require(msg.sender == paymentContract, "Not authorized");
        _;
    }

    // ========== Initializer ===========
    // upgradeable로 전환하면서 constructor 지우고 아래 함수 추가
    /// @notice 초기화 함수 (생성자 대체)
    // 추후 버전 2를 도입하고 된다면, 버전 번호를 넣는 것이 유지 보수에 좋음
    /// @custom:oz-upgrades-validate-as-initializer
    function initialize(
        address _token,
        address _treasury
    ) public reinitializer(1) {
        require(_token != address(0), "Invalid token");
        require(_treasury != address(0), "Invalid treasury");

        __Ownable_init(msg.sender);
        __UUPSUpgradeable_init();

        token = IERC20(_token);
        treasury = _treasury;
    }

    // ========== UUPS 권한 함수 ==========
    // UUPSUpgradeable 컨트랙트는 upgradeTo() 같은 업그레이드 함수 호출 시 아래 함수 호출한다
    function _authorizeUpgrade(
        address newImplementation
    ) internal override onlyOwner {}

    // ====== 관리 함수 =========
    // Vault 컨트랙트에 Payment 컨트랙트 주소를 등록하여 권한을 설정하는 함수
    function setPaymentContract(address _paymentContract) external onlyOwner {
        require(_paymentContract != address(0), "Invalid payment contract");
        // 입력된 _payment 주소를 Vault에 저장하고,
        // 이 저장된 주소만 provideCashback() 같은 주요 함수의 msg.sender로 인정됨
        paymentContract = _paymentContract;
        emit PaymentContractSet(_paymentContract);
    }

    // Vault 컨트랙트에 캐시백 자금을 미리 예치함
    // owner 지갑에서 Vault로 토큰 전송
    function chargeCashback(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");

        uint256 balance = token.balanceOf(msg.sender);
        uint256 allowance = token.allowance(msg.sender, address(this));

        emit DebugChargeCashback(msg.sender, balance, allowance, amount);

        require(balance >= amount, "Insufficient balance");
        require(allowance >= amount, "Insufficient allowance");

        // 여기서 msg.sender는 Vault.chargeCashback()을 호출한 지갑주소인 Store Wallet 주소임
        // 즉, cashback.service.ts의 checkAndCharge 함수에서 chargeTx 코드로 Vault컨트랙트의 chargeCashback 함수가 호출되는데,
        // 이 chargeTx 코드는 아래 지갑으로 실행된다
        // private readonly wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");

        emit CashbackCharged(
            msg.sender,
            amount,
            token.balanceOf(address(this))
        );
    }

    // onlyPayment: msg.sender가 등록된 paymentContract일 때만 실행됨
    // → 보안용 제어장치로, 아무나 캐시백 요청을 못 하게 막음
    function provideCashback(address to, uint256 amount) external onlyPayment {
        require(to != address(0), "Invalid address"); // 잘못된 0 주소로 전송되는 사고 방지
        require(amount > 0, "Amount must be > 0"); // 0 토큰 이상일 때만 실행 -> 의미 없는 전송 방지
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient cashback reserve"
        );

        bool success = token.transfer(to, amount);
        require(success, "Cashback transfer failed");

        emit CashbackProvided(to, amount);
    }

    // 지정된 주소로 수동 인출
    function withdraw(address to, uint256 amount) external virtual onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );

        bool success = token.transfer(to, amount);
        require(success, "Withdraw failed");
    }

    // 전체 잔액을 treasury로 일괄 송금
    function sweepToTreasury() external virtual onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No balance");

        bool success = token.transfer(treasury, balance);
        require(success, "sweepToTreasury failed");
    }

    // treasury 주소 변경
    function setTreasury(address _treasury) external virtual onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    // 조회 함수들
    function getVaultBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function getCashbackReserve() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function getTokenAddress() external view returns (address) {
        return address(token);
    }

    function getTreasuryAddress() external view returns (address) {
        return treasury;
    }

    function getPaymentContract() external view returns (address) {
        return paymentContract;
    }

    // ========== future-safe: 업그레이드용 reserved storage ==========
    // 업그레이드 시 안전한 변수 추가 위해 추가됨
    // 50개의 빈 슬롯을 예약해 두어 나중에 변수 추가를 이 슬롯에 덧붙일 수 있게 한다
    // ⚠️ 업그레이드할 때마다 몇 개의 gap을 소모했는지 정확히 기록해 관래해야 한다
    uint256[50] private __gap;
}
