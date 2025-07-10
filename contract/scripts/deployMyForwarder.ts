import { ethers } from "hardhat";
import { makeAbi } from './abiGenerator';

async function main() {
    const Forwarder = await ethers.getContractFactory("MyForwarder");
    const forwarder = await Forwarder.deploy();

    await forwarder.waitForDeployment();
    const forwarderAddress = await forwarder.getAddress();
    console.log("✅ MyForwarder deployed to:", await forwarder.getAddress());

    await makeAbi('MyForwarder', forwarderAddress); // Forwarder도 ABI 저장
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});