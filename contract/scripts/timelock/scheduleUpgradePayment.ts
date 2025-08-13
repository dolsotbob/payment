// .env에 NEW_IMPL_PAYMENT=, SALT_UPGRADE= 값 설정하기 
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { ethers } from "hardhat";
import { Interface } from "ethers";
import { timelock, selector, zeroBytes32, saltHash, buildOpId } from "./helpers";

async function main() {
    const TL = process.env.TIMELOCK_ADDRESS!;
    const PROXY = process.env.PAYMENT_ADDRESS!;  // 프록시 주소 
    const NEW_IMPL = process.env.NEW_IMPL_PAYMENT!;  // 새 구현 컨트랙트 주소(검증/배포 완료)
    const SALT = process.env.SALT_UPGRADE!;
    if (!SALT) throw new Error("SALT_UPGRADE is required in .env");

    // UUPS 업그레이드 함수 미니 ABI 
    const uupsIface = new Interface([
        "function upgradeTo(address newImplementation)",
    ]);

    // upgradeTo(newImpl) 호출 데이터 
    const data = selector(uupsIface, "upgradeTo", [NEW_IMPL]);

    // Timelock 핸들 & 파라미터  
    const tl = await timelock();  // BaseContract로 안전 
    const predecessor = zeroBytes32();
    const saltBytes32 = saltHash(SALT);
    const value = 0n;  // ethers v6 BigInt 사용 권장 

    // 참고용 operationId(오프체인 계산)
    const opId = buildOpId(PROXY, value, data, predecessor, SALT);

    // 실제 지연 시간은 timelock가 들고 있는 현재 값 사용 
    const minDelay = await (tl as any).getMinDelay();

    console.log("Timelock:", TL);
    console.log("Proxy   :", PROXY);
    console.log("New Impl:", NEW_IMPL);
    console.log("OpId    :", opId);
    console.log("minDelay:", minDelay.toString());

    // 스케줄
    const tx = await (tl as any).schedule(PROXY, value, data, predecessor, saltBytes32, minDelay);
    await tx.wait();
    console.log("✅ scheduled upgradeTo. Execute after minDelay.");

    // 스케줄 직후 ETA 확인 (0이면 예약이 기록되지 않은 것)
    const ETA = await (tl as any).getTimestamp(opId);
    console.log("ETA right after schedule:", ETA.toString());
    if (ETA === 0n) {
        throw new Error("❌ ETA=0 → 예약이 Timelock에 기록되지 않음 (.env 경로/주소/파라미터 확인 필요)");
    }

    console.log("✅ Scheduled correctly. Execute after minDelay.");
}

main().catch((e) => { console.error(e); process.exit(1); });

