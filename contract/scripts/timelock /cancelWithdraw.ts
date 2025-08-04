// scripts/timelock/cancelWithdraw.ts
import { ethers } from "hardhat";
import 'dotenv/config';

async function main() {
    const timelock = await ethers.getContractAt(
        "TimelockController",
        process.env.TIMELOCK_ADDRESS!
    );

    const vault = await ethers.getContractAt(
        "Vault", // 또는 VaultV3
        process.env.VAULT_ADDRESS!
    );

    const recipient = "0x1234..."; // 💡 취소할 withdraw 대상
    const amount = ethers.parseUnits("100", 18); // 💡 취소할 금액

    const encoded = vault.interface.encodeFunctionData("withdraw", [recipient, amount]);

    const cancelParams = {
        target: await vault.getAddress(),
        value: 0,
        data: encoded,
        predecessor: ethers.ZeroHash,
        salt: ethers.id("withdraw-salt-01"), // ❗ 예약할 때 사용한 것과 동일해야 함
    };

    const cancelTx = await timelock.cancel(
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

