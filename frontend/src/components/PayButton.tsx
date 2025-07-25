// 결제 로직 집중 

import { buildPermitCallData } from '../utils/permit';
import { sendPaymentToBackend } from '../utils/payment';
import PaymentJson from '../abis/Payment.json';
import TestTokenJson from '../abis/TestToken.json';
import React from 'react';
import { ethers } from 'ethers';
import './css/PayButton.css';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface PayButtonProps {
    account: string; // 유저 주소
    amount: string;  // 예: '0.01'
    productId: number;
    onSuccess: () => void;
    onCancel: () => void;
}

const PayButton: React.FC<PayButtonProps> = ({ account, amount, productId, onSuccess, onCancel }) => {
    const handlePay = async () => {
        try {
            // 1. 메마 설치 되어 있는지 확인 
            if (!window.ethereum) {
                toast.error('🦊 MetaMask가 설치되어 있지 않습니다.');
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
            const value = ethers.parseUnits(amount, 18);

            // 3. Permit 서명 데이터 생성 
            // 이 때 메타마스크 창이 뜬다. 
            const { v, r, s, deadline } = await buildPermitCallData(
                token,
                payment,
                signer,
                account,
                amount,
                Number(chainId)
            );

            // 5. 결제 트랜잭션 실행 
            const tx = await payment.permitAndPayWithCashback(
                account,
                value,
                deadline,
                v,
                r,
                s,
                value
            );
            const receipt = await tx.wait();

            // 6. 캐시백 금액 계산
            let cashbackAmount = '0';
            try {
                const cashbackRate = await payment.cashbackRate();
                cashbackAmount = ethers.formatUnits((value * cashbackRate) / 100n, 18);
            } catch (err) {
                console.warn('⚠️ 캐시백 비율 조회 실패:', err);
            }

            // 7. 백엔드 전송 
            await sendPaymentToBackend(
                receipt.hash,
                amount,
                'SUCCESS',
                account,
                cashbackAmount,
                productId
            );

            // 8. 유저에게 완료 알림 
            toast.success('🎉 결제 완료!', {
                position: 'top-center',
                autoClose: 3000,
                hideProgressBar: false,
                closeOnClick: true,
                pauseOnHover: true,
                draggable: true,
            });
            onSuccess();
        } catch (err: any) {
            console.error('❌ 결제 실패:', err);
            toast.error(`❌ 결제 실패: ${err?.reason || err?.message || '알 수 없는 오류'}`, {
                position: 'top-center',
                autoClose: 5000,
            });
        }
    };

    return (
        <div className='pay-popup'>
            <button onClick={handlePay} className='pay-button'>결제하기</button>
            <button onClick={onCancel} className='close-buton'>x</button>
        </div>
    )
};

export default PayButton;