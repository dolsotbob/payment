// Forwarder, Vault, Payment를 한 번에 배포하고, 필요한 주소 연동까지 자동으로 처리 

import { ethers } from 'hardhat';
import { makeAbi } from './abiGenerator';
import 'dotenv/config';

import fs from 'fs';
import path from 'path';

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

    // ✅ 1. Forwarder 배포
    console.log('🔹 Deploying MyForwarder...');
    const ForwarderFactory = await ethers.getContractFactory('MyForwarder');
    const forwarder = await ForwarderFactory.deploy("MyForwarder");
    await forwarder.waitForDeployment();
    const forwarderAddress = await forwarder.getAddress();
    console.log(`✅ Forwarder deployed: ${forwarderAddress}`);
    await makeAbi('MyForwarder', forwarderAddress);

    // forwarderAddress를 .env에 자동 저장
    fs.appendFileSync(
        path.resolve(__dirname, '../.env'),
        `FORWARDER_ADDRESS=${forwarderAddress}\n`
    );

    // ✅ 2. Vault 배포
    console.log('🔹 Deploying Vault...');
    const VaultFactory = await ethers.getContractFactory('Vault');
    const vault = await VaultFactory.deploy(tokenAddress, treasuryAddress);
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log(`✅ Vault deployed: ${vaultAddress}`);
    await makeAbi('Vault', vaultAddress);

    // ✅ 3. Payment 배포 (Forwarder 주소 포함)
    console.log('🔹 Deploying Payment...');
    const PaymentFactory = await ethers.getContractFactory('Payment');
    const payment = await PaymentFactory.deploy(tokenAddress, vaultAddress, forwarderAddress, {});
    await payment.waitForDeployment();
    const paymentAddress = await payment.getAddress();
    console.log(`✅ Payment deployed: ${paymentAddress}`);
    await makeAbi('Payment', paymentAddress);

    // Payment Address를 .env에 자동 저장
    fs.appendFileSync(
        path.resolve(__dirname, '../.env'),
        `CONTRACT_ADDRESS=${paymentAddress}\n`
    );


    // ✅ 4. Vault에 Payment 등록
    console.log('🔹 Setting paymentContract on Vault...');
    const vaultSigned = vault.connect(deployer);
    const tx = await vaultSigned.setPaymentContract(paymentAddress);
    await tx.wait();
    console.log(`✅ Vault.setPaymentContract -> ${paymentAddress}`);

    console.log('🎉 Vault & Forward & Payment 배포 및 연결 완료!');
}

main().catch((error) => {
    console.error('❌ deployVaultAndPayment 실패:', error);
    process.exitCode = 1;
});