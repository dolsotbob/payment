// 일반 컨트랙트인 Payment 컨트랙트를 블렉체인 탐색기에 검증하기 위해 사용 
// kaia 테스트넷에서 실행: npx hardhat run ./contract/scripts/verifyVaultImpl.ts --network kaia

import { run } from 'hardhat';
import 'dotenv/config';

async function main() {
    const paymentAddress = process.env.PAYMENT_ADDRESS!;
    const tokenAddress = process.env.TOKEN_ADDRESS!;
    const vaultAddress = process.env.VAULT_ADDRESS!;

    if (!paymentAddress || !tokenAddress || !vaultAddress) {
        throw new Error('❌ .env 설정이 누락되었습니다.');
    }

    console.log(`🔍 Verifying Payment contract at ${paymentAddress}...`);

    await run('verify:verify', {
        address: paymentAddress,
        constructorArguments: [tokenAddress, vaultAddress],
    });

    console.log('✅ Payment 컨트랙트 verify 완료');
}

main().catch((err) => {
    console.error('❌ Verify 실패:', err);
    process.exitCode = 1;
});