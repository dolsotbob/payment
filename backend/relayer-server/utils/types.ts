// relayer-server/utils/types.ts
// frontend/src/utils/request.ts의 것과 같음 

export interface SignedForwardRequest {
    from: string;
    to: string;
    value: string;
    gas: string;
    deadline: string;
    data: string;
    nonce: string;
    signature: string;
}