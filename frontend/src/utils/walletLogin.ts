// utils/walletLogin.ts
// 지갑 주소 + 서명 기반 로그인 
import { ethers } from 'ethers';
import axios from 'axios';

export const connectAndLogin = async (
    onAccountConnected: (address: string) => void
) => {
    if (!window.ethereum) {
        alert('🦊 MetaMask를 설치해주세요!');
        return;
    }

    try {
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const address = await signer.getAddress();

        const message = "Login to My Little Coin Cart (test)";
        // const message = `Login to My Little Coin Cart at ${new Date().toISOString()}`;
        const signature = await signer.signMessage(message);
        console.log('address', address);
        console.log('message', message);
        console.log('signature:', signature);

        const res = await axios.post(`${process.env.REACT_APP_BACKEND_URL}/auth/login`, {
            address,
            message,
            signature,
        });

        const token = res.data.access_token;
        localStorage.setItem('token', token);
        onAccountConnected(address);  // App.tsx의 setAccount에 반영 
    } catch (error) {
        console.error('❌ 지갑 로그인 실패:', error);
        alert('지갑 로그인 중 오류가 발생했습니다.');
    }
};