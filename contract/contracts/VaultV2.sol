// contracts/VaultV2.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./Vault.sol";

contract VaultV2 is Vault {
    // 새롭게 추가된 상태 변수 (Vault에는 없었음)
    string public note;

    // 업그레이드된 컨트랙트 전용 초기화 함수
    function initializeV2() public reinitializer(2) {
        // 이 값은 업그레이드 이후에만 설정된
        note = "Vault Upgraded";
    }

    // V2 버전 확인용 함수 (테스트/식별 용도)
    function version() public pure returns (string memory) {
        return "Vault V2";
    }
}

/*
✅ reinitializer(n) 사용 - 버전별로 초기화 함수가 정확히 한 번만 실행되도록 함
 */
