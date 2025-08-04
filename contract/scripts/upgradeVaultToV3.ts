// scripts/upgradeVaultToV3.ts
import { ethers, upgrades } from 'hardhat';
import 'dotenv/config';

async function main() {
    const VAULT_PROXY = process.env.VAULT_ADDRESS!;
    if (!VAULT_PROXY) throw new Error("❌ .env에 VAULT_ADDRESS를 설정하세요");

    console.log(`🔧 Upgrading Vault Proxy at ${VAULT_PROXY} to VaultV3...`);

    const VaultV3 = await ethers.getContractFactory('VaultV3');
    const upgraded = await upgrades.upgradeProxy(VAULT_PROXY, VaultV3);
    await upgraded.waitForDeployment();

    console.log(`✅ Vault successfully upgraded to VaultV3`);
    const newImplAddress = await upgrades.erc1967.getImplementationAddress(upgraded.target as string);
    console.log(`🧠 New Implementation Address: ${newImplAddress}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});

