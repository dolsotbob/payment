// UUPS 방식에서 Proxy(Vault 주소)는 직접 verify 할 수 없고, 
// Implementation(로직 컨트랙트)은 주소를 찾아서 verify 가능하다 
// kaia 테스트넷에서 실행: npx hardhat run ./contract/scripts/verifyVaultImpl.ts --network kaia

import { ethers, upgrades, run } from 'hardhat';
import 'dotenv/config';

async function main() {
    const proxyAddress = process.env.VAULT_ADDRESS!;
    if (!proxyAddress) {
        throw new Error('❌ .env 파일에 VAULT_ADDRESS가 누락되었습니다.');
    }

    console.log(`🔍 Proxy 주소: ${proxyAddress}`);

    // Implementation 주소 조회 (ERC1967 표준 슬롯에서)
    const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
    console.log(`🧠 Implementation 주소: ${implAddress}`);

    // Implementation 컨트랙트 verify 실행
    await run('verify:verify', {
        address: implAddress,
        constructorArguments: [], // UUPS Proxy는 생성자 없음
    });

    console.log('✅ Vault Implementation verify 완료');
}

main().catch((error) => {
    console.error('❌ Vault Implementation verify 실패:', error);
    process.exitCode = 1;
});