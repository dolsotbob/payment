// scripts/upgradeVaultToV3.ts

import { ethers, upgrades } from 'hardhat';
import 'dotenv/config';

async function main() {
    const vaultProxyAddress = process.env.VAULT_ADDRESS!;
    if (!vaultProxyAddress) {
        throw new Error('❌ VAULT_ADDRESS is not set in the .env file.');
    }

    console.log(`🔍 existing Vault Proxy address: ${vaultProxyAddress}`);
    console.log(`📦 Starting upgrade to new VaultV3 logic...`);

    const VaultV3 = await ethers.getContractFactory('VaultV3');

    const upgraded = await upgrades.upgradeProxy(vaultProxyAddress, VaultV3);
    await upgraded.waitForDeployment();

    const newVaultImplAddress = await upgrades.erc1967.getImplementationAddress(vaultProxyAddress);
    console.log(`✅ Upgrade completed!`);
    console.log(`🔁 Proxy address (unchanged): ${await upgraded.getAddress()}`);
    console.log(`🧠 New Implementation address: ${newVaultImplAddress}`);
}

main().catch((error) => {
    console.error('❌ Vault upgrade failed:', error);
    process.exitCode = 1;
});

