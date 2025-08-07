// timelock/scheduleSetPayment.ts
// vault.setPaymentContract(...) 트랜잭션 예약 (타임락 큐에 넣는 작업) )

import { ethers } from 'hardhat';
import 'dotenv/config';

async function main() {
    const [deployer] = await ethers.getSigners();

    const vault = await ethers.getContractAt('VaultV3', process.env.VAULT_ADDRESS!);
    const timelock = await ethers.getContractAt('TimelockController', process.env.TIMELOCK_ADDRESS!);
    const paymentAddress = process.env.PAYMENT_ADDRESS!;

    const minDelay = 3600; // TimeLock 설정에 따라 맞춤

    const target = vault.getAddress();
    const value = 0;
    const signature = 'setPaymentContract(address)';
    const data = ethers.AbiCoder.defaultAbiCoder().encode(['address'], [paymentAddress]);

    const salt = ethers.keccak256(ethers.toUtf8Bytes('set-payment'));

    // queue
    const queueTx = await timelock.schedule(
        target,
        value,
        data,
        ethers.id(signature),
        salt,
        minDelay
    );

    await queueTx.wait();
    console.log('✅ Scheduled setPaymentContract via Timelock');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});