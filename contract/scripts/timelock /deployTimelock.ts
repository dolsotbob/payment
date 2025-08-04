import { ethers } from 'hardhat';
import 'dotenv/config';

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`\u2728 Deploying TimelockController as: ${deployer.address}`);

    const minDelay = 3600;  // 1 hour
    const proposers = [deployer.address];
    const executors = [deployer.address];

    const Timelock = await ethers.getContractFactory('TimelockController');
    const timelock = await Timelock.deploy(minDelay, proposers, executors);
    await timelock.waitForDeployment();

    const timelockAddress = await timelock.getAddress();
    console.log(`\u2705 TimelockController deployed at: ${timelockAddress}`);
    console.log(`👉 .env에 TIMLOCK_ADDRESS=${timelockAddress} 추가하세요`);
}

main().catch((error) => {
    console.error('❌ Timelock 배포 실패:', error);
    process.exitCode = 1;
});

