// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PaymentWithCashback is Ownable {
    IERC20 public token; // token은 결제에 사용할 ERC20 토큰; 자동 getter 함수 생성
    address public storeWallet;
    uint256 public cashbackRate = 2; // 캐시백 비율 (예: 2%)

    // 결제가 성공했을 때 호출되는 이벤트
    event Paid(
        address indexed buyer,
        uint256 amount,
        address indexed storeWallet
    );
    event CashbackSent(
        address indexed buyer,
        uint256 cashbackAmount,
        address indexed storeWallet
    );
    event CashbackRateUpdated(uint256 oldRate, uint256 newRate);

    // 배포 시 토큰 주소와 스토어 지갑 주소를 전달 받고, Ownable의 생성자도 함께 호출
    constructor(address _token, address _storeWallet) Ownable(_msgSender()) {
        require(_token != address(0), "Invalid token address");
        require(_storeWallet != address(0), "Invalid store wallet");

        token = IERC20(_token);
        storeWallet = _storeWallet;
    }

    // 사용자가 토큰 지불하는 함수
    // external: 외부에서 호출 가능
    function pay(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");

        bool paymentSuccess = token.transferFrom(
            msg.sender,
            storeWallet,
            amount
        );
        require(paymentSuccess, "Payment failed: transferFrom failed");

        emit Paid(msg.sender, amount, storeWallet);
    }

    // 캐시백 함수
    function sendCashback(address buyer, uint256 amount) external onlyOwner {
        require(amount > 0, "Amount must be greater than 0");

        // 캐시백 계산 및 전송
        uint256 cashbackAmount = (amount * cashbackRate) / 100;
        require(cashbackAmount > 0, "Cashback too small");
        bool cashbackSuccess = token.transferFrom(
            storeWallet,
            buyer,
            cashbackAmount
        );
        require(cashbackSuccess, "Cashback failed");

        emit CashbackSent(buyer, cashbackAmount, storeWallet);
    }

    // 관리자가 캐시백 비율 조정 가능
    function setCashbackRate(uint256 _rate) external onlyOwner {
        require(_rate <= 100, "Rate must be <= 100");

        uint256 oldRate = cashbackRate;
        cashbackRate = _rate;

        emit CashbackRateUpdated(oldRate, _rate);
    }

    // 필요 시 스토어 지갑 변경
    function setStoreWallet(address _storeWallet) external onlyOwner {
        require(_storeWallet != address(0), "Invalid store wallet address");
        storeWallet = _storeWallet;
    }

    function getTokenAddress() external view returns (address) {
        return address(token);
    }

    function getStoreWallet() external view returns (address) {
        return storeWallet;
    }
}
