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

    // 참고용 opId
    const opId = buildOpId(PROXY, value, data, predecessor, SALT);
    console.log({ PROXY, nft, id, opId });

    const minDelay = await (tl as any).getMinDelay();
    console.log("Scheduling disableCouponRule...");
    const tx = await (tl as any).schedule(PROXY, value, data, predecessor, saltBytes32, minDelay);
    await tx.wait();
    console.log("✅ scheduled disableCouponRule");
}

main().catch((e) => { console.error(e); process.exit(1); });