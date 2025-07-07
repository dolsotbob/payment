// ForwardRequestData 생성 

import { ethers } from 'ethers';

// ForwardRequestData 타입 정의
export interface ForwardRequestData {
    from: string;
    to: string;
    value: string;
    gas: string;
    deadline: string;
    data: string;
    signature: string;
}

// 메타 APPROVE용 요청 생성
export const buildMetaApproveRequest = async (
    signer: ethers.Signer,
    token: ethers.Contract,  // TestToken.sol 인스턴스 
    owner: string,
    spender: string,  // Payment.sol 주소 (토큰을 사용할 컨트랙트)
    value: string,
    chainId: number
): Promise<ForwardRequestData> => {
    const nonce = await token.nonces(owner);
    const deadline = Math.floor(Date.now() / 1000) + 300;

    const domain = {
        name: await token.name(),
        version: "1",
        chainId,
        verifyingContract: token.target,  // TestToken.sol의 주소 
    };

    const types = {
        MetaApprove: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
        ],
    };

    const toSign = {
        owner,
        spender,
        value,
        nonce: nonce.toString(),
        deadline,
    };

    // signature: 사용자가 metaApprove에 대해 서명한 EIP-712 서명 
    const signature = await (signer as any).signTypedData(domain, types, toSign);

    // ABI 인코딩된 metaApprove(...) 호출 정보 
    const data = token.interface.encodeFunctionData('metaApprove', [
        owner,
        spender,
        value,
        deadline,
        signature,
    ]);

    return {
        from: owner,
        to: token.target.toString(),  // TestToken.sol 주소. relayer가 tx을 이 컨트랙트로 보냄 
        value: '0',
        gas: '500000',
        deadline: deadline.toString(),
        data,
        signature,
    };
};

// 📌 위 메타 Approve의 핵심 포인트 3가지
// 	1.	spender는 Payment.sol 주소 → transferFrom할 권한을 부여할 컨트랙트
// 	2.	to는 TestToken.sol 주소 → metaApprove를 실행할 컨트랙트
// 	3.	Relayer는 token.target에 대해 metaApprove(...) 호출하게 됨


// 메타 PAY용 요청 생성 
export const buildPayRequest = async (
    from: string,  // 사용자 주소 (signer.address)
    to: string,  // Payment.sol 주소 – 즉, 실제로 실행될 스마트 컨트랙트
    data: string,  // Payment.pay()에 전달할 calldata
    forwarder: ethers.Contract,
    provider: ethers.Provider,
    signer: ethers.Signer,
    chainId: number
): Promise<ForwardRequestData> => {
    const nonce = await forwarder.nonces(from); // Forwarder에서 현재 사용자 nonce 조회
    const gasLimit = await provider.estimateGas({ from, to, data }); // 대략적인 가스 비용 추정
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5분 유효

    // domain.verifyingContract: MyForwarder의 주소 (Forwarder에서 검증)
    const domain = {
        name: 'MyForwarder',
        version: '1',
        chainId,
        verifyingContract: forwarder.address,
    };

    const types = {
        ForwardRequestData: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'gas', type: 'uint256' },
            { name: 'deadline', type: 'uint48' },
            { name: 'data', type: 'bytes' },
        ],
    };

    const toSign = {
        from,
        to,
        value: '0',
        gas: gasLimit.toString(),
        deadline: deadline.toString(),
        data,
        nonce: nonce.toString(),  // 서명에만 포함 
    }

    // signature는 단지 서명 값임. 
    // // 이 서명은 ForwardRequestData 구조체 전체(from, to, value, gas, deadline, data, nonce)를 해시해서, 그 위에 서명한 결과물임 
    const signature = await (signer as any).signTypedData(domain, types, toSign);

    return {
        from,
        to,
        value: '0',
        gas: gasLimit.toString(),
        deadline: deadline.toString(),
        data,
        signature,
        // ❌ nonce는 포함 안 함 (Forwarder가 자체 관리)
    };
};

// 🧠 위 메타 Pay 핵심 개념 다시 정리
// 	•	이 요청은 **Forwarder.execute(request, signature)**로 실행됩니다.
// 	•	request.to = Payment.sol, request.data = pay(...)
// 	•	Forwarder는 from의 서명을 검증한 뒤 Payment.sol.call(data)를 수행합니다.
// 	•	그 안에서 msg.sender는 Forwarder지만, _msgSender()는 실제 사용자를 복원합니다.