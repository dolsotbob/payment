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
    const SALT = process.env.SALT_DISABLERULE || "payment-disrule";

    const payment = await ethers.getContractAt("Payment", PROXY);

    const nft = process.env.DISABLE_NFT!;
    const id = Number(process.env.DISABLE_ID!);

    // disableCouponRule(nft, id) 호출 데이터
    const data = selector(payment.interface, "disableCouponRule", [nft, id]);

    const tl = await timelock(); // BaseContract
    const predecessor = zeroBytes32();
    const saltBytes32 = saltHash(SALT);
    const value = 0n;

    const opId = buildOpId(PROXY, value, data, predecessor, SALT);
    console.log("opId:", opId);

    try {
        const ready = await isReady(tl, opId);
        console.log("isReady:", ready);
        if (!ready) console.warn("⏳ Operation not ready (minDelay 미경과 등).");
    } catch (e) {
        console.warn("isReady check skipped:", (e as Error).message);
    }

    console.log("Executing disableCouponRule...");
    const tx = await (tl as any).execute(PROXY, value, data, predecessor, saltBytes32);
    await tx.wait();
    console.log("✅ executed disableCouponRule");
}

main().catch((e) => { console.error(e); process.exit(1); });