// 결제 로직 + 쿠폰 연동 (쿠폰 할인은 현재 비활성화)
// [쿠폰 할인 재활성화 시 이 주석 제거] 라벨이 붙은 부분을 복구하면 기존 쿠폰 로직을 살릴 수 있습니다.

import React, { useEffect, useState } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { buildPermitCallData } from '../utils/permit';
import { sendPaymentToBackend, PaymentStatus } from '../utils/payment';
import PaymentJson from '../abis/Payment.json';
import TestTokenJson from '../abis/TestToken.json';
import './css/PayButton.css';

import type { OwnedCoupon } from '../types/couponTypes';

// ===== 쿠폰 검증/적용 훅 비활성화 =====
// [쿠폰 할인 재활성화 시 이 주석 제거]: 아래 두 import를 다시 활성화
// import { useValidateCouponMutation } from '../hooks/mutations/useValidateCouponMutation';
// import { useApplyCouponMutation } from '../hooks/mutations/useApplyCouponMutations';

import { useAuth } from "../context/AuthContext";
import { decodePaymentError } from '../utils/decodeError';

interface PayButtonProps {
    account: string;    // 유저 주소
    amount: string;    // 최종가(할인 후) wei  
    productId: number | string;
    selectedCoupon: OwnedCoupon | null;  // UI에서만 선택 표시 (미적용)
    originalPriceWei?: string;  // 원가(할인 전) wei 
    onSuccess: () => void;
    onCancel: () => void;
}

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

