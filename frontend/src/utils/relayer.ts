// (나중에 할 것) blockchain.ts 가져와 활용 

import { ethers } from 'ethers';
import { buildRequest, ForwardRequest } from './request';
import MyForwarderAbi from '../abis/MyForwarder.json';
import PaymentAbi from '../abis/Payment.json';

interface TypedData {
    domain: any;
    types: any;
    message: ForwardRequest;
}

export const buildTypedData = (
    chainId: number,
    forwarderAddress: string,
    request: ForwardRequest
): TypedData => {
    return {
        domain: {
            name: 'MyForwarder',
            version: '1',
            chainId,
            verifyingContract: forwarderAddress,
        },
        types: {
            ForwardRequest: [
                { name: 'from', type: 'address' },
                { name: 'to', type: 'address' },
                { name: 'value', type: 'uint256' },
                { name: 'gas', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'deadline', type: 'uint48' },
                { name: 'data', type: 'bytes' },
            ],
        },
        message: request,
    };
};

/**
 * 메타트랜잭션 서명 및 relayer 전달 (signMetaTx 기능 포함)
 */
export const sendMetaTx = async (
    signer: ethers.Signer,
    from: string,
    to: string,
    amount: string,
    forwarderAddress: string,
    relayerUrl: string,
    provider: ethers.Provider
) => {
    const forwarder = new ethers.Contract(forwarderAddress, MyForwarderAbi.abi, provider);
    const payment = new ethers.Contract(to, PaymentAbi.abi, provider);

    const chainId = (await provider.getNetwork()).chainId;
    const nonce = await forwarder.nonces(from);
    const deadline = Math.floor(Date.now() / 1000) + 3600; // 1시간 유효

    const calldata = payment.interface.encodeFunctionData('pay', [ethers.parseUnits(amount, 18)]);

    const request: ForwardRequest = {
        from,
        to,
        value: '0',
        gas: '500000',
        nonce: nonce.toString(),
        deadline: deadline.toString(),
        data: calldata,
    };

    const typedData = buildTypedData(Number(chainId), forwarderAddress, request);

    const signature = await (signer as ethers.Signer & { signTypedData: any }).signTypedData(
        typedData.domain,
        typedData.types,
        typedData.message
    );

    const body = JSON.stringify({ request, signature });

    const res = await fetch(`${relayerUrl}/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
    });

    if (!res.ok) {
        throw new Error(`❌ Relayer 서버 응답 실패: ${res.status}`);
    }

    const result = await res.json();
    console.log('✅ Relayer 응답:', result);
    return result;
};