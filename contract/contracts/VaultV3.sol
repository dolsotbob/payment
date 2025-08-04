// UUPS + TimeLock 연동 가능한 구조
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Vault.sol";

contract VaultV3 is Vault {
    // 새롭게 추가된 상태 변수 (Vault에는 없었음)
    string public note;

    // 새롭게 추가된 Event (Vault에는 없었음)
    event WithdrawRequested(address to, uint256 amount); // Timelock 로그용
    event SweepToTreasuryRequested(address to, uint256 amount);

    // withdraw 함수에 Timelock 연동용 로그 추가
    // 지정된 주소로 수동 인출
    function withdraw(address to, uint256 amount) external override onlyOwner {
        require(to != address(0), "Invalid recipient");
        require(
            token.balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );

        emit WithdrawRequested(to, amount); // timelock과 연동 시 기록 확인용
        bool success = token.transfer(to, amount);
        require(success, "Withdraw failed");
    }

    // 전체 잔액을 treasury로 일괄 송금
    function sweepToTreasury() external virtual override onlyOwner {
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No balance");

        emit SweepToTreasuryRequested(treasury, balance);
        bool success = token.transfer(treasury, balance);
        require(success, "sweepToTreasury failed");
    }

    // treasury 주소 변경
    function setTreasury(address _treasury) external override onlyOwner {
        require(_treasury != address(0), "Invalid treasury");
        address oldTreasury = treasury;
        treasury = _treasury;
        emit TreasuryUpdated(oldTreasury, _treasury);
    }

    // 업그레이드된 컨트랙트 전용 초기화 함수
    /// @custom:oz-upgrades-validate-as-initializer
    function initializeV3() public reinitializer(3) {
        // 이 값은 업그레이드 이후에만 설정된
        note = "Vault Upgraded";
    }

    // V3 버전 확인용 함수 (테스트/식별 용도)
    function version() public pure returns (string memory) {
        return "Vault V3";
    }
}
