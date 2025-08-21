// 체인 어댑터 
import { Injectable, OnModuleInit } from '@nestjs/common';
import { ethers } from 'ethers';
import dotenv from 'dotenv'

dotenv.config();

const ERC1155_ABI = [
    // balanceOf(address account, uint256 id) → uint256
    'function balanceOf(address account, uint256 id) view returns (uint256)',
    // balanceOfBatch(address[] accounts, uint256[] ids) → uint256[]
    'function balanceOfBatch(address[] accounts, uint256[] ids) view returns (uint256[])',
    // uri(uint256 id) → string
    'function uri(uint256 id) view returns (string)',
];

@Injectable()
export class Erc1155Service implements OnModuleInit {
    private provider!: ethers.JsonRpcProvider;
    private contract!: ethers.Contract;

    onModuleInit() {
        const rpcUrl = process.env.RPC_URL;
        const contractAddress = process.env.COUPON1155_ADDRESS;

        if (!rpcUrl) throw new Error('Chain RPC_URL is not set');
        if (!contractAddress) throw new Error('COUPON1155_ADDRESS is not set');

        this.provider = new ethers.JsonRpcProvider(rpcUrl);
        this.contract = new ethers.Contract(contractAddress, ERC1155_ABI, this.provider);
    }

    /**
     * ERC1155 표준의 balanceOfBatch는 (accounts[], ids[])를 받습니다.
     * 같은 주소의 여러 토큰 잔고가 필요하므로 address 배열을 같은 길이만큼 채워 보냅니다.
     * 문자열 배열로 반환(직렬화 호환성).
     */
    async balanceOfBatch(address: string, ids: number[]): Promise<string[]> {
        if (!ids.length) return [];
        const addr = (address ?? '').toLowerCase();
        const accounts = Array(ids.length).fill(addr);
        const balances: bigint[] = await this.contract.balanceOfBatch(accounts, ids);
        return balances.map((b) => b.toString());
    }

    /** 편의용 단일 잔고 */
    async balanceOf(address: string, id: number): Promise<bigint> {
        const addr = (address ?? '').toLowerCase();
        const raw: bigint = await this.contract.balanceOf(addr, id);
        return raw;
    }

    /** 토큰 메타데이터 URI */
    async uri(id: number): Promise<string> {
        const u: string = await this.contract.uri(id);
        return u;
    }
}