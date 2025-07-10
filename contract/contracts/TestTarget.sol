// MyForwarder.sol 테스트 하기 위해 만든 컨트랙트
// Forwarder가 실제로 호출하는 대상이 있어야 메타트랜잭션 실행이 제대로 되는지 검증할 수 있다

// “사용자가 서명한 요청을 Relayer가 대신 실행 → 이 요청은 실제로 어떤 다른 컨트랙트의 함수를 실행해야 의미가 있음”
// 그 “실제로 호출되는 컨트랙트”가 바로 TestTarget.sol입니다.

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract TestTarget {
    uint256 public value;

    function storeValue(uint256 _value) public {
        value = _value;
    }
}
