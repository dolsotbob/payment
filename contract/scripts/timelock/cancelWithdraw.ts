// scripts/timelock/cancelWithdraw.ts
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { ethers } from "hardhat";

async function main() {
    const args = process.argv.slice(2); // 인자 추출
    console.log(process.argv);

    if (args.length < 2) {
        console.error("❗ 사용법: npx hardhat run cancelWithdraw.ts --network <network> <recipient> <amount>");
        process.exit(1);
    }

    const [recipient, amountStr] = args;
    const amount = ethers.parseUnits(amountStr, 18);

    const timelock = await ethers.getContractAt(
        "TimelockController",
        process.env.TIMELOCK_ADDRESS!
    );

    const vault = await ethers.getContractAt(
        "Vault", // 또는 VaultV3
        process.env.VAULT_ADDRESS!
    );

    const encoded = vault.interface.encodeFunctionData("withdraw", [recipient, amount]);

    const cancelParams = {
        target: await vault.getAddress(),
        value: 0,
        data: encoded,
        predecessor: ethers.ZeroHash,
        salt: ethers.id("withdraw-salt-01"), // ❗ 예약할 때 사용한 것과 동일해야 함
    };

    console.log(`🚫 예약 취소 시도 → recipient: ${recipient}, amount: ${amountStr}`);

    const cancelTx = await (timelock as any).cancel(
        cancelParams.target,
        cancelParams.value,
        cancelParams.data,
        cancelParams.predecessor,
        cancelParams.salt
    );

    await cancelTx.wait();
    console.log("🚫 예약 취소 완료 (cancel)");
}

main().catch((err) => {
    console.error("❌ 취소 실패:", err);
    process.exitCode = 1;
});

