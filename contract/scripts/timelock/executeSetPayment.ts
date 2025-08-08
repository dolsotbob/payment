// timelock/executeSetPayment.ts
// 예약된 vault.setPaymentContract 트랜잭션을 실행해 Vault에 적용 

import { ethers, network } from 'hardhat';
import 'dotenv/config';

async function main() {
    const timelock = await ethers.getContractAt('TimelockController', process.env.TIMELOCK_ADDRESS!);
    const vault = await ethers.getContractAt('VaultV3', process.env.VAULT_ADDRESS!);
    const paymentAddress = process.env.PAYMENT_ADDRESS!;

    const target = await vault.getAddress();
    const value = 0;
    const callData = vault.interface.encodeFunctionData(
        'setPaymentContract',
        [paymentAddress]
    );
    const predecessor = ethers.ZeroHash;
    const salt = ethers.keccak256(ethers.toUtf8Bytes('set-payment'));

    console.log(`📡 Network: ${network.name}`);
    console.log(`🔗 Timelock: ${await timelock.getAddress()}`);
    console.log(`🏦 Vault: ${target}`);
    console.log(`💳 Payment: ${paymentAddress}`);

    // Compute operation id exactly like Timelock does
    const opId = await timelock.hashOperation(target, value, callData, predecessor, salt);
    console.log(`🆔 Operation ID: ${opId}`);

    // Optional: show minDelay 
    const minDelay = await timelock.getMinDelay();
    console.log(`⏳ Timelock minDelay: ${minDelay.toString()} seconds`);

    // Check readiness
    const isDone = await timelock.isOperationDone(opId);
    if (isDone) {
        console.log('⚠️ Operation already executed.');
        return;
    }

    const isReady = await timelock.isOperationReady(opId);
    if (!isReady) {
        const ts = await timelock.getTimestamp(opId);  // 0 if not scheduled
        if (ts === 0n) {
            console.log('❌ Operation not scheduled (timestamp = 0). Make sure scheduleSetPayment.ts ran with the same calldata/salt.');
        } else {
            console.log(`⌛ Operation not ready yet. ETA (unix): ${ts.toString()}`);
        }
        return;
    }

    // Execute 
    const execTx = await timelock.execute(
        target,
        value,
        callData,
        predecessor,
        salt,
    );
    console.log(`🚀 Executing... tx: ${execTx.hash}`);
    await execTx.wait();
    console.log('✅ Executed setPaymentContract via Timelock');
}

main().catch((err) => {
    console.error('❌ Execution failed:', err);
    process.exit(1);
});

/* 
OZ TimelockController execute() 표준 시그니처 
function execute(
        address target, 
        uint256 value,  
        bytes calldata payload, 
        bytes32 predecessor,
        bytes32 salt,  
    ) 
*/
