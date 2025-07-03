// src/components/PayGaslessButton.tsx
import React from 'react';
import { ethers } from 'ethers';
import { sendMetaTx } from '../utils/relayer';
import { sendPaymentToBackend } from '../utils/payment';
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

            // approve() 호출 안 해도 되기 때문에 TestToken과 Payment 컨트랙트 인스턴스 필요 없음 
            // 사용자는 pay()를 직접 호출하지 않고 ABI 인코딩된 데이터를 생성해 서명만 함. 
            // 이후 Relayer가 대신 컨트랙트에 호출함. 
            // 그래서 프론트에서 컨트랙트 인스턴스를 통해 직접 실행할 필요 없음 

            // 3. 환경 변수에서 주소 확보
            const forwarderAddress = process.env.REACT_APP_FORWARDER_ADDRESS!;
            const paymentAddress = process.env.REACT_APP_CONTRACT_ADDRESS!;
            const relayerUrl = process.env.REACT_APP_RELAYER_URL!;
            console.log('🔍 relayerUrl (from .env):', relayerUrl);

            // 4. relayer 서버로 전송
            const result = await sendMetaTx(
                signer,  // signer
                account,                    // from
                paymentAddress,             // to (payment contract)
                amount,                     // amount in string
                forwarderAddress,          // forwarder address (string)
                relayerUrl,                 // relayer URL
                provider                    // provider
            );

            const txHash = result.txHash || result.transactionHash || '';

            // 5. 캐시백 계산
            let cashbackAmount = '0';
            try {
                const paymentContract = new ethers.Contract(paymentAddress, PaymentJson.abi, provider);
                const cashbackRate = await paymentContract.cashbackRate();
                cashbackAmount = ethers.formatUnits((ethers.parseUnits(amount, 18) * cashbackRate) / 100n, 18);
            } catch (err) {
                console.warn('⚠️ 캐시백 비율 조회 실패:', err);
            }

            // 6. 백엔드로 결제 정보 전송
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