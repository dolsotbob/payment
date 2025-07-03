// src/components/PayGaslessButton.tsx
import React from 'react';
import { ethers } from 'ethers';
import { sendMetaApproveTx, sendMetaPayTx } from '../utils/relayer';
import { buildMetaApproveRequest, buildPayRequest } from '../utils/request';
import { sendPaymentToBackend } from '../utils/payment';
import TestTokenJson from '../abis/TestToken.json';
import PaymentJson from '../abis/Payment.json';

interface PayGaslessButtonProps {
    account: string; // 유저 주소
    amount: string;  // 예: '0.01'
}

const PayGaslessButton: React.FC<PayGaslessButtonProps> = ({ account, amount }) => {
    const handleGaslessPay = async () => {
        try {
            console.log('Gasless 결제 시작');

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

            // 3. 환경 변수에서 주소 확보
            const forwarderAddress = process.env.REACT_APP_FORWARDER_ADDRESS!;
            const tokenAddress = process.env.REACT_APP_TOKEN_ADDRESS!;
            const paymentAddress = process.env.REACT_APP_CONTRACT_ADDRESS!;
            const relayerUrl = process.env.REACT_APP_RELAYER_URL!;

            // 4. 아래 컨트랙트 인스턴스 확보 
            const forwarder = new ethers.Contract(forwarderAddress, [], provider);
            const token = new ethers.Contract(tokenAddress, TestTokenJson.abi, provider);
            const chainId = (await provider.getNetwork()).chainId;

            // 6. metaApprove 요청 생성 및 Relayer 서버로 전송 
            const approveRequest = await buildMetaApproveRequest(
                signer,
                token,
                account,
                paymentAddress,
                ethers.parseUnits(amount, 18).toString(),
                Number(chainId)
            )

            await sendMetaApproveTx(approveRequest, relayerUrl);
            console.log('✅ MetaApprove 트랜잭션 전송 완료');

            const payment = new ethers.Contract(paymentAddress, PaymentJson.abi, provider);
            const calldata = payment.interface.encodeFunctionData('pay', [
                ethers.parseUnits(amount, 18),
            ]);

            const payRequest = await buildPayRequest(
                account,
                paymentAddress,
                calldata,
                forwarder,
                provider,
                signer,
                Number(chainId)
            );

            const result = await sendMetaPayTx(payRequest, relayerUrl);
            const txHash = result.txHash || result.transactionHash || '';

            // 7. 캐시백 계산
            let cashbackAmount = '0';
            try {
                const cashbackRate = await payment.cashbackRate();
                cashbackAmount = ethers.formatUnits((ethers.parseUnits(amount, 18) * cashbackRate) / 100n, 18);
            } catch (err) {
                console.warn('⚠️ 캐시백 비율 조회 실패:', err);
            }

            // 8. 백엔드로 결제 정보 전송
            await sendPaymentToBackend(
                txHash,
                amount,
                'SUCCESS',
                account,
                cashbackAmount
            );
            alert('✅ 결제가 완료되었습니다!');
        } catch (error) {
            console.error('❌ 결제 실패:', error);
            await sendPaymentToBackend(
                '', amount, 'FAILED', account, '0'
            );
            alert('❌ 결제에 실패했습니다.');
        }
    };

    return <button onClick={handleGaslessPay}>결제하기</button>;
};

export default PayGaslessButton;