import { ethers } from "ethers";
import * as dotenv from "dotenv";
dotenv.config();

const {
    RPC_URL,
    PRIVATE_KEY,
    COUPON1155_ADDRESS,
    RECIPIENT,
    COUPON1155_TRANSFER_IDS,
    COUPON1155_TRANSFER_AMOUNT,
} = process.env as Record<string, string>;

const ERC1155_ABI = [
    "function safeBatchTransferFrom(address from,address to,uint256[] ids,uint256[] amounts,bytes data)",
    "function balanceOf(address account,uint256 id) view returns (uint256)",
];

async function main() {
    if (!RPC_URL || !PRIVATE_KEY || !COUPON1155_ADDRESS || !RECIPIENT) {
        throw new Error("Missing env vars");
    }

    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
    const contract = new ethers.Contract(COUPON1155_ADDRESS, ERC1155_ABI, wallet);

    const from = await wallet.getAddress();

    // .env에서 CSV 파싱
    const ids = (COUPON1155_TRANSFER_IDS ?? "")
        .split(",")
        .map((s) => BigInt(s.trim()));
    const amounts = (COUPON1155_TRANSFER_AMOUNT ?? "")
        .split(",")
        .map((s) => BigInt(s.trim()));

    if (ids.length !== amounts.length) {
        throw new Error("IDs and amounts length mismatch");
    }

    console.log(`Transferring to ${RECIPIENT}`);
    console.log("ids:", ids);
    console.log("amounts:", amounts);

    const tx = await contract.safeBatchTransferFrom(from, RECIPIENT, ids, amounts, "0x");
    console.log("tx:", tx.hash);
    await tx.wait();

    // 확인용: 첫 번째 id 잔고 확인
    const bal = await contract.balanceOf(RECIPIENT, ids[0]);
    console.log(`Receiver balance of token ${ids[0]}:`, bal.toString());
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});