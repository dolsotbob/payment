// scripts/deployVaultAndPayment.ts
import { ethers } from 'hardhat';
import { makeAbi } from './abiGenerator';
import 'dotenv/config';

async function main() {
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log(`🚀 Deploying Vault & Payment with account: ${deployerAddress}`);

    // 환경 변수 가져오기 
    const tokenAddress = process.env.TOKEN_ADDRESS;
    const treasuryAddress = process.env.STORE_WALLET;

    // 환경 변수 체크 
    if (!tokenAddress || !treasuryAddress) {
        throw new Error('❌ .env에 TOKEN_ADDRESS 및 STORE_WALLET 설정이 필요합니다.');
    }

    // Vault 배포
    console.log('🔹 Deploying Vault...');
    const VaultFactory = await ethers.getContractFactory('Vault');
    const vault = await VaultFactory.deploy(tokenAddress, treasuryAddress);
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log(`✅ Vault deployed: ${vaultAddress}`);
    await makeAbi('Vault', vaultAddress);

    // Payment 배포
    console.log('🔹 Deploying Payment...');
    const PaymentFactory = await ethers.getContractFactory('Payment');
    const payment = await PaymentFactory.deploy(tokenAddress, vaultAddress);
    await payment.waitForDeployment();
    const paymentAddress = await payment.getAddress();
    console.log(`✅ Payment deployed: ${paymentAddress}`);
    await makeAbi('Payment', paymentAddress);

    // Vault에 Payment 등록
    console.log('🔹 Setting paymentContract on Vault...');
    const vaultSigned = vault.connect(deployer);
    const tx = await vaultSigned.setPaymentContract(paymentAddress);
    await tx.wait();
    console.log(`✅ Vault.setPaymentContract -> ${paymentAddress}`);

    console.log('🎉 Vault & Payment 배포 및 연결 완료!');
}

main().catch((error) => {
    console.error('❌ deployVaultAndPayment 실패:', error);
    process.exitCode = 1;
});