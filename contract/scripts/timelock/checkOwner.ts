// scripts/timelock/checkOwner.ts
import path from "path"; import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
import { ethers } from "hardhat";
async function main() {
    const PROXY = process.env.PAYMENT_ADDRESS!;
    const TL = process.env.TIMELOCK_ADDRESS!;
    const payment = await ethers.getContractAt("Payment", PROXY);
    const owner = await payment.owner();
    console.log({ owner, TL, ownerIsTimelock: owner.toLowerCase() === TL.toLowerCase() });
}
main().catch(e => { console.error(e); process.exit(1); });