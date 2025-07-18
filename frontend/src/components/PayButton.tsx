import { buildPermitCallData } from '../utils/permit';
import { sendPaymentToBackend } from '../utils/payment';
import PaymentJson from '../abis/Payment.json';
import TestTokenJson from '../abis/TestToken.json';
import React from 'react';
import { ethers } from 'ethers';
import type { Contract } from 'ethers';
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

            const value = ethers.parseUnits(amount, 18);

            // 3. Permit 서명 데이터 생성 
            const { v, r, s, deadline } = await buildPermitCallData(
                token,
                payment,
                signer,
                account,
                amount,
                Number(chainId)
            );
            console.log("🧾 permit values", { v, r, s, deadline });
            console.log("✅ spender", { spender: payment.target });
            console.log("✅ permit value vs amount", { permitValue: value.toString() });

            // 4. permit 이후 allowance 확인 (성공적으로 적용됐는지 체크)
            // permit() 호출 직후 allowance 값은 permit()으로 넘긴 value 값과 정확히 일치해야 함 
            const allowance = await token.allowance(account, payment.target);
            console.log("✅ allowance after permit", ethers.formatUnits(allowance, 18));

            // 5. 가스 추정 및 callStatic 테스트
            // 🐞 결제 트랜잭션 실행 전, 디버깅 코드
            const paymentRaw = new ethers.Contract(
                paymentAddress,
                PaymentJson.abi,
                signer
            ) as ethers.Contract & {
                estimateGas: {
                    permitAndPayWithCashback: (
                        owner: string,
                        value: bigint,
                        deadline: number,
                        v: number,
                        r: string,
                        s: string,
                        amount: bigint
                    ) => Promise<bigint>;
                };
                callStatic: {
                    permitAndPayWithCashback: (
                        owner: string,
                        value: bigint,
                        deadline: number,
                        v: number,
                        r: string,
                        s: string,
                        amount: bigint
                    ) => Promise<any>;
                };
            };

            try {
                const gasEstimate = await paymentRaw.estimateGas.permitAndPayWithCashback(
                    account,
                    value,
                    deadline,
                    v,
                    r,
                    s,
                    value
                );
                console.log("🟢 gasEstimate 성공:", gasEstimate.toString());
            } catch (err: any) {
                console.error("❌ gasEstimate 실패:", err.reason || err.message || err);
            }

            try {
                const result = await paymentRaw.callStatic.permitAndPayWithCashback(
                    account,
                    value,
                    deadline,
                    v,
                    r,
                    s,
                    value
                );
                console.log("✅ callStatic 성공:", result);
            } catch (err: any) {
                console.error("❌ callStatic 실패:", err.reason || err.message || err);
            }

            // 6. 결제 트랜잭션 실행 
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

            console.log("📜 트랜잭션 로그:", receipt.logs);

            // 7. 캐시백 금액 계산
            let cashbackAmount = '0';
            try {
                const cashbackRate = await payment.cashbackRate();
                cashbackAmount = ethers.formatUnits((value * cashbackRate) / 100n, 18);
            } catch (err) {
                console.warn('⚠️ 캐시백 비율 조회 실패:', err);
            }

            // 8. 백엔드 전송 
            await sendPaymentToBackend(
                receipt.hash,
                amount,
                'SUCCESS',
                account,
                cashbackAmount,
                productId
            );

            // 9. 유저에게 완료 알림 
            alert('결제 완료!');
            onSuccess();
        } catch (err: any) {
            // 디버깅 위해 아래 const errorMsg 추가 
            const errorMsg =
                err?.reason ||
                err?.error?.reason ||
                err?.data?.message ||
                err?.message ||
                "알 수 없는 오류";


            console.error('❌ 결제 실패:', err);
            alert(`결제 실패: ${err?.reason || err?.message || '알 수 없는 오류'}`);
        }
    };

    return <button onClick={handlePay} className='pay-button'>결제하기</button>;
};

export default PayButton;