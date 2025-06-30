import { ethers } from 'hardhat';
import { makeAbi } from './abiGenerator';

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

    // ✅ 컨트랙트 팩토리 및 배포
    const PaymentFactory = await ethers.getContractFactory('Payment');
    const payment = await PaymentFactory.deploy(tokenAddress, vaultAddress);

    await payment.waitForDeployment();
    const paymentAddress = await payment.getAddress();

    console.log(`✅ Payment contract deployed at: ${paymentAddress}`);

    // ✅ Vault 인스턴스 가져오기
    const vaultAbi = require('../artifacts/contracts/Vault.sol/Vault.json').abi;
    const vault = new ethers.Contract(vaultAddress, vaultAbi, deployer);

    // ✅ setPaymentContract 실행
    const tx = await vault.setPaymentContract(paymentAddress);
    await tx.wait();
    console.log(`✅ Vault에 paymentContract 설정 완료`);

    // ✅ ABI 저장
    await makeAbi('Payment', paymentAddress);
}

main().catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exitCode = 1;
});