import axios from 'axios';
import type { AxiosError } from 'axios/index';

// 서버에 전송할 결제 정보 구조 
interface PaymentPayload {
    txHash: string;
    from: string;       // 유저 지갑 주쇼
    amount: string;     // 결제 금액 (wei 단위)
    cashbackAmount?: string;  // 캐시백 금액(wei 단위)
    status: 'SUCCESS' | 'FAILED';  // tx 결과 상태 
    gasUsed?: string;      // relayer가 사용한 가스 (uint): tx 수행에 실제로 사용된 가스 양
    gasCost?: string;      // relayer가 지불한 가스비 (wei): Relatyer가 실제로 낸 수수료 계산식: gasUsed * gasPrice 
    productId?: number;
}

function isAxiosError(error: any): error is AxiosError {
    return !!(error && error.isAxiosError);
}

export async function sendPaymentToBackend(payload: PaymentPayload) {
    try {
        const backendUrl = process.env.BACKEND_API_URL; // NestJS 서버 주소(Render에 배포)
        // const backendUrl = process.env.BACKEND_API_URL || 'http://localhost:3000'; // NestJS 서버 주소(로컬)
        const res = await axios.post(`${backendUrl}/payment`, payload);
        console.log('✅ 결제 기록 전송 완료:', res.data);
    } catch (error: any) {
        if (isAxiosError(error)) {
            console.error('❌ 결제 기록 전송 실패:', error.message);
            if (error.response) {
                console.error('📡 서버 응답:', error.response.status, error.response.data);
            }
        } else {
            console.error('❌ 알 수 없는 에러:', error);
        }
    }
}