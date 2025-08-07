// UUPS 방식으로 Vault 컨트랙트의 로직을 새로 교체하는 스크립트 

import { ethers, upgrades } from 'hardhat';
import 'dotenv/config';

async function main() {
    const vaultProxyAddress = process.env.VAULT_ADDRESS!;
    if (!vaultProxyAddress) {
        throw new Error('❌ .env에 VAULT_ADDRESS가 설정되어 있지 않습니다.');
    }

    console.log(`🔍 기존 Vault Proxy 주소: ${vaultProxyAddress}`);
    console.log(`📦 새로운 Vault 구현 로직 업그레이드 시작`);

    // 새로운 로직 컨트랙트 불러오기 
    const VaultV2 = await ethers.getContractFactory('VaultV2');

    // 업그레이드 진행 
    const upgraded = await upgrades.upgradeProxy(vaultProxyAddress, VaultV2);
    await upgraded.waitForDeployment();

    // 업그레이드 결과 출력 
    const newVaultImplAddress = await upgrades.erc1967.getImplementationAddress(vaultProxyAddress);
    console.log(`✅ 업그레이드 완료!`);
    console.log(`🔁 Proxy 주소 (변함 없음): ${await upgraded.getAddress()}`);
    console.log(`🧠 새 Implementation 주소: ${newVaultImplAddress}`);
}

main().catch((error) => {
    console.error('❌ Vault 업그레이드 실패:', error);
    process.exitCode = 1;
});