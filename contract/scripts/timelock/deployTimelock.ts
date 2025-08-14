// TimeController 배포 (minDelay, proposers, executors 포함)

import path from "path";
import fs from 'fs';
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });  // contract/.env만 사용 

import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`✨ Deployer: ${deployer.address}`);

    // 1 min (나중에 3600으로 바꾸기; 시렞 배포시에는 충분히 길게 1~2일로
    const minDelay = 60;

    // constructor에 지정할 초기 권한자들 
    const proposers = [deployer.address];  // 출금 예약 권한자 
    const executors = [deployer.address];  // 출금 실행 권한자 
    const admin = deployer.address; // 기본 관리자; 단일 주소로 지정 

    // TimelockControllerWrapper(= TimelockController 상속) 배포
    const Timelock = await ethers.getContractFactory("TimelockControllerWrapper");
    const timelock = await Timelock.deploy(minDelay, proposers, executors, admin);

    // ⚠️ 배포 완료 대기 후 주소/역할 사용
    await timelock.waitForDeployment();

    const timelockAddress = await timelock.getAddress();
    console.log(`✨ Timelock deployed at: ${timelockAddress}`);

    // CANCELLER_ROLE 조회 (OZ: keccak256("CANCELLER_ROLE"))
    // v6에서는 이렇게 직접 호출 가능
    const CANCELLER_ROLE = await (timelock as any).CANCELLER_ROLE();

    // cancel 스크립트를 쓸 계정에 CANCELLER_ROLE 부여 (이미 admin이면 스킵 가능)
    const grantTx = await (timelock as any).grantRole(CANCELLER_ROLE, deployer.address);
    await grantTx.wait();
    console.log(`🔐 Granted CANCELLER_ROLE to ${deployer.address}`);

    // .env 경로
    const envPath = path.resolve(__dirname, "../../.env");

    // 기존 .env 읽기
    let envContent = "";
    try {
        envContent = fs.readFileSync(envPath, "utf8");
    } catch {
        console.warn("⚠️ .env 파일이 없어서 새로 생성합니다.");
    }

    // TIMELOCK_ADDRESS 업데이트/추가
    const newLine = `TIMELOCK_ADDRESS=${timelockAddress}`;
    if (envContent.includes("TIMELOCK_ADDRESS=")) {
        envContent = envContent.replace(/TIMELOCK_ADDRESS=.*/g, newLine);
    } else {
        envContent += (envContent.endsWith("\n") || envContent === "" ? "" : "\n") + newLine;
    }

    // 저장
    fs.writeFileSync(envPath, envContent.trim() + "\n");
    console.log(`✅ .env 파일에 TIMELOCK_ADDRESS=${timelockAddress} 저장 완료`);

    // 참고 출력
    console.log(`minDelay=${minDelay}`);
    console.log(`proposers=${JSON.stringify(proposers)}`);
    console.log(`executors=${JSON.stringify(executors)}`);
    console.log(`admin=${admin}`);
}

main().catch((error) => {
    console.error("❌ Timelock 배포 실패:", error);
    process.exitCode = 1;
});