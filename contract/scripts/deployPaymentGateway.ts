import { ethers } from 'hardhat';
import { makeAbi } from './abiGenerator';

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log(`Deploying contracts with the account: ${deployer.address}`);

    // PaymentGateway 컨트랙트 팩토리 가져오기
    const PaymentGateway = await ethers.getContractFactory('PaymentGateway');

    // 컨트랙트 배포 
    const contract = await PaymentGateway.deploy(
        process.env.TOKEN_ADDRESS!,
        process.env.STORE_WALLET!
    );

    // 배포 완료 대기 
    await contract.waitForDeployment();

    const contractAddress = await contract.getAddress();

    console.log(`PaymentGateway contract deployed at: ${contractAddress}`);

    // ABI 생성 
    await makeAbi('PaymentGateway', contractAddress);
}

main().catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exitCode = 1;
});
