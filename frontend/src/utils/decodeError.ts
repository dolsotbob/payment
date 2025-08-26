// src/utils/decodeError.ts
import { Interface } from "ethers";
import PaymentJson from "../abis/Payment.json";

const paymentIface = new Interface(PaymentJson.abi);

export function decodePaymentError(e: any): string {
    const data = e?.data ?? e?.error?.data;
    if (!data) return "시뮬 리버트(데이터 없음)";

    try {
        const decoded = paymentIface.parseError(data);
        console.warn("[decoded revert]", decoded?.name, decoded?.args);
        return decoded?.name ?? "알 수 없는 오류";
    } catch {
        console.warn("[raw revert data]", data);
        return "시뮬 리버트(원인 미상)";
    }
}