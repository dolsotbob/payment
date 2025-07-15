// !!! backend/relayer-server/contarcts에 쌍둥이 파일 있음

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "./ECDSA.sol";

contract MyForwarder {
    // 1. ForwardRequest 구조체 정의
    struct ForwardRequest {
        address from; // 실제 사용자 주소
        address to; // 실행할 대상 컨트랙트 주소; req.to; Payment 기능 실행 시 req.to는 Payment.sol 주소, Approve 실행 시 req.to는 TestToken.sol 주소
        uint256 value; // 전송할 이더 (보통 0)
        uint256 gas; // 사용할 가스 한도
        uint48 deadline; // tx 만료 시간
        bytes data; // 호출할 함수의 ABI 인코딩된 데이터
        uint256 nonce; // 유저별 중복 방지용 일회성 신호
    }

    // 2. 상태 변수들
    // 사용자 주소별로 nonce 값을 관리. 재사용 방지용.
    mapping(address => uint256) public nonces;

    // EIP-712에서 사용될 구조체 타입의 해시를 고정시켜 둔다
    bytes32 private constant TYPE_HASH =
        // 위 구조체 정의를 그대로 문자열로 넣고 keccak256 해시를 계산한다
        keccak256(
            "ForwardRequest(address from,address to,uint256 value,uint256 gas,uint48 deadline,bytes data,uint256 nonce)"
        );

    // 도메인 구분자. EIP-712 서명 범위를 구분해 replay attack을 방지하는 중요한 값
    bytes32 private immutable DOMAIN_SEPARATOR;

    // 3. 생성자: 도메인 구분자 계산
    constructor() {
        // EIP-712 DomainSeparator를 계산한다
        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ), // EIP-712에서 요구하는 Domain 구조의 타입 해시
                keccak256(bytes("MyForwarder")), // 도메인 이름: 이 컨트랙트의 이름
                keccak256(bytes("1")), // 도메인 버전: 추후 업그레이드 시 구분할 수 있도록 설정
                block.chainid, // 현재 체인 ID (KAIA Testnet에서는 1001)
                address(this) // 서명을 검증할 컨트랙트 주소
            )
        );
    }

    // 4. verify 함수: 서명 검증
    // EIP-712 스타일로 요청을 검증
    //  req와 signature를 받아 유효한 요청인지 확인
    function verify(
        ForwardRequest calldata req,
        bytes calldata signature
    ) public view returns (bool) {
        bytes32 hashStruct = keccak256(
            abi.encode(
                TYPE_HASH,
                req.from,
                req.to,
                req.value,
                req.gas,
                req.deadline,
                keccak256(req.data),
                req.nonce
            )
        );

        // ForwardRequest 구조체를 EIP-712 형식에 맞춰 해시한다
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, hashStruct)
        );
        // 최종적으로 서명된 해시(digest) 계산 (EIP-712 표준)
        address signer = recoverSigner(digest, signature);
        // 복원된 서명자가 요청자와 같고, nonce도 일치하고, 아직 만료되지 않았다면 true 반환
        return (signer == req.from &&
            nonces[req.from] == req.nonce &&
            block.timestamp <= req.deadline);
    }

    // 5. execute 함수: 실제 트랜잭션 실행
    /// 실제로 메타트랜잭션을 실행하는 함수. 외부에서 호출됨. Forwarder가 msg.sender로 호출.
    // 이 execute 함수는 Relayer가 사용자를 대신해 사용자의 서명된 요청을 검증하고, 지정된 컨트랙트를 대신 호출하는 역할을 한다.
    function execute(
        ForwardRequest calldata req,
        bytes calldata signature
    ) external payable returns (bytes memory) {
        // 먼저 요청이 유효한지 검증
        require(verify(req, signature), "Invalid signature or nonce");

        // 요청 처리 후 nonce 증가 (재사용 방지)
        nonces[req.from] += 1;

        // 요청 대상 컨트랙트에 직접 함수 호출
        // ABI 인코딩된 함수 호출 req.data 뒤에 req.from을 붙임으로써 msg.sender를 복원할 수 있게 함
        // req.to 주소(Payment 컨트랙트)에 대해 low-level call을 수행
        (bool success, bytes memory returndata) = req.to.call{
            gas: req.gas, // 사용자가 요청한 만큼의 gas를 호출에 사용
            value: req.value
        }( // 함께 전송할 ETH 의 양 (보통은 0)
            // 호출할 함수 데이터(data)에 사용자의 주소(from)를 붙여 msg.sender처럼 사용 가능하도록 함
            abi.encodePacked(req.data, req.from) // 👈 _msgSender 추적을 위한 from을 함께 전달
        );

        require(success, "Target call failed");
        return returndata;
    }

    // 6. recoverSigner 함수: 서명 복구
    /// Signature 복구
    // OpenZeppelin 스타일의 ECDSA.recover() 함수를 사용하여 서명에서 주소를 복원한다
    function recoverSigner(
        bytes32 digest,
        bytes calldata signature
    ) internal pure returns (address) {
        return ECDSA.recover(digest, signature);
    }
}
