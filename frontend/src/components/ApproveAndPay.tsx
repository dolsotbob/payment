// ERC20 토큰 결제 전, approve -> pay -> 백엔드 전송까지 수행하는 버튼 컴포넌트
// 사용자가 처음 결제할 때 꼭 필요 
// 사용자가 이미 approve()를 한 상태라면, 바로 pay()만 실행해서 결제할 수 있게 해주는 간편 결제 버튼
// App.tsx에서 이 버튼 먼저 테스트 해보기 
import React from 'react';
import { ethers } from 'ethers';
import PaymentGatewayJson from '../abis/PaymentGateway.json';
import TestTokenJson from '../abis/TestToken.json';
import { sendPaymentToBackend } from '../utils/payment';

interface ApproveAndPayProps {
    account: string;
    amount: string; // 예: '0.01'
}

const ApproveAndPay: React.FC<ApproveAndPayProps> = ({ account, amount }) => {
    const handleApproveAndPay = async () => {
        try {
            // 1. 메마 설치 되어 있는지 확인 
            if (!window.ethereum) {
                alert('🦊 MetaMask가 필요합니다.');
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

            // 3. TestToken (ERC20), PaymentGateway 컨트랙트 인스턴스 생성
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

            // 4. 입력된 금액을 wei로 변환 
            const weiAmount = ethers.parseUnits(amount, 18);

            // ✅ 5. 먼저 토큰 사용 승인 (approve)
            const approveTx = await tokenContract.approve(paymentContract.target, weiAmount);
            await approveTx.wait();

            // ✅ 여기서 allowance 확인!
            const allowance = await tokenContract.allowance(account, paymentContract.target);
            console.log('✅ 현재 allowance:', ethers.formatUnits(allowance, 18));
            // ✅ 여기서 사용자 지갑의 TTK 잔액 확인!
            const balance = await tokenContract.balanceOf(account);
            console.log('📦 TTK 잔액 (사용자):', ethers.formatUnits(balance, 18));

            // ✅ 6. 그다음 결제 실행
            const payTx = await paymentContract.pay(weiAmount);
            const receipt = await payTx.wait();

            // ✅ 7. 결제 결과 백엔드 전송
            // ✅ 공통 유틸 함수 사용
            await sendPaymentToBackend(receipt, amount, 'SUCCESS');
            console.log('📡 백엔드 전송 시도:', receipt.hash, amount);

            alert('✅ 결제가 완료되었습니다!');
        } catch (err) {
            console.error('❌ 결제 실패:', err);
            alert('❌ 결제에 실패했습니다.');
            // 선택: 실패 시에도 전송하려면 아래 사용
            // await sendPaymentToBackend({ hash: '', from: account, to: '', ... }, amount, 'FAILED');
        }
    };

    return <button onClick={handleApproveAndPay}>신규유저 - 승인하고 결제하기</button>;
};

export default ApproveAndPay;
