// (나중에 할 것) blockchain.ts 가져와 활용 

import { ethers } from 'ethers';
import axios from 'axios';
import type { AxiosError } from 'axios/index';
import { buildMetaApproveRequest, buildPayRequest, ForwardRequestData } from './request';
import MyForwarderAbi from '../abis/MyForwarder.json';
import PaymentAbi from '../abis/Payment.json';

function isAxiosError(error: any): error is AxiosError {
    return !!(error && error.isAxiosError);
}

// ✅ 메타 APPROVE 실행 (signature는 data에 포함되어 있기 때문에 별도 전달 X)
export const sendMetaApproveTx = async (
    request: ForwardRequestData,
    relayerUrl: string
) => {
    try {
        const res = await axios.post(`${relayerUrl}/relay`, {
            request,
            signature: null,
        });
        return res.data;
    } catch (error: any) {
        if (isAxiosError(error)) {
            console.error('❌ Axios 에러:', error.response?.data || error.message);
        } else {
            console.error('❌ 일반 에러:', error.message);
        }

        // 실패 시 명확히 반환 (빈 객체라도)
        return {};
    }
};

// ✅ 메타 PAY 실행 (signature는 따로 전달)
// 반환 타입 명시 
interface RelayResponse {
    txHash?: string;
    transactionHash?: string;
}

export const sendMetaPayTx = async (
    request: ForwardRequestData,
    relayerUrl: string
): Promise<RelayResponse> => {
    try {
        const res = await axios.post<RelayResponse>(`${relayerUrl}/relay`, {
            request,
            signature: request.signature,
        });
        return res.data;
    } catch (error: any) {
        if (isAxiosError(error)) {
            console.error('❌ Axios 에러:', error.response?.data || error.message);
        } else {
            console.error('❌ 일반 에러:', error.message);
        }

        // 실패 시 명확히 반환 (빈 객체라도)
        return { txHash: undefined, transactionHash: undefined }; // ✅ 명시적으로 RelayResponse 반환
    }
};

// ✅ 두 요청을 모두 보내는 통합 함수 (선택적으로 사용 가능)
export const sendMetaTx = async (
    signer: ethers.Signer,
    from: string,
    to: string,
    amount: string,
    forwarderAddress: string,
    relayerUrl: string,
    provider: ethers.Provider
): Promise<RelayResponse> => {
    const forwarder = new ethers.Contract(forwarderAddress, MyForwarderAbi.abi, provider);
    const payment = new ethers.Contract(to, PaymentAbi.abi, provider);
    const chainId = (await provider.getNetwork()).chainId;

    // 메타트랜잭션을 위해 pay() 함수 호출 내용을 ABI 인코딩한 것 
    // * payment.interfact는 위에 const payment로 생성된 스마트 컨트랙트 인스턴스의 abi 기반 인터페이스 객체 
    // * encodeFunctionData('pay', [...]): pay 함수의 이름과 그에 전달할 파라미터들을 ABI 인코딩된 calldata로 변환 
    // * ethers.parseUnits(amount, 18): 사용자가 입력한 금액(amount)을 18자리 소수 기준으로 변환하는 역할
    const calldata = payment.interface.encodeFunctionData('pay', [
        ethers.parseUnits(amount, 18)]);

    const request = await buildPayRequest(
        from,
        to,
        calldata,
        forwarder,
        provider,
        signer,
        Number(chainId)
    );

    try {
        const res = await axios.post<RelayResponse>(`${relayerUrl}/relay`, {
            request,
            signature: request.signature,
        });

        console.log('✅ Relayer 응답:', res.data);
        return res.data;
    } catch (error: any) {
        if (isAxiosError(error)) {
            console.error('❌ Axios 에러:', error.response?.data || error.message);
        } else {
            console.error('❌ 일반 에러:', error.message);
        }

        // 실패 시 명확히 반환 (빈 객체라도)
        return { txHash: undefined, transactionHash: undefined }; // ✅ 명시적으로 RelayResponse 반환
    }
};
