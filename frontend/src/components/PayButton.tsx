// 사용자가 이미 approve()를 한 상태라면, 바로 pay()만 실행해서 결제할 수 있게 해주는 간편 결제 버튼
import React from 'react';
import { ethers } from 'ethers';
import PaymentJson from '../abis/Payment.json';
import TestTokenJson from '../abis/TestToken.json'
import { sendPaymentToBackend } from '../utils/payment';

interface PayButtonProps {
    account: string;
    amount: string;
}

const PayButton: React.FC<PayButtonProps> = ({ account, amount }) => {
    const handlePayment = async () => {
        try {
            // 1. 메마 설치 확인, 지갑 연결 여부 확인, 금액 유효성 검사 
            if (!window.ethereum) {
                alert('🦊 MetaMask가 설치되어 있어야 합니다.');
                return;
            }

            if (!account) {
                alert('🦊 지갑 연결 후 결제해주세요.');
                return;
            }

            if (!amount || Number(amount) <= 0) {
                alert('💸 유효한 결제 금액이 없습니다.');
                return;
            }

            // 2. provider, signer 
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // 3. 컨트랙트 인스턴스 생성 
            const tokenContract = new ethers.Contract(
                TestTokenJson.address,
                TestTokenJson.abi,
                signer
            );

            const paymentContract = new ethers.Contract(
                PaymentJson.address, // abiGenerator.ts로 만든 주소
                PaymentJson.abi,
                signer
            );

            // 4. 결제 실행 
            const weiAmount = ethers.parseUnits(amount, 18);

            const payTx = await paymentContract.pay(weiAmount);
            const receipt = await payTx.wait(); // 블록에 포함될 때까지 대기

            // ✅ 캐시백 계산 (프론트에서 contract와 동일한 계산 방식으로)
            const cashbackRate = 2; // 또는 Payment 컨트랙트에서 가져오거나 상수로 지정
            const cashbackAmount = ((Number(amount) * cashbackRate) / 100).toFixed(18); // string 타입

            // 5. 결과를 백엔드로 전송 
            // ✅ 공통 유틸 함수 사용
            await sendPaymentToBackend(receipt, amount, 'SUCCESS', account, cashbackAmount);
            console.log('📡 백엔드 전송 완료:', receipt.hash, amount);

            alert('✅ 결제가 완료되었습니다!');
        } catch (err) {
            console.error('❌ 결제 실패:', err);
            alert('❌ 결제에 실패했습니다. 다시 시도해 주세요.');

            // ✅ 실패 기록을 백엔드에 남기기
            await sendPaymentToBackend(
                {
                    hash: '',
                    from: account,
                    to: ''
                } as any, // 최소한의 더미 receipt 
                amount,
                'FAILED',
                account,
                '0'
            );
        }
    };

    return (
        <button onClick={handlePayment}>
            기존 유저 - 결제하기
        </button>
    );
};

export default PayButton;