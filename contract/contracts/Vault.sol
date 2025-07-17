// 수익금 저장 및 관리자만 출금 가능

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Vault is Ownable {
    IERC20 public token; // Vault가 보관할 ERC20 토큰 컨트랙트 주소 저장
    address public treasury; // Vault의 잔액을 보낼(수익을 인출할) 기본 지갑 주소
    address public paymentContract; // 캐시백 요청 권한이 있는 컨트랙트 주소 저장

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

    // 생성자 정의: token과 treasury 초기화
    // Ownable(_msgSender()): 배포한 계정을 owner로 설정
    constructor(address _token, address _treasury) Ownable(msg.sender) {
        require(_token != address(0), "Invalid token");
        require(_treasury != address(0), "Invalid treasury");

        token = IERC20(_token);
        treasury = _treasury;
    }

    // 커스텀 modifier: provideCashback() 같은 민감한 함수는 paymentContract에서만 호출 가능하도록 제한
    modifier onlyPayment() {
        require(msg.sender == paymentContract, "Not authorized");
        _;
    }

    // Vault 컨트랙트에 Payment 컨트랙트 주소를 등록하여 권한을 설정하는 함수
    function setPaymentContract(address _payment) external onlyOwner {
        require(_payment != address(0), "Invalid payment contract");
        // 입력된 _payment 주소를 Vault에 저장하고,
        // 이 저장된 주소만 provideCashback() 같은 주요 함수의 msg.sender로 인정됨
        paymentContract = _payment;
        emit PaymentContractSet(_payment);
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
    function withdraw(address to, uint256 amount) external onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );

        bool success = token.transfer(to, amount);
        require(success, "Withdraw failed");
    }

    // 전체 잔액을 treasury로 일괄 송금
    function sweepToTreasury() external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No balance");

        bool success = token.transfer(treasury, balance);
        require(success, "sweepToTreasury failed");
    }

    // treasury 주소 변경
    function setTreasury(address _treasury) external onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    // 조회 함수들
    function getVaultBalance() external view returns (uint256) {
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
}
