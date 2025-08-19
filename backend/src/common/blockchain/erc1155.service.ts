import { Injectable } from '@nestjs/common';

@Injectable()
export class Erc1155Service {
    // TODO: wire up ethers Provider/Contract via constructor
    async balanceOfBatch(wallet: string, ids: number[]): Promise<string[]> {
        // return balances as decimal strings
        return ids.map(() => '0');
    }
    async uri(id: number): Promise<string> {
        return '';
    }
}