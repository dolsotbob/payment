// scripts/transferOwnership.ts
// Vault 소유권 이전 

import { ethers, network } from 'hardhat';
import 'dotenv/config';

async function main() {
    const vaultAddress = process.env.VAULT_ADDRESS!;
    const timelockAddress = process.env.TIMELOCK_ADDRESS!;

    if (!vaultAddress || !timelockAddress) {
        throw new Error('❌ VAULT_ADDRESS or TIMELOCK_ADDRESS is not set in .env');
    }

    const networkName = network.name;
    console.log(`📡 Network: ${networkName}`);

    const vault = await ethers.getContractAt('Vault', vaultAddress);
    const currentOwner = await vault.owner();
    console.log(`🔍 Current Vault owner: ${currentOwner}`);

    if (currentOwner.toLowerCase() === timelockAddress.toLowerCase()) {
        console.log('⚠️ Timelock is already the owner of the Vault.');
        return;
    }

    const tx = await vault.transferOwnership(timelockAddress);
    await tx.wait();

    console.log(`✅ Vault ownership has been transferred to TimelockController (${timelockAddress}).`);
}

main().catch((error) => {
    console.error('❌ Ownership transfer failed:', error);
    process.exitCode = 1;
});

