import { ethers } from "hardhat";
import "dotenv/config";

async function main() {
    const { TIMELOCK_ADDRESS, VAULT_ADDRESS, WITHDRAW_RECIPIENT, AMOUNT, SALT, DECIMALS } = process.env;

    if (!TIMELOCK_ADDRESS || !VAULT_ADDRESS) throw new Error("Set TIMELOCK_ADDRESS & VAULT_ADDRESS in .env");
    if (!WITHDRAW_RECIPIENT || !AMOUNT || !SALT) throw new Error("Set WITHDRAW_RECIPIENT, AMOUNT, SALT env vars");
    if (!ethers.isAddress(WITHDRAW_RECIPIENT)) throw new Error(`Invalid recipient: ${WITHDRAW_RECIPIENT}`);

    const decimalsNum = Number(DECIMALS ?? "18");
    if (!Number.isInteger(decimalsNum) || decimalsNum < 0) throw new Error(`Invalid DECIMALS: ${DECIMALS}`);

    const amount =
        decimalsNum === 0 ? BigInt(AMOUNT) : ethers.parseUnits(AMOUNT, decimalsNum);
    if (amount <= 0n) throw new Error(`AMOUNT must be > 0: ${AMOUNT}`);

    const timelock = await ethers.getContractAt("TimelockController", TIMELOCK_ADDRESS);
    const vault = await ethers.getContractAt("VaultV3", VAULT_ADDRESS);

    const target = await (vault as any).getAddress();   // 안전하게 await
    const value = 0;
    const data = vault.interface.encodeFunctionData("withdraw", [WITHDRAW_RECIPIENT, amount]);
    const predecessor = ethers.ZeroHash;
    const saltHash = ethers.id(SALT);

    // 중복/충돌 방지: 사전에 같은 파라미터로 잡혀 있는지 확인
    const opId = await timelock.hashOperation(target, value, data, predecessor, saltHash);
    const ts = await timelock.getTimestamp(opId); // 0이면 미설정, >0이면 예약됨, 1이면 DONE

    if (ts !== 0n) {
        // 이미 예약(pending/ready)되었거나 완료된 오퍼레이션
        console.log(`⚠️ Already scheduled or done. opId=${opId}, timestamp=${ts}`);
        // 필요 시 throw로 막거나, 조용히 return
        throw new Error("Operation already scheduled or executed with the same params/salt.");
    }

    const minDelay = await timelock.getMinDelay();
    console.log(`⏳ schedule withdraw: to=${WITHDRAW_RECIPIENT}, amount=${AMOUNT} (dec=${decimalsNum}), salt=${SALT}`);

    const tx = await timelock.schedule(target, value, data, predecessor, saltHash, minDelay);
    await tx.wait();
    console.log("✅ scheduled");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });

// # 아래 4개는 실행마다 .env에 설정 확인 
// WITHDRAW_RECIPIENT=0x72c319a949e5e23095fF6bc21A0d48c94E40A42f
// AMOUNT=10
// SALT=withdraw-aug08-1
// DECIMALS=18
