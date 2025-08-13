// TimeController 배포 (minDelay, proposers, executors 포함)

import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });  // contract/.env만 사용 

import { ethers } from "hardhat";

import fs from 'fs';

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`✨ Deploying TimelockController as: ${deployer.address}`);

    const minDelay = 60;  // 1 min (나중에 3600으로 바꾸기; 시렞 배포시에는 충분히 길게 1~2일로
    const proposers = [deployer.address];  // 출금 예약 권한자 
    const executors = [deployer.address];  // 출금 실행 권한자 
    const admin = deployer.address; // 단일 주소로 지정 

    const Timelock = await ethers.getContractFactory('TimelockControllerWrapper');
    const timelock = await Timelock.deploy(minDelay, proposers, executors, admin);
    await timelock.waitForDeployment();

    const CANCELLER_ROLE = await timelock.getFunction('CANCELLER_ROLE')();

    // 반드시 필요: cancelWithdraw.ts를 실행할 계정에게 CANCELLER_ROLE 부여 
    await (timelock as any).grantRole(CANCELLER_ROLE, deployer.address);

    const timelockAddress = await timelock.getAddress();
    console.log(`✅ TimelockController deployed at: ${timelockAddress}`);
    console.log(`👉 .env에 TIMELOCK_ADDRESS=${timelockAddress} 추가하세요`);

    // 5. .env에 TIMELOCK_ADDRESS 업데이트 
    // .env 파일 경로
    const envPath = path.resolve(__dirname, '../../.env');

    // 기존 .env 파일 읽기 (없으면 빈 문자열)
    let envContent = '';
    try {
        envContent = fs.readFileSync(envPath, 'utf8');
    } catch (err) {
        console.warn('⚠️ .env 파일이 없어서 새로 생성합니다.');
    }

    // TIMELOCK_ADDRESS 업데이트 또는 추가
    const newLine = `TIMELOCK_ADDRESS=${timelockAddress}`;
    if (envContent.includes('TIMELOCK_ADDRESS=')) {
        envContent = envContent.replace(/TIMELOCK_ADDRESS=.*/g, newLine);
    } else {
        envContent += `\n${newLine}`;
    }

    // 저장
    fs.writeFileSync(envPath, envContent.trim() + '\n');
    console.log(`✅ .env 파일에 TIMELOCK_ADDRESS=${timelockAddress} 저장 완료`);
}

main().catch((error) => {
    console.error('❌ Timelock 배포 실패:', error);
    process.exitCode = 1;
});
