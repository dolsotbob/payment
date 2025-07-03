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
    token: ethers.Contract,
    owner: string,
    spender: string,
    value: string,
    chainId: number
): Promise<ForwardRequestData> => {
    const nonce = await token.nonces(owner);
    const deadline = Math.floor(Date.now() / 1000) + 300;

    const domain = {
        name: await token.name(),
        version: "1",
        chainId,
        verifyingContract: token.target,
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

    const signature = await (signer as any).signTypedData(domain, types, toSign);

    const data = token.interface.encodeFunctionData('metaApprove', [
        owner,
        spender,
        value,
        deadline,
        signature,
    ]);

    return {
        from: owner,
        to: token.target.toString(),
        value: '0',
        gas: '500000',
        deadline: deadline.toString(),
        data,
        signature,
    };
};

// 메타 PAY용 요청 생성 
export const buildPayRequest = async (
    from: string,
    to: string,
    data: string,
    forwarder: ethers.Contract,
    provider: ethers.Provider,
    signer: ethers.Signer,
    chainId: number
): Promise<ForwardRequestData> => {
    const nonce = await forwarder.nonces(from); // Forwarder에서 현재 사용자 nonce 조회
    const gasLimit = await provider.estimateGas({ from, to, data }); // 대략적인 가스 비용 추정
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5분 유효

    const domain = {
        name: 'MyForwarder',
        version: '1',
        chainId,
        verifyingContract: forwarder.target,
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
        nonce: nonce.toString(),
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
    };
};
