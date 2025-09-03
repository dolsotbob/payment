// ‼️ 배포 후 Payment address를 .env에 등록하세요

import { ethers, upgrades } from 'hardhat';
import { makeAbi } from './abiGenerator';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

async function main() {
    // 1. 배포자 signer 가져오기
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log(`🚀 Deploying UUPS Payment with the account: ${deployerAddress}`);

    // 2. 환경 변수 확인
    const tokenAddress = process.env.TOKEN_ADDRESS;
    const vaultAddress = process.env.VAULT_ADDRESS;
    const cashbackBps = process.env.CASHBACK_BPS || '0';
    const maxDiscountBps = process.env.MAX_DISCOUNT_BPS || '9000';
    const ownerAddress = process.env.INITIAL_OWNER || deployerAddress;

    if (!tokenAddress) throw new Error("❌ .env에서 TOKEN_ADDRESS가 설정되지 않았습니다.");
    if (!vaultAddress) throw new Error("❌ .env에서 VAULT_ADDRESS가 설정되지 않았습니다.");
    if (!ownerAddress) throw new Error("❌ 초기 owner 주소가 없습니다.");

    // 3. UUPS Proxy를 통해 Payment 컨트랙트 배포 (업그레이더블 프록시 + initialize 호출)
    const PaymentFactory = await ethers.getContractFactory('Payment');
    const paymentProxy = await upgrades.deployProxy(
        PaymentFactory,
        [
            tokenAddress,
            vaultAddress,
            parseInt(cashbackBps),
            parseInt(maxDiscountBps),
            ownerAddress
        ],
        {
            kind: 'uups',
            initializer: 'initialize'
        }
    );
    await paymentProxy.waitForDeployment();

    const paymentProxyAddress = await paymentProxy.getAddress();
    const paymentImplAddress = await upgrades.erc1967.getImplementationAddress(paymentProxyAddress);
    const adminAddress = await upgrades.erc1967.getAdminAddress(paymentProxyAddress);

    console.log(`✅ Payment proxy address: ${paymentProxyAddress}`);
    console.log(`🧠 Payment implementation address: ${paymentImplAddress}`);
    console.log(`🛠 Payment proxyAdmin address (internal): ${adminAddress}`);

    // 4. ABI 저장
    await makeAbi('Payment', paymentProxyAddress);

    // 5. .env에 PAYMENT_ADDRESS 업데이트 
    // .env 파일 경로
    const envPath = path.resolve(__dirname, '..', '.env');

    // 기존 .env 파일 읽기 (없으면 빈 문자열)
    let envContent = '';
    try {
        envContent = fs.readFileSync(envPath, 'utf8');
    } catch (err) {
        console.warn('⚠️ .env 파일이 없어서 새로 생성합니다.');
    }

    // PAYMENT_ADDRESS 업데이트 또는 추가
    const newLine = `PAYMENT_ADDRESS=${paymentProxyAddress}`;
    if (envContent.includes('PAYMENT_ADDRESS=')) {
        envContent = envContent.replace(/PAYMENT_ADDRESS=.*/g, newLine);
    } else {
        envContent += `\n${newLine}`;
    }

    // 저장
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    console.log(`✅ .env 파일에 PAYMENT_ADDRESS=${paymentProxyAddress} 저장 완료`);
}

main().catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exitCode = 1;
});
