// ‼️ 배포 후 Payment address를 .env에 등록하세요

import { ethers } from 'hardhat';
import { makeAbi } from './abiGenerator';
import 'dotenv/config';

async function main() {
    // 1. 배포자 signer 가져오기
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log(`🚀 Deploying Payment with the account: ${deployerAddress}`);

    // 2. 환경 변수 확인
    const tokenAddress = process.env.TOKEN_ADDRESS;
    const vaultAddress = process.env.VAULT_ADDRESS;

    if (!tokenAddress) throw new Error("❌ .env에서 TOKEN_ADDRESS가 설정되지 않았습니다.");
    if (!vaultAddress) throw new Error("❌ .env에서 VAULT_ADDRESS가 설정되지 않았습니다.");

    // 3. Payment 컨트랙트 배포
    const PaymentFactory = await ethers.getContractFactory('Payment');
    const payment = await PaymentFactory.deploy(tokenAddress, vaultAddress);
    await payment.waitForDeployment();

    const paymentAddress = await payment.getAddress();
    console.log(`✅ Payment contract deployed at: ${paymentAddress}`);
    console.log(`👉 .env에 추가하세요: PAYMENT_ADDRESS=${paymentAddress}`);

    // 4. ABI 저장
    await makeAbi('Payment', paymentAddress);
}

main().catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exitCode = 1;
});