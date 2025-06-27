// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Vault is Ownable {
    IERC20 public token; // Vault가 보관할 ERC20 토큰
    address public treasury; // 수익을 인출할 기본 주소

    constructor(address _token, address _treasury) Ownable(_msgSender()) {
        require(_token != address(0), "Invalid token");
        require(_treasury != address(0), "Invalid treasury");

        token = IERC20(_token);
        treasury = _treasury;
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
        treasury = _treasury;
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
}
