// Vault, Payment를 한 번에 배포하고, 필요한 주소 연동까지 자동으로 처리 
// 🧩 배포 스크립트 구성은 이렇게 하면 좋아요:
// 1.	Vault.sol → 가장 먼저 배포
// 2.	Payment.sol → Vault 주소를 생성자에 넣어야 할 수도 있음

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
    if (!tokenAddress) throw new Error("❌ .env에 TOKEN_ADDRESS가 설정되어야 합니다.");
    if (!treasuryAddress) throw new Error("❌ .env에 STORE_WALLET이 설정되어야 합니다.");

    // ✅ 2. Vault 배포
    console.log('🔹 Deploying Vault...');
    const VaultFactory = await ethers.getContractFactory('Vault');
    const vault = await VaultFactory.deploy(tokenAddress, treasuryAddress);
    await vault.waitForDeployment();
    const vaultAddress = await vault.getAddress();
    console.log(`✅ Vault deployed: ${vaultAddress}`);
    console.log(`👉 .env에 추가하세요: VAULT_ADDRESS=${vaultAddress}`);
    await makeAbi('Vault', vaultAddress);

    // ✅ 3. Payment 배포 
    console.log('🔹 Deploying Payment...');
    const PaymentFactory = await ethers.getContractFactory('Payment');
    const payment = await PaymentFactory.deploy(tokenAddress, vaultAddress);
    await payment.waitForDeployment();
    const paymentAddress = await payment.getAddress();
    console.log(`✅ Payment deployed: ${paymentAddress}`);
    console.log(`👉 .env에 추가하세요: PAYMENT_ADDRESS=${paymentAddress}`);
    await makeAbi('Payment', paymentAddress);

    // ✅ 4. Vault에 Payment 등록
    console.log('🔹 Setting paymentContract on Vault...');
    const tx = await vault.connect(deployer).setPaymentContract(paymentAddress);
    await tx.wait();
    console.log(`✅ vault.setPaymentContract(${paymentAddress}) 완료`);

    console.log('🎉 Vault & Payment 배포 및 연결 완료!');
}

main().catch((error) => {
    console.error('❌ deployVaultAndPayment 실패:', error);
    process.exitCode = 1;
});