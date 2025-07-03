// (나중에 할 것) blockchain.ts 가져와 활용 

import { ethers } from 'ethers';
import { buildRequest, ForwardRequestData } from './request';
import MyForwarderAbi from '../abis/MyForwarder.json';
import PaymentAbi from '../abis/Payment.json';

// 메타트랜잭션 서명 및 relayer 전달 (signMetaTx 기능 포함)
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

    // 메타트랜잭션을 위해 pay() 함수 호출 내용을 ABI 인코딩한 것 
    // * payment.interfact는 위에 const payment로 생성된 스마트 컨트랙트 인스턴스의 abi 기반 인터페이스 객체 
    // * encodeFunctionData('pay', [...]): pay 함수의 이름과 그에 전달할 파라미터들을 ABI 인코딩된 calldata로 변환 
    // * ethers.parseUnits(amount, 18): 사용자가 입력한 금액(amount)을 18자리 소수 기준으로 변환하는 역할
    const calldata = payment.interface.encodeFunctionData('pay', [ethers.parseUnits(amount, 18)]);

    const request = await buildRequest(
        from,
        to,
        calldata,
        forwarder,
        provider,
        signer,
        Number(chainId)
    );

    const res = await fetch(`${relayerUrl}/relay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ request }),
    });

    if (!res.ok) {
        throw new Error(`❌ Relayer 서버 응답 실패: ${res.status}`);
    }

    const result = await res.json();
    console.log('✅ Relayer 응답:', result);
    return result;
};