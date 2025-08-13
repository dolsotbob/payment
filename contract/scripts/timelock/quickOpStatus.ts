// scripts/timelock/quickOpStatus.ts
import { Interface } from "ethers";
import { ethers } from "hardhat";
import "dotenv/config";

function saltHash(s: string) {
    return ethers.keccak256(ethers.toUtf8Bytes(s));
}
function buildOpId(target: string, value: bigint, data: string, predecessor: string, salt: string) {
    const abi = ethers.AbiCoder.defaultAbiCoder();
    return ethers.keccak256(
        abi.encode(
            ["address", "uint256", "bytes32", "bytes32", "bytes32"],
            [target, value, ethers.keccak256(data), predecessor, saltHash(salt)]
        )
    );
}

async function main() {
    const TL = process.env.TIMELOCK_ADDRESS!;
    const PROXY = process.env.PAYMENT_ADDRESS!;
    const NEW_IMPL = process.env.NEW_IMPL_PAYMENT!;
    const SALT = process.env.SALT_UPGRADE || "payment-upgrade";

    const tl = await ethers.getContractAt("TimelockController", TL);

    // schedule/execute와 "동일한" ABI/인코딩
    const iface = new Interface(["function upgradeTo(address)"]);
    const data = iface.encodeFunctionData("upgradeTo", [NEW_IMPL]);

    const predecessor = ethers.ZeroHash;
    const value = 0n;
    const opId = buildOpId(PROXY, value, data, predecessor, SALT);

    const minDelay = await (tl as any).getMinDelay();
    const ts = await (tl as any).getTimestamp(opId);     // ETA (0이면 예약 기록 없음)
    const latest = await ethers.provider.getBlock("latest");
    const now = latest?.timestamp ?? 0;

    const pending = await (tl as any).isOperationPending?.(opId).catch(() => null);
    const ready = await (tl as any).isOperationReady?.(opId).catch(() => null);
    const done = await (tl as any).isOperationDone?.(opId).catch(() => null);

    console.log({ TL, PROXY, NEW_IMPL, SALT, minDelay: minDelay.toString() });
    console.log({ opId, ETA: ts.toString(), now, delta: Number(ts) - now, pending, ready, done });
}
main().catch(e => { console.error(e); process.exit(1); });