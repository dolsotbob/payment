
// ‼️ 배포 후 token address를 아래 폴더의 .env에 등록 
// (1) contract, 
// (2) backend, 
// (3) backend/relayer-server, 
// (4) frontend의 

import { ethers } from "hardhat";
import { makeAbi } from "./abiGenerator";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying TestToken with account:", deployer.address);

    const TestToken = await ethers.getContractFactory("TestToken");
    const token = await TestToken.deploy(ethers.parseEther("1000000")); // 100만 TEST 발행

    await token.waitForDeployment();

    console.log("✅ TestToken deployed at:", token.target);
    console.log(`👉 .env 파일에 추가: TOKEN_ADDRESS=${token.target}`);

    await makeAbi("TestToken", token.target);
}

main().catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exitCode = 1;
});
