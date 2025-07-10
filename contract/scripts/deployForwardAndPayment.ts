
// ❗️ 여기서 MyForwarder 컨트랙트를 자동 배포한 뒤, 생성자로 전달하기 

import { ethers } from 'hardhat';
import { makeAbi } from './abiGenerator';
import 'dotenv/config';

import fs from 'fs';
import path from 'path';

async function main() {
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log(`Deploying Payment with the account: ${deployerAddress}`);

    // ✅ 환경 변수 가져오기
    const tokenAddress = process.env.TOKEN_ADDRESS;
    const vaultAddress = process.env.VAULT_ADDRESS;

    // ✅ 환경 변수 체크
    if (!tokenAddress || !vaultAddress) {
        throw new Error("❌ .env에서 TOKEN_ADDRESS 또는 VAULT_ADDRESS가 설정되지 않았습니다.");
    }

    // ✅ 1. MyForwarder 배포
    const ForwarderFactory = await ethers.getContractFactory('MyForwarder');
    const forwarder = await ForwarderFactory.deploy();
    await forwarder.waitForDeployment();
    const forwarderAddress = await forwarder.getAddress();
    console.log(`✅ MyForwarder deployed at: ${forwarderAddress}`);

    // ✅ 2. Payment 컨트랙트 배포 (with forwarder)
    const PaymentFactory = await ethers.getContractFactory('Payment');
    const payment = await PaymentFactory.deploy(tokenAddress, vaultAddress, forwarderAddress, {});

    await payment.waitForDeployment();
    const paymentAddress = await payment.getAddress();
    console.log(`✅ Payment contract deployed at: ${paymentAddress}`);

    // ✅ 3. Vault에 Payment 등록 
    // Vault 인스턴스 가져오기 
    const vaultAbi = require('../artifacts/contracts/Vault.sol/Vault.json').abi;
    const vault = new ethers.Contract(vaultAddress, vaultAbi, deployer);

    // setPaymentContract 실행 (Vault에 paymentContract 등록)
    const tx = await vault.setPaymentContract(paymentAddress);
    await tx.wait();
    console.log(`✅ Vault에 paymentContract 설정 완료`);

    // ✅ 4. ABI 저장
    await makeAbi('Payment', paymentAddress);
    await makeAbi('MyForwarder', forwarderAddress); // Forwarder도 ABI 저장

    // forwarderAddress를 .env에 자동 저장
    fs.appendFileSync(
        path.resolve(__dirname, '../.env'),
        `FORWARDER_ADDRESS=${forwarderAddress}\n`
    );
}

main().catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exitCode = 1;
});