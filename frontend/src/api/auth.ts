// * api 폴더: 백앤드 API 요청 함수들 
// api/auth.ts
import api from './axios';

// 챌린지 발급 응답 타입
export type ChallengeResponse = {
    message: string;    // 지갑이 서명할 메시지
    nonce: string;      // 1회용 nonce
    expiresAt: string;  // ISO 형식 만료 시각
};

// 챌린지 발급
export const requestLoginChallenge = async (
    address: string,
    chainId?: number
): Promise<ChallengeResponse> => {
    const res = await api.post<ChallengeResponse>('/auth/challenge', { address, chainId });
    return res.data;
};

// 기존: 로그인 토큰 요청 (서명 검증 -> JWT 발급)
export const requestLoginToken = async (
    address: string,
    message: string,
    signature: string
): Promise<string> => {
    const response = await api.post<{ access_token: string }>('/auth/login', {
        address,
        message,
        signature,
    });
    // 백엔드가 { access_token } 반환하므로 그대로 전달
    return response.data.access_token;
};
