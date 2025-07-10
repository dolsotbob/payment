import { Wallet, TypedDataDomain, TypedDataField } from 'ethers';

/**
 * v 값이 27 또는 28이 되도록 보정해주는 함수
 */
function fixV(signature: string): string {
    const r = signature.slice(2, 66);
    const s = signature.slice(66, 130);
    let v = parseInt(signature.slice(130, 132), 16);

    // v 값이 0 또는 1일 경우 27 또는 28로 보정
    if (v < 27) {
        v += 27;
    }

    // 보정된 서명 반환
    return '0x' + r + s + v.toString(16).padStart(2, '0');
}

/**
 * EIP712 TypedData 서명 + v 보정 포함
 */
export async function signTypedData(
    wallet: Wallet,
    domain: TypedDataDomain,
    types: Record<string, TypedDataField[]>,
    message: Record<string, any>
): Promise<string> {
    const rawSignature = await wallet.signTypedData(domain, types, message);
    const fixedSignature = fixV(rawSignature);
    return fixedSignature;
}