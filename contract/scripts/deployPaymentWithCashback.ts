import { ethers } from 'hardhat';
import { makeAbi } from './abiGenerator';

async function main() {
    const [deployer] = await ethers.getSigners();

    console.log(`Deploying contracts with the account: ${deployer.address}`);

    // 컨트랙트 팩토리 생성
    const PaymentWithCashbackFactory = await ethers.getContractFactory('PaymentWithCashback');

    // 컨트랙트 배포 (필요한 인자 전달) 
    const contract = await PaymentWithCashbackFactory.deploy(
        process.env.TOKEN_ADDRESS!,
        process.env.STORE_WALLET!
    );

    // 배포 완료 대기 
    await contract.waitForDeployment();
    const contractAddress = await contract.getAddress();

    console.log(`PaymentWithCashback contract deployed at: ${contractAddress}`);

    // ABI 파일 저장 
    await makeAbi('PaymentWithCashback', contractAddress);
}

main().catch((error) => {
    console.error('❌ Deployment failed:', error);
    process.exitCode = 1;
});
