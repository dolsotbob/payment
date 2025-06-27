// 프론트앤드에서 Web3 관련 작업을 모듈화한 유틸리티 헬퍼 파일 
// 스마트 컨트랙트와 상호작용하는 데 필요한 provider, signer, 그리고 컨트랙트 인스턴스 생성을 코드 중복 없이 처리할 수 있게 해줌 
import { ethers } from 'ethers';
import PaymentJson from '../abis/Payment.json';
import TestTokenJson from '../abis/TestToken.json';
import VaultJson from '../abis/Vault.json';

// 메타마스크가 있는지 확인하고, ethers.js로 provider/signer를 생성해 반환
export const getProviderAndSigner = async () => {
    if (!window.ethereum) throw new Error('🦊 MetaMask가 설치되어 있어야 합니다.');
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return { provider, signer };
};

// TestToken (ERC20 토큰) 컨트랙트 인스턴스를 signer와 함께 반환
export const getTokenContract = (signer: ethers.Signer) => {
    return new ethers.Contract(TestTokenJson.address, TestTokenJson.abi, signer);
};

// Payment 컨트랙트 인스턴스를 signer와 함께 반환
export const getPaymentContract = (signer: ethers.Signer) => {
    return new ethers.Contract(PaymentJson.address, PaymentJson.abi, signer);
};

// Vault 컨트랙트 인스턴스를 signer와 함께 반환 
export const getVaultContract = (signer: ethers.Signer) => {
    return new ethers.Contract(VaultJson.address, VaultJson.abi, signer);
};