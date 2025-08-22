// 결제 로직 + 쿠폰 연동 
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { buildPermitCallData } from '../utils/permit';
import { sendPaymentToBackend } from '../utils/payment';
import PaymentJson from '../abis/Payment.json';
import TestTokenJson from '../abis/TestToken.json';
import './css/PayButton.css';

import type { OwnedCoupon } from '../types/coupons';
import { useValidateCouponMutation } from '../hooks/mutations/useValidateCouponMutation';
import { useApplyCouponMutation } from '../hooks/mutations/useApplyCouponMutations';

interface PayButtonProps {
    account: string; // 유저 주소
    amount: string;  // 예: '0.01'
    productId: number;
    selectedCoupon?: OwnedCoupon | null;
    onSuccess: () => void;
    onCancel: () => void;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const PayButton: React.FC<PayButtonProps> = ({
    account,
    amount,
    productId,
    selectedCoupon,
    onSuccess,
    onCancel,
}) => {
    const [paying, setPaying] = useState(false);

    // jwt 기반 로그인 
    const jwt = localStorage.getItem('jwt');

    // 쿠폰 검증/적용 훅 
    const { mutateAsync: validateCoupon, isPending: validating } = useValidateCouponMutation(jwt);
    const { mutateAsync: applyCouponUse, isPending: applying } = useApplyCouponMutation(jwt);

    const disabled = paying || validating || applying;

    const handlePay = async () => {
        try {
            if (!window.ethereum) {
                toast.error('🦊 MetaMask가 설치되어 있지 않습니다.');
                return;
            }
            if (!amount || Number(amount) <= 0) {
                toast.error('💸 유효한 결제 금액이 없습니다.');
                return;
            }
            if (!jwt) {
                toast.error('🔐 로그인이 필요합니다.');
                return;
            }

            const tokenAddress = process.env.REACT_APP_TOKEN_ADDRESS;
            const paymentAddress = process.env.REACT_APP_PAYMENT_ADDRESS;
            const couponNftEnv = process.env.REACT_APP_COUPON1155_ADDRESS;

            if (!tokenAddress || !paymentAddress) {
                toast.error('환경변수(REACT_APP_TOKEN_ADDRESS / REACT_APP_PAYMENT_ADDRESS)가 설정되지 않았습니다.');
                return;
            }

            setPaying(true);

            // 1) (선택) 쿠폰 사전 검증 
            if (selectedCoupon) {
                const res = await validateCoupon({
                    couponId: Number(selectedCoupon.id),
                    amount: parseFloat(amount), // 금액 검증이 정책에 필요하다면 전달 
                });
                if (!res.ok) {
                    toast.error(`쿠폰 사용 불가: ${res.reason ?? '알 수 없는 사유'}`);
                    return;
                }
            }

            // 2) 결제 트랜잭션 실행 
            // provider, signer 준비 
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const chainId = (await provider.getNetwork()).chainId;

            // 컨트랙트 객체 생성  
            const token = new ethers.Contract(tokenAddress, TestTokenJson.abi, provider);
            const payment = new ethers.Contract(paymentAddress, PaymentJson.abi, signer);

            // 금액: 토큰 소수 자릿수(예: 18)로 변환
            const priceBN = ethers.parseUnits(amount, 18);

            // permit allowance(value): afterPrice 이상이어야 하므로 price 이상으로 설정하면 안전
            const valueBN = priceBN;

            // 쿠폰 파라미터 구성
            const couponNftAddress = selectedCoupon ? (process.env.REACT_APP_COUPON1155_ADDRESS as string) : ZERO_ADDRESS;
            const couponId = selectedCoupon ? BigInt(Number(selectedCoupon.id)) : 0n;
            const useCoupon = Boolean(selectedCoupon);

            // Permit 서명 데이터 생성 
            // 이 때 메타마스크 창이 뜬다. 
            const { v, r, s, deadline } = await buildPermitCallData(
                token,
                payment,
                signer,
                account,
                amount,   // 문자열 금액 
                Number(chainId)
            );

            // 결제 트랜잭션 실행 
            const tx = await payment.permitAndPayWithCashback(
                account,
                valueBN,
                deadline,
                v,
                r,
                s,
                priceBN,
                couponNftAddress,
                couponId,
                useCoupon
            );
            const receipt = await tx.wait();

            // 3) 캐시백 금액 계산
            let cashbackAmount = '0';
            try {
                const cashbackRate = await payment.cashbackRate();
                cashbackAmount = ethers.formatUnits((priceBN * cashbackRate) / 100n, 18);
            } catch (err) {
                console.warn('⚠️ 캐시백 비율 조회 실패:', err);
            }

            // 4) 백엔드 전송 (결제 레코드 생성)
            const paymentRes = await sendPaymentToBackend({
                txHash: receipt.hash,
                amountWei: priceBN.toString(),     // ← BN을 그대로 문자열로
                status: "SUCCESS",
                userAddress: account,
                cashbackAmountWei: ethers.parseUnits(cashbackAmount, 18).toString(), // 이미 BN이면 .toString()
                productId,
                gasUsed: receipt.gasUsed,
                gasPrice: receipt.effectiveGasPrice,
            });

            // paymentId 확보 (id가 없으면 txHash로 대체)
            const paymentId = String(paymentRes?.id ?? receipt.hash);

            // 5) (선택) 쿠폰 사용 기록 생성
            if (selectedCoupon) {
                await applyCouponUse({
                    couponId: Number(selectedCoupon.id),
                    paymentId, // 문자열로 전달
                    // amount나 orderUsdTotal을 정책에 맞게 추가 가능
                });
                // onSuccess 내부에서 쿠폰 목록은 invalidate되어 최신화됩니다.
            }

            // 유저에게 완료 알림 
            toast.success('🎉 결제 완료!', { position: 'top-center', autoClose: 3000 });
            onSuccess();
        } catch (err: any) {
            console.error('❌ 결제 실패:', err);
            toast.error(`❌ 결제 실패: ${err?.reason || err?.message || '알 수 없는 오류'}`, {
                position: 'top-center',
                autoClose: 5000,
            });
        } finally {
            // ← 빠져있던 로딩 해제 보강
            setPaying(false);
        }
    };


    return (
        <div className='pay-popup'>
            <button onClick={onCancel} className="close-button">x</button>
            <button onClick={handlePay} className="pay-button" disabled={disabled}>
                {disabled ? '처리 중…' : '결제하기'}
            </button>
        </div>
    )
};

export default PayButton;

