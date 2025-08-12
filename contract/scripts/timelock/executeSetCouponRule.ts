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
    const SALT = process.env.SALT_SETRULE || "payment-setrule";

    const payment = await ethers.getContractAt("Payment", PROXY);

    const rule = {
        nft: process.env.RULE_NFT!,
        id: Number(process.env.RULE_ID!),
        discountBps: Number(process.env.RULE_DISCOUNT_BPS!),
        expiresAt: Number(process.env.RULE_EXPIRES_AT!), // 0=무기한
        enabled: process.env.RULE_ENABLED! === "true",
        consumable: process.env.RULE_CONSUMABLE! === "true",
    };

    // setCouponRule(rule) 호출 데이터 인코딩
    const data = selector(payment.interface, "setCouponRule", [rule]);

    const tl = await timelock(); // BaseContract
    const predecessor = zeroBytes32();
    const saltBytes32 = saltHash(SALT);
    const value = 0n;

    // opId 계산 & 준비 상태 체크(권장)
    const opId = buildOpId(PROXY, value, data, predecessor, SALT);
    console.log("opId:", opId);
    try {
        const ready = await isReady(tl, opId);
        console.log("isReady:", ready);
        if (!ready) console.warn("⏳ Operation not ready (minDelay 미경과 등).");
    } catch (e) {
        console.warn("isReady check skipped:", (e as Error).message);
    }

    console.log("Executing setCouponRule...");
    const tx = await (tl as any).execute(PROXY, value, data, predecessor, saltBytes32);
    await tx.wait();
    console.log("✅ executed setCouponRule");
}

main().catch((e) => { console.error(e); process.exit(1); });