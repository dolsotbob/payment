// relayer-server/utils/types.ts
// frontend/src/utils/request.ts의 것과 같음 
import { Contract, BaseContract, ContractTransactionResponse } from 'ethers';

// 프론트/백엔드에서 공통으로 쓰는 메타트랜잭션 요청 구조
export interface SignedForwarderRequest {
    from: string;
    to: string;
    value: string;
    gas: string;
    deadline: string;
    data: string;
    nonce: string;
    signature: string;
}

// Forwarder 컨트랙트 타입 (verify() 함수 포함)
export interface ForwarderWithVerify extends BaseContract {
    verify: (
        req: SignedForwarderRequest,
        signature: string
    ) => Promise<boolean>;

    execute: (
        req: SignedForwarderRequest,
        signature: string,
        overrides?: { gasLimit?: bigint }
    ) => Promise<ContractTransactionResponse>;
}