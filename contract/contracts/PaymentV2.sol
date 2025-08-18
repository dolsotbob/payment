// contracts/PaymentV2.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Payment.sol";

contract PaymentV2 is Payment {
    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // 빈 initializer 추가 (상속된 초기화 함수 호출 안 함)
    function initializeV2() public reinitializer(2) {
        // V2용 초기화 로직이 없으면 그냥 비워두면 됨
    }

    // 업그레이드 확인용 간단한 함수
    function version() external pure returns (string memory) {
        return "2";
    }
}
