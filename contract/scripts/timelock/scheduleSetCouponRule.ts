import { ethers } from "hardhat";
import "dotenv/config";
import {
    timelock,
    selector,
    zeroBytes32,
    saltHash,
    buildOpId,
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

    const tl = await timelock(); // BaseContract 반환
    const predecessor = zeroBytes32();
    const saltBytes32 = saltHash(SALT);
    const value = 0n;

    // 참고용 operationId (오프체인 계산)
    const opId = buildOpId(PROXY, value, data, predecessor, SALT);
    console.log({ PROXY, opId });

    const minDelay = await (tl as any).getMinDelay();
    console.log("Scheduling setCouponRule...");
    const tx = await (tl as any).schedule(PROXY, value, data, predecessor, saltBytes32, minDelay);
    await tx.wait();
    console.log("✅ scheduled setCouponRule");
}

main().catch((e) => { console.error(e); process.exit(1); });