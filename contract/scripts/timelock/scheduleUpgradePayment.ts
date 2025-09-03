// scripts/timelock/scheduleUpgradePayment.ts
// 업그레이드 + 초기화를 한 번에: upgradeToAndCall(newImpl, initData)
// .env에 NEW_IMPL_PAYMENT=, SALT_UPGRADE= 값 설정하기 
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { ethers } from "hardhat";
import { Interface } from "ethers";
import { timelock, selector, zeroBytes32, saltHash } from "./helpers";

// 업그레이드 직후 실행할 초기화 함수 호출 데이터(calldata)를 만드는 함수 
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
    const TL = process.env.TIMELOCK_ADDRESS!;
    const PROXY = process.env.PAYMENT_ADDRESS!;  // 프록시 주소 
    const NEW_IMPL = process.env.NEW_IMPL_PAYMENT!;  // 새 구현 컨트랙트 주소(검증/배포 완료)
    const SALT = process.env.SALT_UPGRADE!;
    if (!TL || !PROXY || !NEW_IMPL || !SALT) {
        throw new Error("Missing env. Required: TIMELOCK_ADDRESS, PAYMENT_ADDRESS, NEW_IMPL_PAYMENT, SALT_UPGRADE");
    }

    // 1) init calldata 준비
    const initData = buildInitData();

    // 2) UUPS: upgradeToAndCall(newImpl, initData)
    const uups = new Interface(["function upgradeToAndCall(address newImplementation, bytes data)"]);
    const callData = selector(uups, "upgradeToAndCall", [NEW_IMPL, initData]);

    // 3) Timelock 파라미터  
    const tl = await timelock();  // BaseContract로 안전 
    const predecessor = zeroBytes32();
    const saltB32 = saltHash(SALT);
    const value = 0n;  // ethers v6 BigInt 사용 권장 

    // 온체인 기준 opId
    const opId = await (tl as any).hashOperation(PROXY, value, callData, predecessor, saltB32);
    const minDelay = await (tl as any).getMinDelay();

    console.log("Timelock:", TL);
    console.log("Proxy   :", PROXY);
    console.log("New Impl:", NEW_IMPL);
    console.log("SALT    :", SALT);
    console.log("INIT_SIG:", process.env.INIT_SIG || "(default initializeV2())");
    console.log("INIT_ARGS_JSON:", process.env.INIT_ARGS_JSON || "[]");
    console.log("OpId    :", opId);
    console.log("minDelay:", minDelay.toString());

    // 이미 같은 opId가 스케줄되어 있나 확인
    const beforeETA = await (tl as any).getTimestamp(opId);
    console.log("ETA before schedule:", beforeETA.toString());
    if (beforeETA > 0n) {
        const now = (await ethers.provider.getBlock("latest"))!.timestamp;
        console.log(`ℹ️ already scheduled: ETA=${beforeETA.toString()} delta=${Number(beforeETA) - now}`);
        return;
    }

    // 4) 스케줄
    const tx = await (tl as any).schedule(PROXY, value, callData, predecessor, saltB32, minDelay);
    const rc = await tx.wait();
    console.log("receipt.status:", rc?.status, "tx:", rc?.hash);

    // 이벤트 확인
    const CALL_SCHEDULED = ethers.id("CallScheduled(bytes32,uint256,address,uint256,bytes,bytes32,uint256)");
    const logs = rc?.logs?.filter((l: any) => l.topics?.[0] === CALL_SCHEDULED) ?? [];
    console.log("CallScheduled logs:", logs.length);
    if (logs.length > 0) console.log("opIdFromEvent:", logs[0].topics[1]);

    // 스케줄 직후 ETA/상태
    const ETA = await (tl as any).getTimestamp(opId);
    console.log("ETA right after schedule:", ETA.toString());
    const pending = await (tl as any).isOperationPending?.(opId).catch(() => null);
    const ready = await (tl as any).isOperationReady?.(opId).catch(() => null);
    const done = await (tl as any).isOperationDone?.(opId).catch(() => null);
    console.log("state after schedule =>", { pending, ready, done });

    if (ETA === 0n) {
        throw new Error("❌ ETA=0 → 예약이 Timelock에 기록되지 않음 (.env/권한/파라미터 확인)");
    }
    console.log("✅ Scheduled upgradeToAndCall. Execute after minDelay.");
}

main().catch((e) => { console.error(e); process.exit(1); });

