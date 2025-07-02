// ForwardRequest 생성 

import { ethers } from 'ethers';

// ForwardRequest 타입 정의
export interface ForwardRequest {
    from: string;
    to: string;
    value: string;
    gas: string;
    nonce: string;
    deadline: string;
    data: string;
}

/**
 * ForwardRequest 객체 생성 함수
 * @param from 메타트랜잭션 요청자 주소 (실제 사용자)
 * @param to 실제 호출 대상 컨트랙트 주소 (예: Payment 컨트랙트)
 * @param data 실행할 함수의 ABI 인코딩된 데이터
 * @param forwarder Forwarder 컨트랙트 인스턴스
 * @param provider ethers.js Provider 인스턴스
 */
export const buildRequest = async (
    from: string,
    to: string,
    data: string,
    forwarder: ethers.Contract,
    provider: ethers.Provider
): Promise<ForwardRequest> => {
    const nonce = await forwarder.getNonce(from); // Forwarder에서 현재 사용자 nonce 조회
    const gasLimit = await provider.estimateGas({ from, to, data }); // 대략적인 가스 비용 추정
    const deadline = Math.floor(Date.now() / 1000) + 300; // 5분 유효

    return {
        from,
        to,
        value: '0',
        gas: gasLimit.toString(),
        nonce: nonce.toString(),
        deadline: deadline.toString(),
        data,
    };
};