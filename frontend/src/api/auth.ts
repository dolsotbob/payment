// * api 폴더: 백앤드 API 요청 함수들 
// api/auth.ts
import api from './axios';

// 챌린지 발급 응답 타입
export type ChallengeResponse = {
    expiresAt: string;
    message: string;    // 지갑이 서명할 메시지
    nonce: string;      // 1회용 nonce
};

export type TokenResponse = { access_token: string };

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
    const response = await api.post<TokenResponse>('/auth/login', {
        address,
        message,
        signature,
    });
    // 백엔드가 { access_token } 반환하므로 그대로 전달
    return response.data.access_token;
};

// 현재 로그인한 유저 타입
export type Me = {
    id: string;
    address: string;
    createdAt: string;
    // 필요한 필드 더 추가 (nickname, roles 등)
};

// 현재 로그인한 유저 정보 가져오기
export async function fetchMe(): Promise<Me> {
    const res = await api.get<Me>('/auth/me');
    return res.data;
}