const PayButton: React.FC<PayButtonProps> = ({
    account,
    amount,
    productId,
    selectedCoupon,
    originalPriceWei,
    onSuccess,
    onCancel,
}) => {
    useEffect(() => {
        console.log('[PayButton] props ▶', {
            selectedCoupon,
            hasEnvCoupon: !!process.env.REACT_APP_COUPON1155_ADDRESS,
        });
    }, [selectedCoupon]);

    const [paying, setPaying] = useState(false);
    const { accessToken } = useAuth();

    // ===== 쿠폰 훅 비활성화 =====
    // [쿠폰 할인 재활성화 시 이 주석 제거]: 아래 두 줄 복구
    // 쿠폰 훅 - 검증/적용 훅에 accessToken 인자 전달
    // const { mutateAsync: validateCoupon, isPending: validating } = useValidateCouponMutation(accessToken ?? null);
    // const { mutateAsync: applyCouponUse, isPending: applying } = useApplyCouponMutation(accessToken ?? null);

    // 현재는 결제 버튼은 결제 진행 여부만으로 비활성화
    const disabled = paying; // [쿠폰 할인 재활성화 시 이 주석 제거]: validating/applying을 다시 합치세요 (e.g., paying || validating || applying)


    const handlePay = async () => {
        try {
            if (!window.ethereum) {
                toast.error('🦊 MetaMask가 설치되어 있지 않습니다.');
                return;
            }
            // wei 문자열은 BigInt로 검증
            try {
                if (BigInt(amount) <= 0n) {
                    toast.error('💸 유효한 결제 금액이 없습니다.');
                    return;
                }
            } catch {
                toast.error('💸 금액 형식이 올바르지 않습니다.');
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

            // ===== (선택) 쿠폰 사전 검증 비활성화 =====
            // [쿠폰 할인 재활성화 시 이 주석 제거]: 아래 블록을 복구해 사전 검증을 실행
            // 1) (선택) 쿠폰 사전 검증 
            // if (selectedCoupon) {
            //     const res = await validateCoupon({
            //         couponId: Number(selectedCoupon.id),
            //         productId: String(productId ?? ''),
            //     });
            //     if (!res.ok) {
            //         toast.error(`쿠폰 사용 불가: ${res.reason ?? '알 수 없는 사유'}`);
            //         return;
            //     }
            // }

            // 2) 결제 트랜잭션 실행 
            // provider, signer 준비 
            const provider = new ethers.BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();

            // 컨트랙트 객체 생성  
            const token = new ethers.Contract(tokenAddress, TestTokenJson.abi, provider);
            const payment = new ethers.Contract(paymentAddress, PaymentJson.abi, signer);

            // priceBN=원가, valueBN=최종가(허용치; 현재는 원가와 동일하게 전달됨)
            const priceBN = BigInt(originalPriceWei ?? amount);
            const valueBN = BigInt(amount);

            // ===== 쿠폰 파라미터 완전 비활성화 =====
            // 선택한 쿠폰이 있어도 온체인 결제에는 전달하지 않습니다.
            const useCoupon = false;                          // [쿠폰 할인 재활성화 시 이 라인 삭제]
            const couponNftAddress = ZERO_ADDRESS;            // [쿠폰 할인 재활성화 시 이 라인 삭제]
            const couponId = 0n;                              // [쿠폰 할인 재활성화 시 이 라인 삭제]

            // [쿠폰 할인 재활성화 시 이 주석 제거]:
            // const useCoupon = !!selectedCoupon;
            // const couponNftAddress = useCoupon ? (coupon1155Address as string) : ZERO_ADDRESS;
            // const couponId = useCoupon ? BigInt(Number(selectedCoupon!.id)) : 0n;

            console.log('[pay-args]', {
                priceBN: priceBN.toString(),
                valueBN: valueBN.toString(),
                couponNftAddress,
                couponId: couponId.toString(),
                useCoupon,
            });

            // Permit 서명 데이터 생성 (메타마스크 서명 팝업)
            const { v, r, s, deadline } = await buildPermitCallData(
                token,
                payment,
                signer,
                account,
                valueBN.toString(), // 최종가(wei) 정확히 전달 
            );

            // 결제 트랜잭션 실행 
            // 1) callStatic으로 시뮬레이션 
            try {
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
                priceBN,  // 원가 
                couponNftAddress, // ZERO
                couponId,    // 0
                useCoupon   // false 
            );
            const receipt = await tx.wait();

            // 3) 캐시백 금액 계산
            let cashbackAmount = '0';
            try {
                const cashbackBps: bigint = await payment.cashbackBps();
                // bps(200 = 2%) → 정수 나눗셈
                const cashbackWei = (valueBN * cashbackBps) / 10_000n;
                cashbackAmount = ethers.formatUnits(cashbackWei, 18);
            } catch (err) {
                console.warn('⚠️ 캐시백 비율 조회 실패:', err);
            }

            // 4) 백엔드 전송 — 할인값은 강제로 0으로 기록(유틸에서 다시 한 번 0으로 덮습니다)
            const originalWei = priceBN;
            const finalWei = valueBN;

            // [쿠폰 할인 재활성화 시 이 라인 삭제]: 프론트 계산을 무시하고 항상 0
            const discountWei = 0n;

            // [쿠폰 할인 재활성화 시 이 주석 제거]:
            // const discountWei = originalWei > finalWei ? (originalWei - finalWei) : 0n;

            const paymentRes = await sendPaymentToBackend({
                txHash: receipt.hash,
                originalPrice: originalWei.toString(),
                discountAmount: discountWei.toString(),     // 유틸에서 최종적으로 '0'으로 강제됨
                discountedPrice: finalWei.toString(),       // 유틸에서 originalPrice로 강제됨
                status: PaymentStatus.SUCCESS,
                userAddress: account,
                cashbackAmountWei: ethers.parseUnits(cashbackAmount, 18).toString(),
                productId: String(productId),
                gasUsed: receipt.gasUsed,
                gasPrice: receipt.effectiveGasPrice,
            });

            // paymentId 확보 (id가 없으면 txHash로 대체)
            const paymentId = String(paymentRes?.id ?? receipt.hash);

            // ===== 쿠폰 사용 기록 생성 비활성화 =====
            // [쿠폰 할인 재활성화 시 이 주석 제거]: 아래 블록을 복구
            // 5) (선택) 쿠폰 사용 기록 생성
            // if (selectedCoupon) {
            //     await applyCouponUse({
            //         couponId: Number(selectedCoupon.id),
            //         paymentId, // 문자열로 전달
            //         // amount나 orderUsdTotal을 정책에 맞게 추가 가능
            //     });
            //     // onSuccess 내부에서 쿠폰 목록은 invalidate되어 최신화됩니다.
            // }

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
                { position: "top-center", autoClose: 5000 }
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
