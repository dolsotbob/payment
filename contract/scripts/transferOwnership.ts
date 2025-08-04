// scripts/transferOwnership.ts
import { ethers, upgrades } from 'hardhat';
import 'dotenv/config';

async function main() {
    const vaultAddress = process.env.VAULT_ADDRESS!;
    const timelockAddress = process.env.TIMELOCK_ADDRESS!;

    if (!vaultAddress || !timelockAddress) {
        throw new Error('❌ .env에 VAULT_ADDRESS 또는 TIMELOCK_ADDRESS가 설정되지 않았습니다.');
    }

    const vault = await ethers.getContractAt('Vault', vaultAddress);
    const tx = await vault.transferOwnership(timelockAddress);
    await tx.wait();

    console.log(`✅ Vault 소유권이 TimelockController(${timelockAddress})로 이전되었습니다.`);
}

main().catch((error) => {
    console.error('❌ 소유권 이전 실패:', error);
    process.exitCode = 1;
});

