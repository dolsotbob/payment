import { ethers } from "hardhat";

async function main() {
    const Forwarder = await ethers.getContractFactory("MyForwarder");

    // 여기에 필요한 이름 문자열을 넣습니다. 예: "MyForwarder"
    const forwarder = await Forwarder.deploy("MyForwarder");

    await forwarder.waitForDeployment();
    console.log("✅ MyForwarder deployed to:", await forwarder.getAddress());
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});