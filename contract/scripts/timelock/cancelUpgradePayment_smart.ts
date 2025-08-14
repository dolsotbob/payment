import path from "path"; import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { ethers } from "hardhat";
import { Interface } from "ethers";
import { timelock, zeroBytes32, saltHash, selector } from "./helpers";

async function main() {
    const PROXY = process.env.PAYMENT_ADDRESS!;
    const NEW = process.env.NEW_IMPL_PAYMENT!;
    const SALT = process.env.SALT_UPGRADE!;
    if (!PROXY || !NEW || !SALT) throw new Error("Missing env");

    const tl = await timelock();
    const uups = new Interface(["function upgradeToAndCall(address,bytes)"]);
    const value = 0n;
    const pred = zeroBytes32();
    const saltB32 = saltHash(SALT);

    // 1) 현재(.env 기준) initData (수정된 buildInitData와 동일 로직)
    const raw = process.env.INIT_SIG;
    const initDataCurrent =
        (!raw || raw.trim() === "") ? "0x"
            : (() => {
                const sig = raw.trim();
                const args = process.env.INIT_ARGS_JSON ? JSON.parse(process.env.INIT_ARGS_JSON) : [];
                const idx = sig.indexOf("(");
                const fn = idx >= 0 ? sig.slice(0, idx) : sig;
                const i = new Interface([`function ${sig}`]);
                return selector(i, fn, args);
            })();

    // 2) 과거 “기본 initializeV2()”로 들어갔을 가능성 대비
    const initDataLegacy = selector(new Interface(["function initializeV2()"]), "initializeV2", []);

    // callData 각각
    const callDataCurrent = selector(uups, "upgradeToAndCall", [NEW, initDataCurrent]);
    const callDataLegacy = selector(uups, "upgradeToAndCall", [NEW, initDataLegacy]);

    // opId 각각
    const opIdCurrent = await (tl as any).hashOperation(PROXY, value, callDataCurrent, pred, saltB32);
    const opIdLegacy = await (tl as any).hashOperation(PROXY, value, callDataLegacy, pred, saltB32);

    const etaCur = await (tl as any).getTimestamp(opIdCurrent);
    const etaLeg = await (tl as any).getTimestamp(opIdLegacy);

    console.log("opIdCurrent ETA:", etaCur.toString());
    console.log("opIdLegacy  ETA:", etaLeg.toString());

    // 실제 기록된 쪽만 취소
    if (etaCur > 0n) {
        const tx = await (tl as any).cancel(opIdCurrent); await tx.wait();
        console.log("✅ canceled current-params op:", opIdCurrent);
    } else if (etaLeg > 0n) {
        const tx = await (tl as any).cancel(opIdLegacy); await tx.wait();
        console.log("✅ canceled legacy-init op:", opIdLegacy);
    } else {
        console.log("ℹ️ No scheduled op found under either encoding.");
    }
}
main().catch(e => { console.error(e); process.exit(1); });