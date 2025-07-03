
// ‼️ 배포 후 token address를 .env에 등록 

import { ethers } from "hardhat";
import { makeAbi } from "./abiGenerator";

async function main() {
    const [deployer] = await ethers.getSigners();

    const TestToken = await ethers.getContractFactory("TestToken");
    const token = await TestToken.deploy(ethers.parseEther("1000000")); // 100만 TEST 발행

    await token.waitForDeployment();

    console.log("✅ TestToken deployed at:", token.target);
    console.log(`👉 .env 파일에 추가: REACT_APP_TOKEN_ADDRESS=${token.target}`);

    await makeAbi("TestToken", token.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
