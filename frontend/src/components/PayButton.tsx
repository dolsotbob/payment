import { buildPermitCallData } from '../utils/permit';
import { sendPaymentToBackend } from '../utils/payment';
import PaymentJson from '../abis/Payment.json';
import TestTokenJson from '../abis/TestToken.json';
import React from 'react';
import { ethers } from 'ethers';
import './css/ConnectWalletButton.css';

interface PayButtonProps {
    account: string; // 유저 주소
    amount: string;  // 예: '0.01'
    productId: number;
    onSuccess: () => void;
}

const PayButton: React.FC<PayButtonProps> = ({ account, amount, productId, onSuccess }) => {
    const handlePay = async () => {
        try {
            // 1. 메마 설치 되어 있는지 확인 
            if (!window.ethereum) {
                alert('🦊 MetaMask가 필요합니다.');
                return;
            }

            if (!account) {
                alert('🦊 지갑을 연결해주세요.');
                return;
            }

            // !amount가 비어있거나 존재하지 않을 때 
            if (!amount || Number(amount) <= 0) {
                alert('💸 유효한 결제 금액이 없습니다.');
                return;
            }

            // 2. provider, signer 준비 
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const chainId = (await provider.getNetwork()).chainId;

            // 컨트랙트 객체 생성  
            const tokenAddress = process.env.REACT_APP_TOKEN_ADDRESS!;
            const token = new ethers.Contract(tokenAddress, TestTokenJson.abi, provider)

            const paymentAddress = process.env.REACT_APP_PAYMENT_ADDRESS!;
            const payment = new ethers.Contract(paymentAddress, PaymentJson.abi, signer);

            // 3. Permit 서명 데이터 생성 
            const { v, r, s, deadline } = await buildPermitCallData(
                token,
                payment,
                signer,
                account,
                amount,
                Number(chainId)
            );

            // 4. 결제 트랜잭션 실행 
            const value = ethers.parseUnits(amount, 18);

            const tx = await payment.permitAndPayWithCashback(
                account,
                value,
                deadline,
                v,
                r,
                s,
                value
            );
            await tx.wait();

            // 5. 백엔드로 결제 정보 전송
            const receipt = await tx.wait();
            const txHash = receipt.hash;

            // 캐시백 계산
            let cashbackAmount = '0';
            try {
                const cashbackRate = await payment.cashbackRate();
                cashbackAmount = ethers.formatUnits((value * cashbackRate) / 100n, 18);
            } catch (err) {
                console.warn('⚠️ 캐시백 비율 조회 실패:', err);
            }

            await sendPaymentToBackend(
                txHash,
                amount,
                'SUCCESS',
                account,
                cashbackAmount,
                productId
            );

            // 6. 유저에게 완료 알림 
            alert('결제 완료!');
            onSuccess();
        } catch (err: any) {
            console.error('❌ 결제 실패:', err);
            alert(`결제 실패: ${err?.reason || err?.message || '알 수 없는 오류'}`);
        }
    };

    return <button onClick={handlePay} className='pay-button'>결제하기</button>;
};

export default PayButton;