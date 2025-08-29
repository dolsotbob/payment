// 결제 로직 + 쿠폰 연동 
import React, { useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { buildPermitCallData } from '../utils/permit';
import { sendPaymentToBackend, PaymentStatus } from '../utils/payment';
import PaymentJson from '../abis/Payment.json';
import TestTokenJson from '../abis/TestToken.json';
import './css/PayButton.css';

import type { OwnedCoupon } from '../types/couponTypes';
import { useValidateCouponMutation } from '../hooks/mutations/useValidateCouponMutation';
import { useApplyCouponMutation } from '../hooks/mutations/useApplyCouponMutations';
import { useAuth } from "../context/AuthContext";
import { decodePaymentError } from '../utils/decodeError';

interface PayButtonProps {
    account: string; // 유저 주소
    amount: string;  // 예: '0.01'
    productId: number | string;
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

    // jwt 대신 accessToken 사용
    const { accessToken } = useAuth();

    // 쿠폰 훅 - 검증/적용 훅에 accessToken 인자 전달
    const { mutateAsync: validateCoupon, isPending: validating } = useValidateCouponMutation(accessToken || '');
    const { mutateAsync: applyCouponUse, isPending: applying } = useApplyCouponMutation(accessToken || '');

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
            if (!accessToken) {
                toast.error('🔐 로그인이 필요합니다.');
                return;
            }

            const tokenAddress = process.env.REACT_APP_TOKEN_ADDRESS;
            const paymentAddress = process.env.REACT_APP_PAYMENT_ADDRESS;
            const coupon1155Address = process.env.REACT_APP_COUPON1155_ADDRESS;

            if (!tokenAddress || !paymentAddress) {
                toast.error('환경변수(REACT_APP_TOKEN_ADDRESS / REACT_APP_PAYMENT_ADDRESS)가 설정되지 않았습니다.');
                return;
            }

            setPaying(true);

            // 1) (선택) 쿠폰 사전 검증 
            let discountBps = 0;
            if (selectedCoupon) {
                const res = await validateCoupon({
                    couponId: Number(selectedCoupon.id),
                    amount: Number(amount),  // 서버가 쓰지 않으면 무시됨 
                    productId: String(productId ?? ''),
                });
                if (!res.ok) {
                    toast.error(`쿠폰 사용 불가: ${res.reason ?? '알 수 없는 사유'}`);
                    return;
                }
                discountBps = res.discountBps ?? 0;
            }

            // 2) 결제 트랜잭션 실행 
            // provider, signer 준비 
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // 컨트랙트 객체 생성  
            const token = new ethers.Contract(tokenAddress, TestTokenJson.abi, provider);
            const payment = new ethers.Contract(paymentAddress, PaymentJson.abi, signer);

            // amount는 이미 wei 문자열이므로 그대로 BigInt로 
            const priceBN = ethers.toBigInt(amount);

            // permit allowance(value): afterPrice 이상이어야 하므로 price 이상으로 설정하면 안전
            const valueBN = priceBN;

            // 쿠폰 파라미터 구성 
            const couponNftAddress = selectedCoupon && coupon1155Address
                ? coupon1155Address
                : ZERO_ADDRESS;
            const couponId = selectedCoupon ? BigInt(Number(selectedCoupon.id)) : 0n;
            const useCoupon = Boolean(selectedCoupon && coupon1155Address);

            // Permit 서명 데이터 생성 (메타마스크 서명 팝업)
            const { v, r, s, deadline } = await buildPermitCallData(
                token,
                payment,
                signer,
                account,
                amount,   // wei 문자열 금액 
            );

            // 결제 트랜잭션 실행 
            try {
                // 1) callStatic으로 시뮬레이션 
                await payment.permitAndPayWithCashback.staticCall(
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
            } catch (e: any) {
                // 커스텀 에러까지 파싱해서 메시지 표면화
                const msg = decodePaymentError(e);
                console.error("[simulate] revert details:", e);
                toast.error(msg);
                return; // 실패했으면 실 트랜잭션 보내지 않음
            }

            // 2) 시뮬 성공 시 실제 전송
            const tx = await payment.permitAndPayWithCashback(
                account,
                valueBN,
                deadline,
                v, r, s,
                priceBN,
                couponNftAddress,
                couponId,
                useCoupon
            );
            const receipt = await tx.wait();

            // 3) 캐시백 금액 계산
            let cashbackAmount = '0';
            try {
                // 컨트랙트 함수가 cashbackBps()
                const cashbackBps: bigint = await payment.cashbackBps();
                // bps(200 = 2%) → 정수 나눗셈
                const cashbackWei = (priceBN * cashbackBps) / 10_000n;
                cashbackAmount = ethers.formatUnits(cashbackWei, 18);
            } catch (err) {
                console.warn('⚠️ 캐시백 비율 조회 실패:', err);
            }

            // 4) 백엔드 전송 (결제 레코드 생성) — 할인값 기록
            // PaymentPage에서 넘긴 amount가 최종가이므로, 원가/할인/최종가를 계산해 전달
            // 원가를 별도로 알고 있지 않다면, validate에서 받은 bps로 추정 불가 → 최소한 할인은 0으로 두고 최종가만 기록
            // 여기서는 "최종가=amount", 할인=미상(0) 로 넣습니다. (원가가 필요하면 PaymentPage에서 prop 추가)
            const paymentRes = await sendPaymentToBackend({
                txHash: receipt.hash,
                originalPrice: priceBN.toString(),
                discountAmount: '0',                 // 원가/최종가 분리하려면 PaymentPage에서 원가도 prop으로 내려주세요
                discountedPrice: priceBN.toString(), // 지금은 최종가=amount
                status: PaymentStatus.SUCCESS,
                userAddress: account,
                cashbackAmountWei: ethers.parseUnits(cashbackAmount, 18).toString(),
                productId: String(productId),
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
            console.error("❌ 결제 실패:", err);

            // 서버에서 내려준 메시지(JSON) 있으면 우선 보여주기
            toast.error(
                `❌ 결제 실패: ${err?.response?.data?.message ||
                err?.response?.data ||
                err?.reason ||
                err?.message ||
                "알 수 없는 오류"
                }`,
                {
                    position: "top-center",
                    autoClose: 5000,
                }
            );

            // 상세 JSON 팝업 (개발 중 디버깅용)
            if (err?.response?.data) {
                alert(JSON.stringify(err.response.data, null, 2));
            }
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
