// Vault(UUPS), Timelock, Payment를 한 번에 배포하고, 필요한 주소 연동까지 자동으로 처리 
// 🧩 배포 스크립트 구성은 이렇게 하면 좋아요:
// 1.	Vault.solIUUPS) → 가장 먼저 배포
// 2.   Timelock Controller 배포  
// 3.	Payment.sol → Vault 주소를 생성자에 넣어야 할 수도 있음

import { ethers, upgrades } from 'hardhat';
import { makeAbi } from './abiGenerator';
import 'dotenv/config';

async function main() {
    const [deployer] = await ethers.getSigners();
    const deployerAddress = await deployer.getAddress();
    console.log(`🚀 Deploying Vault & Payment with account: ${deployerAddress}`);

    // 환경 변수 가져오기 
    const tokenAddress = process.env.TOKEN_ADDRESS;
    const treasuryAddress = process.env.STORE_WALLET;
    const minDelay = 3600;   // 1 시간 

    // 환경 변수 체크 
    if (!tokenAddress) throw new Error("❌ .env에 TOKEN_ADDRESS가 설정되어야 합니다.");
    if (!treasuryAddress) throw new Error("❌ .env에 STORE_WALLET이 설정되어야 합니다.");

    // ✅ 1. Vault 배포 (UUPS)
    console.log('🔹 Deploying Vault...');
    const VaultFactory = await ethers.getContractFactory('Vault');
    const vaultProxy = await upgrades.deployProxy(
        VaultFactory,
        [tokenAddress, treasuryAddress],
        {
            initializer: 'initialize',
            kind: 'uups',
        }
    );
    await vaultProxy.waitForDeployment();

    const vaultProxyAddress = await vaultProxy.getAddress();
    const vaultImplAddress = await upgrades.erc1967.getImplementationAddress(vaultProxyAddress);
    const adminAddress = await upgrades.erc1967.getAdminAddress(vaultProxyAddress);

    console.log(`✅ Proxy (VAULT_ADDRESS): ${vaultProxyAddress}`);
    console.log(`🧠 Implementation address:        ${vaultImplAddress}`);
    console.log(`🛠  ProxyAdmin address (internal): ${adminAddress}`);

    await makeAbi('Vault', vaultProxyAddress);

    // ✅ 2. TimelockController 배포
    console.log('🔹 Deploying TimelockController...');
    const proposers = [deployerAddress];
    const executors = [deployerAddress];

    const TimelockFactory = await ethers.getContractFactory('TimelockController');
    const timelock = await TimelockFactory.deploy(minDelay, proposers, executors, deployerAddress);
    await timelock.waitForDeployment();
    const timelockAddress = await timelock.getAddress();
    console.log(`✅ TimelockController deployed: ${timelockAddress}`);
    console.log(`👉 .env에 추가하세요: TIMELOCK_ADDRESS=${timelockAddress}`);

    // ✅ 3. Vault 소유권 Timelock에 이전 
    console.log('🔹 Transferring ownership to Timelock...');
    const vault = await ethers.getContractAt('Vault', vaultProxyAddress);
    const tx = await vault.transferOwnership(timelockAddress);
    await tx.wait();
    console.log(`✅ Vault 소유권이 TimelockController로 이전됨`);

    // ✅ 4. Payment 배포 
    console.log('🔹 Deploying Payment...');
    const PaymentFactory = await ethers.getContractFactory('Payment');
    const payment = await PaymentFactory.deploy(tokenAddress, vaultProxyAddress);
    await payment.waitForDeployment();
    const paymentAddress = await payment.getAddress();
    console.log(`✅ Payment deployed: ${paymentAddress}`);
    console.log(`👉 .env에 추가하세요: PAYMENT_ADDRESS=${paymentAddress}`);
    await makeAbi('Payment', paymentAddress);

    // ❗Vault.setPaymentContract는 이제 Timelock이 owner이므로 직접 호출 불가
    console.log('📝 이제 Timelock을 통해 Vault.setPaymentContract() 예약 실행 필요');

    console.log('\n🎉 Vault + Timelock + Payment 배포 완료');
    console.log(`🔑 Timelock address: ${timelockAddress}`);
    console.log(`🧾 Vault Proxy address: ${vaultProxyAddress}`);
    console.log(`💸 Payment address: ${paymentAddress}`);

    // 🚫 Timelock 도입 이후에는 직접 호출하지 않습니다.
    // vault.setPaymentContract(paymentAddress)는 Timelock을 통해 실행하세요.
    // // ✅ 5. Vault에 Payment 등록
    // console.log('🔹 Setting paymentContract on Vault...');
    // const tx = await vaultProxy.connect(deployer).setPaymentContract(paymentAddress);
    // await tx.wait();
    // console.log(`✅ vault.setPaymentContract(${paymentAddress}) 완료`);

    // console.log('🎉 Vault & Payment 배포 및 연결 완료!');
}

main().catch((error) => {
    console.error('❌ Vault & Payment 배포 실패:', error);
    process.exitCode = 1;
});