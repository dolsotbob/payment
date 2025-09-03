// timelock/scheduleSetPayment.ts
// vault.setPaymentContract(...) 트랜잭션 예약 (타임락 큐에 넣는 작업) )
import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { ethers, network } from 'hardhat';

async function main() {
    const VAULT = process.env.VAULT_ADDRESS!;
    const TL = process.env.TIMELOCK_ADDRESS!;
    const PAYMENT = process.env.PAYMENT_ADDRESS!;
    if (!VAULT || !TL || !PAYMENT) {
        throw new Error('❌ VAULT_ADDRESS / TIMELOCK_ADDRESS / PAYMENT_ADDRESS must be set in .env');
    }

    const vault = await ethers.getContractAt('VaultV3', VAULT);
    const timelock = await ethers.getContractAt('TimelockController', TL);

    const target = await vault.getAddress();
    const value = 0;
    const callData = vault.interface.encodeFunctionData(
        'setPaymentContract',
        [PAYMENT]
    );
    // ethers.ZeroHash는 32바이트짜리 값이 전부 0인 해시
    // 이전 실행돼어야 할 작업이 없다면 -> bytes32(0) 값을 넣어야 한다 
    const predecessor = ethers.ZeroHash;
    const saltStr = 'set-payment';  // Timelock 작업을 구분하기 위해 사람이 읽을 수 있는 문자열 형태로 만든 소금값
    const salt = ethers.keccak256(ethers.toUtf8Bytes(saltStr));

    const minDelay = await timelock.getMinDelay();

    console.log(`📡 Network: ${network.name}`);
    console.log(`🔗 Timelock: ${await timelock.getAddress()}`);
    console.log(`🏦 Vault: ${target}`);
    console.log(`💳 Payment: ${PAYMENT}`);
    console.log(`⏳ Timelock minDelay: ${minDelay.toString()} seconds`);
    console.log(`🧂 Salt (str): "${saltStr}"`);

    // Compute the same operation id Timelock will use 
    const opId = await timelock.hashOperation(target, value, callData, predecessor, salt);
    console.log(`🆔 Operation ID: ${opId}`);

    // 1) already executed?
    if (await timelock.isOperationDone(opId)) {
        console.log('ℹ️ Operation already executed. Skipping schedule.');
        return;
    }

    const isScheduled = await timelock.isOperation(opId);
    if (isScheduled) {
        // 2) scheduled and ready now? 
        if (await timelock.isOperationReady(opId)) {
            const ts = await timelock.getTimestamp(opId);
            console.log(`✅ Operation is READY to execute. ETA (unix): ${ts.toString()}`);
            console.log('👉 Run executeSetPayment.ts to finalize.');
            return;
        }
        // 3) scheduled but pending (minDelay not passed)
        const ts = await timelock.getTimestamp(opId);
        console.log(`⌛ Operation already SCHEDULED (pending). ETA (unix): ${ts.toString()}`);
        return;
    }

    // 4) not scheduled -> schedule now 
    const tx = await timelock.schedule(
        target,
        value,
        callData,
        predecessor,
        salt,
        minDelay
    );
    console.log(`🚀 Scheduling... tx: ${tx.hash}`);
    await tx.wait();

    const ts = await timelock.getTimestamp(opId);
    console.log('✅ Scheduled setPaymentContract via Timelock');
    console.log(`🕒 Executable at unix timestamp: ${ts.toString()}`);
}

main().catch((err) => {
    console.error('❌ Scheduling failed:', err);
    process.exit(1);
});

/* 
OZ TimelockController schedule() 표준 시그니처 
function schedule(
        address target, // 호출할 컨트랙트 주소 
        uint256 value,  // 전송할 ETH 금액 (없으면 0)
        bytes calldata data, // 함수 전체 calldata(selector + 인코딩된 파라미터)
        bytes32 predecessor, // 선행 작업 해시(없으면 bytes32(0))
        bytes32 salt, // 고유 식별자 
        uint256 delay  // minDelay 이상 
    ) 
*/

/*
중복 예약/실행 실수 방지 위해 OZ TimelockController의 Opeartion 상태확인 기능 도입 
    •	isOperationDone: 이미 실행된 작업이면 재예약 불가 → 즉시 종료
    •	isOperationReady: 지금 바로 실행 가능 → 예약 스킵하고 실행 스크립트로 안내
    •	**isOperation(opId)**만 true면 아직 대기 중(pending) → ETA만 보여주고 종료
    •	그 외에는 새로 schedule 진행
*/