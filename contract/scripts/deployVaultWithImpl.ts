
// Vault(UUPS) 배포 
// ‼️ 배포 후 Vault address를 .env에 등록 

import { ethers, upgrades } from 'hardhat';
import { makeAbi } from './abiGenerator';
import 'dotenv/config'

async function main() {
    // 1. 배포자 signer 가져오기 
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log(`🚀 Deploying UUPS Vault with the account: ${deployerAddress}`);

    // 2. 환경 변수 확인 
    const tokenAddress = process.env.TOKEN_ADDRESS!;
    const treasuryAddress = process.env.STORE_WALLET! // 출금 받을 지갑 주소 (store owner)

    if (!tokenAddress) throw new Error("❌ .env에서 TOKEN_ADDRESS가 설정되지 않았습니다.");
    if (!treasuryAddress) throw new Error("❌ .env에서 STORE_WALLET이 설정되지 않았습니다.");

    // 3. UUPS Proxy를 통해 Vault 컨트랙트 배포 
    const VaultFactory = await ethers.getContractFactory('Vault');
    const vaultProxy = await upgrades.deployProxy(
        VaultFactory,
        [tokenAddress, treasuryAddress],
        {
            initializer: 'initialize',
            kind: 'uups',
        }
    );
    await vaultProxy.waitForDeployment();

    const vaultProxyAddress = await vaultProxy.getAddress();
    const vaultImplAddress = await upgrades.erc1967.getImplementationAddress(vaultProxyAddress);
    const adminAddress = await upgrades.erc1967.getAdminAddress(vaultProxyAddress);

    console.log(`✅ Proxy (VAULT_ADDRESS): ${vaultProxyAddress}`);
    console.log(`🧠 Implementation address:        ${vaultImplAddress}`);
    console.log(`🛠  ProxyAdmin address (internal): ${adminAddress}`);

    // 4. ABI 파일 저장 
    await makeAbi('Vault', vaultProxyAddress);
}

main().catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exitCode = 1;
});

