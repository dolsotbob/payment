// TimeController 배포 (minDelay, proposers, executors 포함)

import { ethers } from 'hardhat';
import 'dotenv/config';

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`✨ Deploying TimelockController as: ${deployer.address}`);

    const minDelay = 3600;  // 1 hour
    const proposers = [deployer.address];  // 출금 예약 권한자 
    const executors = [deployer.address];  // 출금 실행 권한자 
    const admin = deployer.address; // 단일 주소로 지정 

    const Timelock = await ethers.getContractFactory('TimelockController');
    const timelock = await Timelock.deploy(minDelay, proposers, executors, admin);
    await timelock.waitForDeployment();

    const CANCELLER_ROLE = await timelock.getFunction('CANCELLER_ROLE')();

    // 반드시 필요: cancelWithdraw.ts를 실행할 계정에게 CANCELLER_ROLE 부여 
    await (timelock as any).grantRole(CANCELLER_ROLE, deployer.address);

    const timelockAddress = await timelock.getAddress();
    console.log(`✅ TimelockController deployed at: ${timelockAddress}`);
    console.log(`👉 .env에 TIMLOCK_ADDRESS=${timelockAddress} 추가하세요`);
}

main().catch((error) => {
    console.error('❌ Timelock 배포 실패:', error);
    process.exitCode = 1;
});

