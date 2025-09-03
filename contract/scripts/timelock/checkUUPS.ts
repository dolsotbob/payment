// scripts/timelock/checkUUPS.ts
import path from "path"; import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

async function main() {
    const PROXY = process.env.PAYMENT_ADDRESS!;
    const NEW = process.env.NEW_IMPL_PAYMENT!;

    const implSlot = BigInt(keccak256(toUtf8Bytes("eip1967.proxy.implementation"))) - 1n;
    const implRaw = await ethers.provider.getStorage(PROXY, implSlot);
    const curImpl = ethers.getAddress("0x" + implRaw.slice(26));
    console.log({ PROXY, curImpl, NEW });

    const i = new ethers.Interface(["function proxiableUUID() view returns (bytes32)"]);
    const cur = new ethers.Contract(curImpl, i, (await ethers.getSigners())[0]);
    const nxt = new ethers.Contract(NEW, i, (await ethers.getSigners())[0]);

    try { console.log("current proxiableUUID:", await cur.proxiableUUID()); }
    catch { console.error("❌ current implementation is NOT UUPS (no proxiableUUID / reverted)"); }

    try { console.log("new     proxiableUUID:", await nxt.proxiableUUID()); }
    catch { console.error("❌ NEW_IMPL is NOT UUPS-compatible (no proxiableUUID / reverted)"); }
}
main().catch(e => { console.error(e); process.exit(1); });
