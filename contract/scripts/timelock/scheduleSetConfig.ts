import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { ethers } from "hardhat";
import {
    timelock,
    selector,
    zeroBytes32,
    saltHash,
    buildOpId,
} from "./helpers";

async function main() {
    const PROXY = process.env.PAYMENT_ADDRESS!;
    const SALT = process.env.SALT_SETCONFIG || "payment-setconfig";

    // setConfig 인코딩
    const payment = await ethers.getContractAt("Payment", PROXY);
    const args = [
        process.env.SETCONFIG_TOKEN!,
        process.env.SETCONFIG_VAULT!,
        Number(process.env.SETCONFIG_CASHBACK_BPS!),
        Number(process.env.SETCONFIG_MAXDISCOUNT_BPS!),
    ] as const;
    const data = selector(payment.interface, "setConfig", args);

    // Timelock 파라미터
    const tl = await timelock();                 // BaseContract
    const predecessor = zeroBytes32();
    const saltBytes32 = saltHash(SALT);
    const value = 0n;

    // 참고용 opId
    const opId = buildOpId(PROXY, value, data, predecessor, SALT);
    console.log({ PROXY, opId });

    const minDelay = await (tl as any).getMinDelay();
    const tx = await (tl as any).schedule(PROXY, value, data, predecessor, saltBytes32, minDelay);
    await tx.wait();
    console.log("✅ scheduled setConfig");
}

main().catch((e) => { console.error(e); process.exit(1); });