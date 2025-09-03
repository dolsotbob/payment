// scripts/upgradeVaultToV3.ts
// 기존 Vault 프록시 주소에 새로운 VaultV3 로직 연결 

import { ethers, upgrades } from 'hardhat';
import 'dotenv/config';

async function main() {
    const vaultProxyAddress = process.env.VAULT_ADDRESS!;
    if (!vaultProxyAddress) {
        throw new Error('❌ VAULT_ADDRESS is not set in the .env file.');
    }

    console.log(`🔍 existing Vault Proxy address: ${vaultProxyAddress}`);
    console.log(`📦 Starting upgrade to new VaultV3 logic...`);

    // 새로운 로직 컨트랙트 불러오기 
    const VaultV3 = await ethers.getContractFactory('VaultV3');

    // 업그레이드 진행 
    const upgraded = await upgrades.upgradeProxy(vaultProxyAddress, VaultV3);
    await upgraded.waitForDeployment();

    // 업그레이드 결과 출력 
    const newVaultImplAddress = await upgrades.erc1967.getImplementationAddress(vaultProxyAddress);
    console.log(`✅ Upgrade completed!`);
    console.log(`🔁 Proxy address (unchanged): ${await upgraded.getAddress()}`);
    console.log(`🧠 New Implementation address: ${newVaultImplAddress}`);
}

main().catch((error) => {
    console.error('❌ Vault upgrade failed:', error);
    process.exitCode = 1;
});

