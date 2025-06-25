// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PaymentGateway is Ownable {
    IERC20 public token; // token은 결제에 사용할 ERC20 토큰; 자동 getter 함수 생성
    address public storeWallet;

    // 결제가 성공했을 때 호출되는 이벤트; 누가 얼마나 결제했는지 기록함
    event Paid(
        address indexed buyer,
        uint256 amount,
        address indexed storeWallet
    );

    // 배포 시 토큰 주소와 스토어 지갑 주소를 전달 받고, Ownable의 생성자도 함께 호출
    constructor(address _token, address _storeWallet) Ownable(_msgSender()) {
        require(_token != address(0), "Invalid token address");
        require(_storeWallet != address(0), "Invalid store wallet");

        token = IERC20(_token); // _token 주소 기반으로 token 변수 초기화; 이제 이 주소의 ERC20 토큰과 상호작용 할 수 있음
        storeWallet = _storeWallet;
    }

    // 사용자가 토큰 지불하는 함수
    // external: 외부에서 호출 가능
    function pay(uint256 amount) external {
        require(amount > 0, "Amount must be greater than 0");

        bool success = token.transferFrom(msg.sender, storeWallet, amount);
        require(success, "Payment failed: transferFrom failed");

        emit Paid(msg.sender, amount, storeWallet);
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
