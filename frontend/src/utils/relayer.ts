// 👉 (이어서 할 일) 
// 1. 프론트앤드에서 metaApprove가 tokenAddress로 보내지는지... tokenAddress에서 허용을 해야 한다. 


// (나중에 할 것) blockchain.ts 가져와 활용 

import { ethers } from 'ethers';
import axios from 'axios';
import type { AxiosError } from 'axios/index';
import { buildMetaApproveRequest, buildPayRequest, SignedForwardRequest } from './request';
import MyForwarderAbi from '../abis/MyForwarder.json';
import PaymentAbi from '../abis/Payment.json';
import TokenAbi from '../abis/TestToken.json';

interface RelayResponse {
    txHash?: string;
}

function isAxiosError(error: any): error is AxiosError {
    return !!(error && error.isAxiosError);
}

// ✅ 메타 APPROVE 실행 
export const sendMetaApproveTx = async (
    request: SignedForwardRequest,
    relayerUrl: string,
    productId: number
): Promise<RelayResponse> => {
    try {
        console.log('📤 metaApprove 요청 발송:', { request, productId });
        const res = await axios.post<RelayResponse>(`${relayerUrl}/relay`, {
            request,
            productId,
        });
        console.log('✅ metaApprove Relayer 응답:', res.data);
        return res.data;
    } catch (error: any) {
        if (isAxiosError(error)) {
            console.error('❌ metaApprove Axios 에러:', error.response?.data || error.message);
        } else {
            console.error('❌ metaApprove 일반 에러:', error.message);
        }
        return { txHash: undefined };
    }
};

// ✅ 메타 PAY 실행 (signature는 따로 전달)
// 반환 타입 명시 
export const sendMetaPayTx = async (
    request: SignedForwardRequest,
    relayerUrl: string,
    productId: number
): Promise<RelayResponse> => {
    try {
        console.log('📤 metaPay 요청 발송:', { request, productId });
        const res = await axios.post<RelayResponse>(`${relayerUrl}/relay`, {
            request,
            productId,
        });
        console.log('✅ metaPay Relayer 응답:', res.data);
        return res.data;
    } catch (error: any) {
        if (isAxiosError(error)) {
            console.error('❌ metaPay Axios 에러:', error.response?.data || error.message);
        } else {
            console.error('❌ metaPay 일반 에러:', error.message);
        }
        // 실패 시 명확히 반환 
        return { txHash: undefined }; // ✅ 명시적으로 RelayResponse 반환
    }
};

// ✅ approve + pay를 함께 실행하는 통합 함수
export const sendMetaTx = async (
    signer: ethers.Signer,
    from: string,
    tokenAddress: string,
    paymentAddress: string,
    amount: string,
    forwarderAddress: string,
    relayerUrl: string,
    provider: ethers.Provider,
    productId: number
): Promise<RelayResponse> => {
    const forwarder = new ethers.Contract(forwarderAddress, MyForwarderAbi.abi, provider);
    const payment = new ethers.Contract(paymentAddress, PaymentAbi.abi, provider);
    const token = new ethers.Contract(tokenAddress, TokenAbi.abi, provider);
    const chainId = (await provider.getNetwork()).chainId;

    console.log('🔗 chainId:', chainId);
    console.log('🪙 tokenAddress:', tokenAddress);
    console.log('💰 paymentAddress:', paymentAddress);
    console.log('🔁 forwarderAddress:', forwarderAddress);
    console.log('📍 relayerUrl:', relayerUrl);

    // Step 1. metaApprove 
    const approveRequest = await buildMetaApproveRequest(
        signer,
        token,
        from,
        // spender는 Payment 컨트랙트(transferFrom을 호출할 컨트랙트)
        // metaApprove 해줘야 Payment에서 transferFrom 호출할 수 있고, token.transferFrom(user, address(this), amount) 를 가능하게 해줌 
        paymentAddress,
        ethers.parseUnits(amount, 18).toString(),
        Number(chainId)
    );

    console.log('🧾 metaApprove 요청 데이터:', approveRequest);
    const approveTx = await sendMetaApproveTx(approveRequest, relayerUrl, productId);
    console.log('✅ metaApprove 결과:', approveTx);

    if (!approveTx.txHash) {
        console.error('❌ metaApprove 실패: 결제 중단');
        return { txHash: undefined };
    }

    // ⏳ 블록 확정 대기
    await new Promise((resolve) => setTimeout(resolve, 4000));

    // Step 2. metaPay 

    // 메타트랜잭션을 위해 pay() 함수 호출 내용을 ABI 인코딩한 것 
    // * payment.interfact는 위에 const payment로 생성된 스마트 컨트랙트 인스턴스의 abi 기반 인터페이스 객체 
    // * encodeFunctionData('pay', [...]): pay 함수의 이름과 그에 전달할 파라미터들을 ABI 인코딩된 calldata로 변환 
    // * ethers.parseUnits(amount, 18): 사용자가 입력한 금액(amount)을 18자리 소수 기준으로 변환하는 역할
    const calldata = payment.interface.encodeFunctionData('pay', [
        ethers.parseUnits(amount, 18)]);

    const payRequest = await buildPayRequest(
        from,
        paymentAddress,
        calldata,
        forwarder,
        provider,
        signer,
        Number(chainId)
    );

    console.log('🧾 metaPay 요청 데이터:', payRequest);
    const payResult = await sendMetaPayTx(payRequest, relayerUrl, productId);
    console.log('✅ metaPay 결과:', payResult);

    return payResult;
} 
