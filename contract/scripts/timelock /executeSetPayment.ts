// timelock/executeSetPayment.ts
// 예약된 트랜잭션을 실행해 Vault에 적용 

import { ethers } from 'hardhat';
import 'dotenv/config';

async function main() {
    const timelock = await ethers.getContractAt('TimelockController', process.env.TIMELOCK_ADDRESS!);
    const vault = await ethers.getContractAt('VaultV3', process.env.VAULT_ADDRESS!);
    const paymentAddress = process.env.PAYMENT_ADDRESS!;

    const target = vault.getAddress();
    const value = 0;
    const signature = 'setPaymentContract(address)';
    const data = ethers.AbiCoder.defaultAbiCoder().encode(['address'], [paymentAddress]);
    const salt = ethers.keccak256(ethers.toUtf8Bytes('set-payment'));

    const execTx = await timelock.execute(
        target,
        value,
        data,
        ethers.id(signature),
        salt
    );

    await execTx.wait();
    console.log('✅ Executed setPaymentContract via Timelock');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});