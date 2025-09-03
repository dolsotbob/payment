import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { Interface } from "ethers";
import { ethers } from 'hardhat';
import {
    timelock,
    selector,
    zeroBytes32,
    saltHash,
    isReady,
} from "./helpers";

function buildInitData(): string {
    const raw = process.env.INIT_SIG; // 기본값 넣지 않음!
    // 1) INIT_SIG가 없거나(undef) 비어있으면 → 초기화 없음(0x)
    if (!raw || raw.trim() === "") return "0x";

    const sig = raw.trim(); // e.g. "initializeV2(address,uint256)"
    const args = process.env.INIT_ARGS_JSON ? JSON.parse(process.env.INIT_ARGS_JSON) : [];

    // fnName 추출 (괄호 앞까지)
    const idx = sig.indexOf("(");
    const fnName = idx >= 0 ? sig.slice(0, idx) : sig;

    const iface = new Interface([`function ${sig}`]);
    return selector(iface, fnName, args);
}

const initPreview = (!process.env.INIT_SIG || process.env.INIT_SIG.trim() === "")
    ? "none (0x)"
    : `${process.env.INIT_SIG} ${process.env.INIT_ARGS_JSON || "[]"}`;
console.log("INIT    :", initPreview);

async function main() {
    const PROXY = process.env.PAYMENT_ADDRESS!;  // 프록시 주소 
    const NEW_IMPL = process.env.NEW_IMPL_PAYMENT!;  // 새 구현 컨트랙트 주소(검증/배포 완료)
    const SALT = process.env.SALT_UPGRADE!;
    if (!PROXY || !NEW_IMPL || !SALT) {
        throw new Error("Missing env. Required: PAYMENT_ADDRESS, NEW_IMPL_PAYMENT, SALT_UPGRADE");
    }

    // init data & upgradeToAndCall
    const initData = buildInitData();
    const uups = new Interface(["function upgradeToAndCall(address,bytes)"]);
    const callData = selector(uups, "upgradeToAndCall", [NEW_IMPL, initData]);

    const tl = await timelock();
    const predecessor = zeroBytes32();
    const saltB32 = saltHash(SALT);
    const value = 0n;  // ethers v6 BigInt 사용 권장 

    // opId
    const opId = await (tl as any).hashOperation(PROXY, value, callData, predecessor, saltB32);
    console.log("OpId    :", opId);

    // ETA(now)
    const ETA = await (tl as any).getTimestamp(opId);
    const now = (await ethers.provider.getBlock("latest"))!.timestamp;
    console.log("ETA:", ETA.toString(), " now:", now, " delta:", Number(ETA) - now);

    // 준비 상태 체크
    const ready = await isReady(tl, opId).catch(() => false);
    console.log("isReady:", ready);
    if (!ready) throw new Error("⏳ Operation not ready (ETA 미도달 / 파라미터 불일치 / 취소됨).");

    // 실행
    const tx = await (tl as any).execute(PROXY, value, callData, predecessor, saltB32);
    await tx.wait();
    console.log("✅ executed upgradeToAndCall");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});