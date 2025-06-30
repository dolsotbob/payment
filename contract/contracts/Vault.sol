// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Vault is Ownable {
    IERC20 public token; // Vault가 보관할 ERC20 토큰
    address public treasury; // 수익을 인출할 기본 주소
    address public paymentContract;

    event CashbackCharged(address indexed from, uint256 amount);
    event CashbackProvided(address indexed to, uint256 amount);
    event TreasuryUpdated(address oldTreasury, address newTreasury);
    event PaymentContractSet(address paymentContract);

    constructor(address _token, address _treasury) Ownable(_msgSender()) {
        require(_token != address(0), "Invalid token");
        require(_treasury != address(0), "Invalid treasury");

        token = IERC20(_token);
        treasury = _treasury;
    }

    modifier onlyPayment() {
        require(msg.sender == paymentContract, "Not authorized");
        _;
    }

    function setPaymentContract(address _payment) external onlyOwner {
        require(_payment != address(0), "Invalid payment contract");
        paymentContract = _payment;
        emit PaymentContractSet(_payment);
    }

    // Vault 컨트랙트에 캐시백 자금을 미리 예치함
    function chargeCashback(uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be > 0");
        bool success = token.transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");
        emit CashbackCharged(msg.sender, amount);
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

        token.transfer(to, amount);
    }

    // 전체 잔액을 treasury로 일괄 송금
    function sweepToTreasury() external onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No balance");

        token.transfer(treasury, balance);
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

    function getCashbackReserve() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function getTokenAddress() external view returns (address) {
        return address(token);
    }

    function getTreasuryAddress() external view returns (address) {
        return treasury;
    }
}
