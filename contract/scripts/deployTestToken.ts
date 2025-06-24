import { ethers } from "hardhat";

async function main() {
    const [deployer] = await ethers.getSigners();
    const TestToken = await ethers.getContractFactory("TestToken");
    const token = await TestToken.deploy(ethers.parseEther("1000000")); // 100만 TTK 발행

    await token.waitForDeployment();

    console.log("✅ TestToken deployed at:", token.target);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});