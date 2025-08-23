// utils/walletLogin.ts
// 지갑 주소 + 서명 기반 로그인 (nonce 기반, JWT 저장 키 'jwt'로 통일)
import { ethers } from "ethers";
import { requestLoginChallenge, requestLoginToken } from "../api/auth";
// requestLoginChallenge(address) -> { message, nonce, expiresAt, domain?, chainId? }
// requestLoginToken(address, message, signature) -> { token }

export type WalletLoginResult = {
    address: string;
    access_token: string; // JWT
};

export async function walletLogin(): Promise<WalletLoginResult> {
    if (!window.ethereum) {
        throw new Error("MetaMask가 필요합니다. 브라우저에 설치 후 다시 시도하세요.");
    }
    // 1) 지갑 연결 요청
    await window.ethereum.request?.({ method: "eth_requestAccounts" });

    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    // 2) 주소/체인 정보
    const address = (await signer.getAddress()).toLowerCase();
    const { chainId } = await provider.getNetwork();

    // 3) 서버에서 로그인 챌린지(메시지/nonce) 받기
    const challenge = await requestLoginChallenge(address, Number(chainId));
    // challenge.message 는 서버가 생성한 고유 문자열이어야 함 (nonce/만료/도메인 포함 권장)
    if (!challenge?.message || challenge.message.length < 8) {
        throw new Error("로그인 메시지가 올바르지 않습니다.");
    }
    // (선택) 만료 체크: 프론트 가드. 최종 검증은 서버가 함.
    if (challenge.expiresAt) {
        const expMs = new Date(challenge.expiresAt).getTime(); // string → Date → ms
        if (expMs < Date.now()) {
            throw new Error("로그인 요청이 만료되었습니다. 다시 시도하세요.");
        }
    }

    // 4) 사용자가 메시지에 서명  
    const signature = await (signer as any).signMessage(challenge.message);

    // 5) 서버로 서명 검증 -> access token (문자열) 발급 
    const access_token = await requestLoginToken(address, challenge.message, signature);

    // 6) 여기서 로컬스토리지/상태 업데이트는 하지 않음 (관심사 분리)
    return { address, access_token }; // 호출자가 필요하면 활용
} 