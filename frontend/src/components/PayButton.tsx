import React from 'react';
import { ethers } from 'ethers';
import PaymentGatewayJson from '../../abis/PaymentGateway.json';
import { sendPaymentToBackend } from '../utils/payment';

interface PayButtonProps {
    account: string;
    amount: string;
}

const PayButton: React.FC<PayButtonProps> = ({ account, amount }) => {
    const handlePayment = async () => {
        try {
            if (!window.ethereum) {
                alert('🦊 MetaMask가 설치되어 있어야 합니다.');
                return;
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            const contract = new ethers.Contract(
                PaymentGatewayJson.address, // abiGenerator.ts로 만든 주소
                PaymentGatewayJson.abi,
                signer
            );

            const weiAmount = ethers.parseUnits(amount, 18);
            const tx = await contract.pay(weiAmount);
            const receipt = await tx.wait(); // 블록에 포함될 때까지 대기

            // ✅ 공통 유틸 함수 사용
            await sendPaymentToBackend(receipt, amount, 'SUCCESS');

            alert('✅ 결제가 완료되었습니다!');
        } catch (err) {
            console.error('❌ 결제 실패:', err);
            alert('❌ 결제에 실패했습니다. 다시 시도해 주세요.');

            // 선택사항: 실패도 기록하고 싶다면 아래 코드도 가능
            // await sendPaymentToBackend({ hash: '', from: account, to: '', ... }, amount, 'FAILED');
        }
    };

    return (
        <button onClick={handlePayment}>
            결제하기
        </button>
    );
};

export default PayButton;