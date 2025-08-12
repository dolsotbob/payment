// .env에 NEW_IMPL_PAYMENT=, SALT_UPGRADE= 값 설정하기 

import { ethers } from "hardhat";
import { Interface } from "ethers";
import 'dotenv/config';
import { timelock, selector, zeroBytes32, saltHash, buildOpId } from "./helpers";

async function main() {
    const TL = process.env.TIMELOCK_ADDRESS!;
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
    const tl = await timelock();  // BaseContract로 안전 
    const predecessor = zeroBytes32();
    const saltBytes32 = saltHash(SALT);
    const value = 0n;  // ethers v6 BigInt 사용 권장 
    const minDelay = await (tl as any).getMinDelay();

    // 참고용 operationId(오프체인 계산)
    const opId = buildOpId(PROXY, value, data, predecessor, SALT);
    console.log("Timelock:", TL);
    console.log("Proxy   :", PROXY);
    console.log("New Impl:", NEW_IMPL);
    console.log("OpId    :", opId);

    // 스케줄
    const tx = await (tl as any).schedule(PROXY, value, data, predecessor, saltBytes32, minDelay);
    await tx.wait();
    console.log("✅ scheduled upgradeTo");
}

main().catch((e) => { console.error(e); process.exit(1); });