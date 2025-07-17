
// ‼️ 배포 후 Vault address를 .env에 등록 

import { ethers } from 'hardhat';
import { makeAbi } from './abiGenerator';
import 'dotenv/config'

async function main() {
    // 1. 배포자 signer 가져오기 
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();

    console.log(`🚀 Deploying Vault with the account: ${deployerAddress}`);

    // 2. 환경 변수 확인 
    const tokenAddress = process.env.TOKEN_ADDRESS!;
    const treasuryAddress = process.env.STORE_WALLET! // 출금 받을 지갑 주소 (store owner)

    if (!tokenAddress) throw new Error("❌ .env에서 TOKEN_ADDRESS가 설정되지 않았습니다.");
    if (!treasuryAddress) throw new Error("❌ .env에서 STORE_WALLET이 설정되지 않았습니다.");

    // 3. Vault 컨트랙트 배포 
    const VaultFactory = await ethers.getContractFactory('Vault');
    const vault = await VaultFactory.deploy(tokenAddress, treasuryAddress);
    await vault.waitForDeployment();

    const vaultAddress = await vault.getAddress();
    console.log(`✅ Vault contract deployed at: ${vaultAddress}`);
    console.log(`👉 .env에 추가하세요: VAULT_ADDRESS=${vaultAddress}`);

    // 4. ABI 파일 저장 
    await makeAbi('Vault', vaultAddress);
}

main().catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exitCode = 1;
});

