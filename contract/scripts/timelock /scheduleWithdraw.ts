// scripts/timelock/scheduleWithdraw.ts
// 예약 + 실행 스크립트 
import { ethers } from "hardhat";
import 'dotenv/config'

async function main() {
    // 1. TimelockController 컨트랙트 인스턴스 생성 
    const timelock = await ethers.getContractAt(
        "TimelockController",
        process.env.TIMELOCK_ADDRESS!
    );

    // 2. Vault 컨트랙트 인스턴스 생성 
    const vault = await ethers.getContractAt(
        "Vault", // 또는 VaultV3
        process.env.VAULT_ADDRESS!
    );

    // 3. 실행할 withdraw 함수의 calldata 생성 
    const recipient = "0x1234..."; // 출금 대상
    const amount = ethers.parseUnits("100", 18); // 예: 100 TTKN

    const encoded = vault.interface.encodeFunctionData("withdraw", [recipient, amount]);

    // 4. Timelock 예약 정보 구성 
    const txDescription = {
        target: vault.target,  // Vault 컨트랙트 주소
        value: 0,              // 이더 전송은 없으므로 0
        data: encoded,         // withdraw calldata
        predecessor: ethers.ZeroHash, // 선행 트랜잭션 없음
        salt: ethers.id("withdraw-salt-01"), // 고유 식별자
        delay: 3600, // 1시간 후 실행
    };

    // 예약 실행 
    const queueTx = await timelock.schedule(
        txDescription.target,
        txDescription.value,
        txDescription.data,
        txDescription.predecessor,
        txDescription.salt,
        txDescription.delay
    );

    await queueTx.wait();
    console.log("✅ Timelock withdraw 예약 완료 (queue)");
}

main().catch((err) => {
    console.error("❌ 예약 실패:", err);
    process.exitCode = 1;
});

