// 체인 모듈 집합 

import { Module } from "@nestjs/common";
import { Erc1155Service } from "./erc1155.service";
import { PaymentContractService } from "./payment-contract.service";

// common/blockchain/blockchain.module.ts
@Module({
    providers: [Erc1155Service, PaymentContractService],
    exports: [Erc1155Service, PaymentContractService],
})
export class BlockchainModule { }