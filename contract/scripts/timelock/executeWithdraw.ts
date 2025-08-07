// scripts/timelock/executeWithdraw.ts
import { ethers } from "hardhat";
import 'dotenv/config';

async function main() {
    const timelock = await ethers.getContractAt(
        "TimelockController",
        process.env.TIMELOCK_ADDRESS!
    );

    const vault = await ethers.getContractAt(
        "Vault", // 또는 "VaultV3"
        process.env.VAULT_ADDRESS!
    );

    const recipient = "0x1234..."; // 💡 withdraw 대상 주소
    const amount = ethers.parseUnits("100", 18); // 💡 금액

    const encoded = vault.interface.encodeFunctionData("withdraw", [recipient, amount]);

    const txParams = {
        target: await vault.getAddress(),
        value: 0,
        data: encoded,
        predecessor: ethers.ZeroHash,
        salt: ethers.id("withdraw-salt-01"), // ❗ schedule과 동일해야 함
    };

    const executeTx = await timelock.execute(
        txParams.target,
        txParams.value,
        txParams.data,
        txParams.predecessor,
        txParams.salt
    );

    await executeTx.wait();
    console.log("✅ Timelock withdraw 실행 완료 (execute)");
}

main().catch((err) => {
    console.error("❌ 실행 실패:", err);
    process.exitCode = 1;
});

