// UUPS 방식으로 Vault 컨트랙트의 로직을 새로 교체하는 스크립트 

import { ethers, upgrades } from 'hardhat';
import 'dotenv/config';

async function main() {
    const proxyAddress = process.env.VAULT_ADDRESS!;
    if (!proxyAddress) {
        throw new Error('❌ .env에 VAULT_ADDRESS가 설정되어 있지 않습니다.');
    }

    console.log(`🔍 기존 Vault Proxy 주소: ${proxyAddress}`);
    console.log(`📦 새로운 Vault 구현 로직 업그레이드 시작`);

    // 새로운 로직 컨트랙트 불러오기 
    const VaultV2 = await ethers.getContractFactory('Vault'); // 이름은 동일하지만 로직 수정됨 

    const upgraded = await upgrades.upgradeProxy(proxyAddress, VaultV2);
    await upgraded.waitForDeployment();

    console.log(`✅ 업그레이드 완료! Proxy 주소: ${await upgraded.getAddress()}`);
}

main().catch((error) => {
    console.error('❌ Vault 업그레이드 실패:', error);
    process.exitCode = 1;
});