import { ethers } from "hardhat";
import { Interface } from "ethers";
import 'dotenv/config';
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
    const SALT = process.env.SALT_UPGRADE || "payment-upgrade";

    // UUPS 업그레이드 함수 미니 ABI 
    const uupsIface = new Interface([
        "function upgradeTo(address newImplementation",
    ]);

    // upgradeTo(newImpl) 호출 데이터 
    const data = selector(uupsIface, "upgradeTo", [NEW_IMPL]);

    // Timelock 핸들 & 파라미터  
    const tl = await timelock();  // BaseContract 
    const predecessor = zeroBytes32();
    const saltBytes32 = saltHash(SALT);
    const value = 0n;  // ethers v6 BigInt 사용 권장 

    // 오퍼레이션 ID 계산 & 준비 상태 체크 (권장)
    const opId = buildOpId(PROXY, value, data, predecessor, SALT);
    console.log("OpId    :", opId);

    try {
        const ready = await isReady(tl, opId);
        console.log("isReady:", ready);
        if (!ready) {
            console.warn("⏳ Operation not ready yet (minDelay 미경과 or 조건 미충족).");
        }
    } catch (e) {
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