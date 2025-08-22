// utils/walletLogin.ts
// 지갑 주소 + 서명 기반 로그인 (nonce 기반, JWT 저장 키 'jwt'로 통일)
import { ethers } from "ethers";
import { requestLoginChallenge, requestLoginToken } from "../api/auth";
// requestLoginChallenge(address) -> { message, nonce, expiresAt, domain?, chainId? }
// requestLoginToken(address, message, signature) -> { token }

export const connectAndLogin = async (
    onAccountConnected: (address: string) => void
) => {
    if (!window.ethereum) {
        alert("🦊 MetaMask를 설치해주세요!");
        return;
    }

    try {
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

        // 4) 사용자가 메시지에 서명  
        const signature = await (signer as any).signMessage(challenge.message);

        // 5) 서버로 서명 검증 -> access token (문자열) 수령 
        const accessToken = await requestLoginToken(address, challenge.message, signature);

        // 6) JWT 저장 (키: 'jwt'로 통일)
        localStorage.setItem("jwt", accessToken);

        // 7) 상위 상태 업데이트
        onAccountConnected(address);
        return { address, jwt: accessToken }; // 호출자가 필요하면 활용
    } catch (err: any) {
        // EIP-1193 사용자 거절 코드 예: 4001
        const code = err?.code ?? err?.error?.code;
        if (code === 4001) {
            alert("서명이 취소되었습니다.");
            return;
        }
        console.error("❌ 지갑 로그인 실패:", err);
        alert(err?.message ?? "지갑 로그인 중 오류가 발생했습니다.");
    }
};