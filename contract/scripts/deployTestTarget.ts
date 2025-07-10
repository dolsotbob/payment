// scripts/deployTestTarget.ts
import { ethers } from "hardhat";

async function main() {
    const TestTarget = await ethers.getContractFactory("TestTarget");
    const testTarget = await TestTarget.deploy();

    await testTarget.waitForDeployment();

    console.log("✅ TestTarget deployed to:", await testTarget.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});