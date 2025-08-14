import path from "path"; import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

async function main() {
    const PROXY = process.env.PAYMENT_ADDRESS!;
    const implSlot = BigInt(keccak256(toUtf8Bytes("eip1967.proxy.implementation"))) - 1n;
    const adminSlot = BigInt(keccak256(toUtf8Bytes("eip1967.proxy.admin"))) - 1n;

    const implRaw = await ethers.provider.getStorage(PROXY, implSlot);
    const adminRaw = await ethers.provider.getStorage(PROXY, adminSlot);

    // 32바이트 중 마지막 20바이트가 주소
    const toAddr = (raw: string) =>
        ethers.getAddress("0x" + raw.slice(26)); // 0x + 12바이트 패딩 제거

    const impl = toAddr(implRaw);
    const admin = toAddr(adminRaw);

    console.log({ proxy: PROXY, implementation: impl, admin });
    console.log("transparent? (admin != 0x000...0):", admin !== ethers.ZeroAddress);
}
main().catch(e => { console.error(e); process.exit(1); });