import { ethers } from 'ethers';
import PaymentGatewayJson from '../../abis/PaymentGateway.json';
import TestTokenJson from '../../abis/TestToken.json';

export const getProviderAndSigner = async () => {
    if (!window.ethereum) throw new Error('🦊 MetaMask가 필요합니다.');
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    return { provider, signer };
};

export const getTokenContract = (signer: ethers.Signer) => {
    return new ethers.Contract(TestTokenJson.address, TestTokenJson.abi, signer);
};

export const getPaymentContract = (signer: ethers.Signer) => {
    return new ethers.Contract(PaymentGatewayJson.address, PaymentGatewayJson.abi, signer);
};
