// scripts/timelock/executeWithdraw.ts
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

    const target = await (vault as any).getAddress();
    const value = 0;
    const data = vault.interface.encodeFunctionData("withdraw", [WITHDRAW_RECIPIENT, amount]);
    const predecessor = ethers.ZeroHash;
    const saltHash = ethers.id(SALT);

    // 실행 전 필수 준비 상태 점검
    const opId = await timelock.hashOperation(target, value, data, predecessor, saltHash);
    const ready = await timelock.isOperationReady(opId);
    console.log(`Operation ID: ${opId}`);
    console.log(`Ready?: ${ready}`);
    if (!ready) {
        throw new Error(
            "Operation is not ready. Check minDelay or confirm schedule parameters match."
        );
    }

    console.log(
        `⏳ execute withdraw: to=${WITHDRAW_RECIPIENT}, amount=${AMOUNT} (dec=${decimalsNum}), salt=${SALT}`
    );
    const tx = await timelock.execute(target, value, data, predecessor, saltHash);
    await tx.wait();
    console.log("✅ executed");
}

main().catch((e) => { console.error(e); process.exitCode = 1; });
