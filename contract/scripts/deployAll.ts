import { ethers } from 'hardhat';
import { makeAbi } from './abiGenerator';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`🚀 Deploying contracts with the account: ${deployer.address}`);

    // 1️⃣ TestToken 배포 (이름, 심볼은 Solidity에서 하드코딩됨)
    const TestToken = await ethers.getContractFactory('TestToken');
    const initialSupply = ethers.parseUnits('1000000', 18); // 100만 개 발행
    const testToken = await TestToken.deploy(initialSupply); // ✅ 인자 1개만 전달
    await testToken.waitForDeployment();
    const tokenAddress = await testToken.getAddress();
    console.log(`✅ TestToken deployed at: ${tokenAddress}`);
    await makeAbi('TestToken', tokenAddress);

    // 2️⃣ PaymentGateway 배포
    const PaymentGateway = await ethers.getContractFactory('PaymentGateway');
    const paymentGateway = await PaymentGateway.deploy(
        tokenAddress, // 수정: 위에서 배포한 TestToken 주소 사용
        process.env.STORE_WALLET!
    );
    await paymentGateway.waitForDeployment();
    const gatewayAddress = await paymentGateway.getAddress();
    console.log(`✅ PaymentGateway deployed at: ${gatewayAddress}`);
    await makeAbi('PaymentGateway', gatewayAddress);
}

main().catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exitCode = 1;
});