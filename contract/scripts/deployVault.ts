
// Vault(UUPS) 배포 
// Proxy 배포 스크립트로 사용 

import { ethers, upgrades } from 'hardhat';
import { makeAbi } from './abiGenerator';
import fs from 'fs';
import path from 'path';
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

    console.log(`✅ Vault proxy address: ${vaultProxyAddress}`);
    console.log(`🧠 Vault implementation address: ${vaultImplAddress}`);
    console.log(`🛠 Vault proxyAdmin address (internal): ${adminAddress}`);

    // 4. ABI 파일 저장 
    await makeAbi('Vault', vaultProxyAddress);

    // 5. .env에 VAULT_ADDRESS 업데이트 
    // .env 파일 경로
    const envPath = path.resolve(__dirname, '..', '.env');

    // 기존 .env 파일 읽기 (없으면 빈 문자열)
    let envContent = '';
    try {
        envContent = fs.readFileSync(envPath, 'utf8');
    } catch (err) {
        console.warn('⚠️ .env 파일이 없어서 새로 생성합니다.');
    }

    // VAULT_ADDRESS 업데이트 또는 추가
    const newLine = `VAULT_ADDRESS=${vaultProxyAddress}`;
    if (envContent.includes('VAULT_ADDRESS=')) {
        envContent = envContent.replace(/VAULT_ADDRESS=.*/g, newLine);
    } else {
        envContent += `\n${newLine}`;
    }

    // 저장
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    console.log(`✅ .env 파일에 VAULT_ADDRESS=${vaultProxyAddress} 저장 완료`);
}

main().catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exitCode = 1;
});

