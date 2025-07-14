// 서명 검증용 Solidity internal 라이브러리로 배포하지 않는다
//  MyForwarder.sol에서 import "./ECDSA.sol"로 포함되면, 컴파일 시 ECDSA 코드는 MyForwarder에 포함되어 배포된다
// backend/relayer-server/contracts에 쌍둥이 파일 있음

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// ECDSA 라이브러리 내장 (OpenZeppelin 코드 참고 가능)
library ECDSA {
    // 서명 값에서 주소를 추출
    function recover(
        bytes32 hash,
        bytes memory signature
    ) internal pure returns (address) {
        // 서명은 65바이트 (r, s, v 조합)여야 함
        require(signature.length == 65, 'ECDSA: invalid signature length');

        // 서명 분해를 위한 변수 선언
        bytes32 r;
        bytes32 s;
        uint8 v;

        // 서명 데이터를 r, s, v로 분해 (저수준 명령) )
        assembly {
            r := mload(add(signature, 0x20))
            s := mload(add(signature, 0x40))
            v := byte(0, mload(add(signature, 0x60)))
        }

        // s가 정상이 아니면 공격 가능성이 있으므로 체크
        // ECDSA 서명은 (r, s) 쌍으로 구성됨. 아래 코드는 ECDSA 서명의 s 값이 "하위 절반" 값인지 확인
        // 0x7f…fff는 타원곡선의 정수 범위 n의 절반 (n/2)이다
        // s > n/2인 서명은 거부하고, 항상 s <= n/2인 서명만 허용하면, 하나의 메시지에 대해 유일한 서명만 유효하다고 판단할 수 있다
        require(
            uint256(s) <=
                0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff,
            'ECDSA: invalid s'
        );
        // v는 서명 검증을 위한 파라미터, 보통 "recovery id" 라고도 불림
        // v는 꼭 27 또는 28이어야 함
        require(v == 27 || v == 28, 'ECDSA: invalid v');

        // 최종적으로 서명에서 주소를 복원
        return ecrecover(hash, v, r, s);
    }
}
