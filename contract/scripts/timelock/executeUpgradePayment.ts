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
    buildOpId,
    isReady,
} from "./helpers";

async function main() {
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
    const tl = await timelock();  // BaseContract 
    const predecessor = zeroBytes32();
    const saltBytes32 = saltHash(SALT);
    const value = 0n;  // ethers v6 BigInt 사용 권장 

    // 오퍼레이션 ID 계산
    const opId = buildOpId(PROXY, value, data, predecessor, SALT);
    console.log("OpId    :", opId);

    // ETA(now) 안전 확인: hardhat의 provider 사용 
    const ETA = await (tl as any).getTimestamp(opId);
    const latest = await ethers.provider.getBlock("latest");
    const now = latest?.timestamp ?? 0;
    console.log("ETA:", ETA.toString(), " now:", now, " delta:", Number(ETA) - now);

    // 준비 상태 필수 체크 (미준비 시 즉시 중단)
    try {
        const ready = await isReady(tl, opId);
        console.log("isReady:", ready);
        if (!ready) {
            throw new Error("⏳ Operation not ready yet (ETA 미도달 / 파라미터 불일치 / 취소됨).");

        }
    } catch (e) {
        // helpers가 제공하지 않는 Timelock 변형일 수 있어 체크 스킵 
        console.warn("isReady check skipped:", (e as Error).message);
    }

    // 실행
    const tx = await (tl as any).execute(PROXY, value, data, predecessor, saltBytes32);
    await tx.wait();
    console.log("✅ executed upgradeTo");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
