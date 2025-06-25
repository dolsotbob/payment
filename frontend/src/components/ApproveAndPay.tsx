// approve -> pay -> fetch 로직 넣기 
// 그담에 App.tsx에서 이 버튼 먼저 테스트 해보기 
import React from 'react';
import { ethers } from 'ethers';
import PaymentGatewayJson from '../../abis/PaymentGateway.json';
import TestTokenJson from '../../abis/TestToken.json';
import { sendPaymentToBackend } from '../utils/payment';

interface ApproveAndPayProps {
    account: string;
    amount: string; // 예: '0.01'
}

const ApproveAndPay: React.FC<ApproveAndPayProps> = ({ account, amount }) => {
    const handleApproveAndPay = async () => {
        try {
            if (!window.ethereum) {
                alert('🦊 MetaMask가 필요합니다.');
                return;
            }

            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            const tokenContract = new ethers.Contract(
                TestTokenJson.address,
                TestTokenJson.abi,
                signer
            );

            const paymentContract = new ethers.Contract(
                PaymentGatewayJson.address,
                PaymentGatewayJson.abi,
                signer
            );

            const weiAmount = ethers.parseUnits(amount, 18);

            // ✅ 1. 먼저 토큰 사용 승인
            const approveTx = await tokenContract.approve(paymentContract.target, weiAmount);
            await approveTx.wait();

            // ✅ 2. 그다음 결제 실행
            const payTx = await paymentContract.pay(weiAmount);
            const receipt = await payTx.wait();

            // ✅ 3. 결제 결과 백엔드 전송
            await sendPaymentToBackend(receipt, amount, 'SUCCESS');

            alert('✅ 결제가 완료되었습니다!');
        } catch (err) {
            console.error('❌ 결제 실패:', err);
            alert('❌ 결제에 실패했습니다.');
            // 선택: 실패 시에도 전송하려면 아래 사용
            // await sendPaymentToBackend({ hash: '', from: account, to: '', ... }, amount, 'FAILED');
        }
    };

    return <button onClick={handleApproveAndPay}>Approve + Pay</button>;
};

export default ApproveAndPay;
