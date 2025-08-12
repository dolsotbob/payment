// contracts/PaymentV2.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Payment.sol";

contract PaymentV2 is Payment {
    // 업그레이드 확인용 간단한 함수
    function version() external pure returns (string memory) {
        return "2";
    }
}
