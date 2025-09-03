import { run, upgrades } from "hardhat";
import 'dotenv/config';

// CLI 인자로 받는 target 값을 타입으로 제한 
type Target = "contract" | "impl";

function parseArgs() {
    const argv = require('yargs/yargs')(process.argv.slice(2))
        .option('target', { type: 'string', choices: ['contract', 'impl'] })
        .option('address', { type: 'string', describe: '일반 컨트랙트 주소(verify 대상)' })
        .option('args', { type: 'string', describe: '생성자 인자: 콤마로 구분 (예: 0xToken,0xVault)' })
        .option('proxy', { type: 'string', describe: 'Proxy 주소 (impl 검증 시 필요)' })
        .help().argv as any;

    const target = (argv.target ?? process.env.TARGET) as Target | undefined;
    if (!target) throw new Error('target이 필요합니다. (--target 또는 TARGET=...)');

    return {
        target,
        address: argv.address ?? process.env.PAYMENT_ADDRESS,
        args: argv.args ?? [process.env.TOKEN_ADDRESS, process.env.VAULT_ADDRESS].filter(Boolean).join(','),
        proxy: argv.proxy ?? process.env.VAULT_ADDRESS,
    };
}

async function verifyWithRetry(address: string, constructorArguments: any[]) {
    try {
        await run('verify:verify', { address, constructorArguments });
        console.log(`✅ Verify 성공: ${address}`);
    } catch (e: any) {
        const msg = String(e?.message ?? e);
        if (msg.includes('Already Verified') || msg.includes('Contract source code already verified')) {
            console.log(`ℹ️ 이미 검증됨: ${address}`);
            return;
        }
        console.error('❌ Verify 실패:', e);
        throw e;
    }
}

async function main() {
    const { target, address, args, proxy } = parseArgs();

    if (target === 'contract') {
        const contractAddress = address ?? process.env.PAYMENT_ADDRESS;
        if (!contractAddress) throw new Error('PAYMENT_ADDRESS(또는 --address)가 필요합니다.');

        const ctorArgs = (args ?? [process.env.TOKEN_ADDRESS, process.env.VAULT_ADDRESS].filter(Boolean).join(','))
            .split(',')
            .filter(Boolean);

        console.log(`🔍 일반 컨트랙트 검증 시작 @ ${contractAddress}`);
        console.log(`   constructor args: [${ctorArgs.join(', ')}]`);
        await verifyWithRetry(contractAddress, ctorArgs);
    }

    if (target === 'impl') {
        const proxyAddress = proxy ?? process.env.VAULT_ADDRESS;
        if (!proxyAddress) throw new Error('VAULT_ADDRESS(또는 --proxy)가 필요합니다.');

        console.log(`🔍 Proxy 주소: ${proxyAddress}`);
        const implAddress = await upgrades.erc1967.getImplementationAddress(proxyAddress);
        console.log(`🧠 Implementation 주소: ${implAddress}`);

        await verifyWithRetry(implAddress, []); // UUPS 구현 컨트랙트는 생성자 없음
    }

    console.log('🏁 완료');
}

main().catch((err) => {
    process.exitCode = 1;
});