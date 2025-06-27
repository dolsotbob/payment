// ERC20 토큰 결제 전, approve -> pay -> 백엔드 전송까지 수행하는 버튼 컴포넌트
// 사용자가 처음 결제할 때 꼭 필요 
// 사용자가 이미 approve()를 한 상태라면, 바로 pay()만 실행해서 결제할 수 있게 해주는 간편 결제 버튼
// App.tsx에서 이 버튼 먼저 테스트 해보기 
import React from 'react';
import { ethers } from 'ethers';
import PaymentJson from '../abis/Payment.json';
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

            if (!account) {
                alert('🦊 지갑 연결 후 결제해주세요.');
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

            // 3. TestToken (ERC20),  컨트랙트 인스턴스 생성
            const tokenContract = new ethers.Contract(
                TestTokenJson.address,
                TestTokenJson.abi,
                signer
            );

            // Payment 컨트랙트 인스턴스 생성 
            const paymentContract = new ethers.Contract(
                PaymentJson.address,
                PaymentJson.abi,
                signer
            );

            // 4. 입력된 금액을 wei로 변환
            const weiAmount = ethers.parseUnits(amount, 18);

            // ✅ 5. 승인 
            // 현재 allowance 확인 - 유저가 결제 컨트랙트에게 얼마만큼 토큰 사용을 허용했는지 확인하기 
            // account - 사용자 지갑 주소(승인자) 
            // paymentContract.target: 승인 받은 지갑/컨트랙트 주소(spender) 
            const currentAllowance = await tokenContract.allowance(account, paymentContract.target);

            if (currentAllowance < weiAmount) {
                console.log('🔑 Allowance 부족 → 승인 시도');
                const approveTx = await tokenContract.approve(paymentContract.target, weiAmount);
                await approveTx.wait();
                console.log('✅ 승인 완료');
            } else {
                console.log('🔓 기존 allowance 충분 → 승인 생략');
            }

            // ✅ 여기서 사용자 지갑의 TEST 잔액 확인!
            const balance = await tokenContract.balanceOf(account);
            console.log('📦 TEST 잔액 (사용자):', ethers.formatUnits(balance, 18));

            // ✅ 6. 그다음 결제 실행
            const payTx = await paymentContract.pay(weiAmount);
            const receipt = await payTx.wait();

            // ✅ 캐시백 계산 (프론트에서 contract와 동일한 계산 방식으로)
            const cashbackRate = 2; // 또는 Payment 컨트랙트에서 가져오거나 상수로 지정
            const cashbackAmount = ((Number(amount) * cashbackRate) / 100).toFixed(18); // string 타입

            // ✅ 7. 결제 결과 백엔드 전송
            // ✅ 공통 유틸 함수 사용
            await sendPaymentToBackend(receipt, amount, 'SUCCESS', account, cashbackAmount);
            console.log('📡 백엔드 전송 완료:', receipt.hash, amount);

            alert('✅ 결제가 완료되었습니다!');
        } catch (err: any) {
            console.error('❌ 결제 실패:', err);
            alert('❌ 결제에 실패했습니다.');

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

    return <button onClick={handleApproveAndPay}>신규유저 - 승인하고 결제하기</button>;
};

export default ApproveAndPay;
