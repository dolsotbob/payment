// ForwardRequestData 생성 

import { ethers } from 'ethers';

// 실제 Solidity 구조체에 해당 (MyForwarder.sol의 request와 동일)
export interface ForwardRequestData {
    from: string;
    to: string;
    value: string;
    gas: string;
    deadline: string;
    data: string;
    nonce: string;
}

// 프론트에서 relayer로 보내기 위한 전체 요청
export interface SignedForwardRequest extends ForwardRequestData {
    signature: string;
}

// 메타 APPROVE용 요청 생성 - token.metaApprove
export const buildMetaApproveRequest = async (
    signer: ethers.Signer,
    token: ethers.Contract,  // token이란 이름의 TestToken.sol 인스턴스를 PayGaslessButton.tsx에서 전달받음  
    owner: string,     // signer.address
    spender: string,   // Payment.sol 주소 (토큰을 사용할 컨트랙트)
    value: string,     // 허용할 토큰 양 
    chainId: number
): Promise<SignedForwardRequest> => {
    const nonce = await token.nonces(owner); // Forwarder를 거치지 않기때문에 nonce도 token.nonces(owner)에서 가져옴 
    const deadline = Math.floor(Date.now() / 1000) + 300;

    const domain = {
        name: await token.name(),
        version: "1",
        chainId,
        verifyingContract: await token.getAddress(),  // TestToken.sol의 주소 
    };
    console.log('🔎 Frontend domain:', domain);

    // EIP-712 타입 정의
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
        nonce,
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
        nonce: nonce.toString(),
        signature
    };
};

// 📌 위 메타 Approve의 핵심 포인트 3가지
// 	1.	spender는 Payment.sol 주소 → transferFrom할 권한을 부여할 컨트랙트
// 	2.	to는 TestToken.sol 주소 → metaApprove를 실행할 컨트랙트
// 	3.	Relayer는 token.target에 대해 metaApprove(...) 호출하게 됨


// 메타 PAY용 요청 생성 (Forwarder.execute -> Payment.sol)
export const buildPayRequest = async (
    from: string,  // 사용자 주소 (signer.address)
    to: string,  // Payment.sol 주소 – 즉, 실제로 실행될 스마트 컨트랙트
    data: string,  // Payment.pay()에 전달할 calldata
    forwarder: ethers.Contract,
    provider: ethers.Provider,
    signer: ethers.Signer,
    chainId: number
): Promise<SignedForwardRequest> => {
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
    console.log('🔎 Frontend domain:', domain);

    // EIP-712 타입 정의
    const types = {
        ForwardRequestData: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'gas', type: 'uint256' },
            { name: 'deadline', type: 'uint48' },
            { name: 'data', type: 'bytes' },
            { name: 'nonce', type: 'uint256' },
        ],
    };

    const toSign = {
        from,
        to,
        value: BigInt(0),
        gas: gasLimit,
        deadline,
        data,
        nonce,
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
        nonce: nonce.toString(),
        signature,
    };
};

