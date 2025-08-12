import { ethers } from "hardhat";
import "dotenv/config";
import {
    timelock,
    selector,
    zeroBytes32,
    saltHash,
    buildOpId,
    isReady,
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

    const tl = await timelock();                 // BaseContract
    const predecessor = zeroBytes32();
    const saltBytes32 = saltHash(SALT);
    const value = 0n;

    // opId 계산 & 준비 상태 체크
    const opId = buildOpId(PROXY, value, data, predecessor, SALT);
    console.log("opId:", opId);
    try {
        const ready = await isReady(tl, opId);
        console.log("isReady:", ready);
        if (!ready) console.warn("⏳ Operation not ready (minDelay 미경과 등).");
    } catch (e) {
        console.warn("isReady check skipped:", (e as Error).message);
    }

    const tx = await (tl as any).execute(PROXY, value, data, predecessor, saltBytes32);
    await tx.wait();
    console.log("✅ executed setConfig");
}

main().catch((e) => { console.error(e); process.exit(1); });