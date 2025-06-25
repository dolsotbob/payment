import { ethers } from 'hardhat';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
    const [deployer] = await ethers.getSigners();
    const recipient = process.env.RECIPIENT!;
    const amount = ethers.parseUnits('100', 18); // 100 TTK

    const token = await ethers.getContractAt('TestToken', process.env.TOKEN_ADDRESS!);
    const tx = await token.transfer(recipient, amount);
    await tx.wait();

    console.log(`✅ Sent 100 TTK to ${recipient}`);
}

main().catch((error) => {
    console.error('❌ Transfer failed:', error);
    process.exitCode = 1;
});