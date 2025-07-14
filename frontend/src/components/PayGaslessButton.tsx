// src/components/PayGaslessButton.tsx
import React from 'react';
import { ethers } from 'ethers';
import { sendMetaApproveTx, sendMetaPayTx } from '../utils/relayer';
import { buildMetaApproveRequest, buildPayRequest, SignedForwardRequest } from '../utils/request';
import { sendPaymentToBackend } from '../utils/payment';
import TestTokenJson from '../abis/TestToken.json';
import PaymentJson from '../abis/Payment.json';
import MyForwarderJson from '../abis/MyForwarder.json';
import './css/ConnectWalletButton.css';

interface PayGaslessButtonProps {
    account: string; // 유저 주소
    amount: string;  // 예: '0.01'
    productId: number;
    onSuccess: () => void;
}

const PayGaslessButton: React.FC<PayGaslessButtonProps> = ({ account, amount, productId, onSuccess }) => {
    const handleGaslessPay = async () => {
        try {
            console.log('🚀 Gasless 결제 시작');

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
            console.log('📌 forwarderAddress env:', forwarderAddress);

            const tokenAddress = process.env.REACT_APP_TOKEN_ADDRESS!;
            const paymentAddress = process.env.REACT_APP_CONTRACT_ADDRESS!;
            const relayerUrl = process.env.REACT_APP_RELAYER_URL!;

            // 4. 아래 컨트랙트 인스턴스 확보 
            const forwarder = new ethers.Contract(forwarderAddress, MyForwarderJson.abi, provider);

            // const token = new ethers.Contract(tokenAddress, TestTokenJson.abi, provider);
            const token = new ethers.Contract(tokenAddress, [
                'function name() view returns (string)',
                'function nonces(address) view returns (uint256)',
                'function metaApprove(address,address,uint256,uint256,bytes) external'
            ], provider);

            const payment = new ethers.Contract(paymentAddress, PaymentJson.abi, provider);
            const chainId = (await provider.getNetwork()).chainId;

            // 6. metaApprove 요청 생성
            const approveRequest = await buildMetaApproveRequest(
                signer,
                token,   // 토큰 컨트랙트 인스턴스 
                account,  // 유저 지갑 
                paymentAddress,  // spender: Payment 컨트랙트 주소 
                ethers.parseUnits(amount, 18).toString(),
                Number(chainId)
            )
            console.log("🧾 metaApprove Request:", approveRequest);

            // metaApprove 실행 (Relayer에 전송)
            const approveTx = await sendMetaApproveTx(approveRequest, relayerUrl, productId);

            if (!approveTx.txHash) {
                alert('❌ metaApprove 실패');
                return;
            }

            console.log('✅ MetaApprove relayed txHash:', approveTx.txHash);

            // 7. 결제용 데이터 준비 
            const parsedAmount = ethers.parseUnits(amount, 18);
            console.log('📦 [DEBUG] pay parsedAmount:', parsedAmount.toString());

            const data = payment.interface.encodeFunctionData('pay', [
                parsedAmount,   // BigInt 타입 그대로 전달 
            ]);
            console.log('📦 [DEBUG] encoded pay calldata:', data);

            const payRequest: SignedForwardRequest = await buildPayRequest(
                account,
                paymentAddress,
                data,
                forwarder,
                provider,
                signer,
                Number(chainId),
            );
            console.log("🧾 [DEBUG] payRequest (with data):", payRequest);

            // 8. 결제 메타 트랜잭션 전송 
            console.log("📦 보내는 payRequest.data:", payRequest.data);
            console.log("typeof:", typeof payRequest.data);
            console.log("isHexString:", ethers.isHexString(payRequest.data));

            const payTx = await sendMetaPayTx(payRequest, relayerUrl, productId);
            const txHash = payTx.txHash || 'FAILED_TX';
            console.log("✅ Payment relayed txHash", txHash);

            // 9. 캐시백 계산
            let cashbackAmount = '0';
            try {
                const cashbackRate = await payment.cashbackRate();
                cashbackAmount = ethers.formatUnits((ethers.parseUnits(amount, 18) * cashbackRate) / 100n, 18);
            } catch (err) {
                console.warn('⚠️ 캐시백 비율 조회 실패:', err);
            }

            // 10. 백엔드로 결제 정보 전송
            await sendPaymentToBackend(
                txHash,
                amount,
                'SUCCESS',
                account,
                cashbackAmount,
                productId
            );
            // alert('🎉 결제가 완료되었습니다!');
            onSuccess();
        } catch (error) {
            console.error("❌ 결제 실패:", error);
            await sendPaymentToBackend('', amount, 'FAILED', account, '0', productId);
            alert('❌ 결제에 실패했습니다.');
        }
    };

    return <button onClick={handleGaslessPay} className='pay-button'>결제하기</button>;
};

export default PayGaslessButton;
