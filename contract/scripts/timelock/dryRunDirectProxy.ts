// scripts/timelock/dryRunDirectProxy.ts
import path from "path"; import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { ethers } from "hardhat";
import { Interface } from "ethers";

async function main() {
    const PROXY = process.env.PAYMENT_ADDRESS!;
    const TL = process.env.TIMELOCK_ADDRESS!;
    const NEW = process.env.NEW_IMPL_PAYMENT!;

    const iface = new Interface(["function upgradeTo(address newImplementation)"]);
    const data = iface.encodeFunctionData("upgradeTo", [NEW]);

    try {
        // eth_call with `from = Timelock` → msg.sender가 Timelock인 상황을 정확히 재현
        const ret = await ethers.provider.call({ to: PROXY, data, from: TL });
        console.log("✅ eth_call would succeed. return:", ret);
    } catch (e: any) {
        // v6 오류 객체에서 raw revert data 꺼내기 시도
        const body = e?.body && (() => { try { return JSON.parse(e.body); } catch { return null; } })();
        const data0 = body?.error?.data ?? e?.data ?? e?.value?.data ?? e?.info?.error?.data;
        console.error("⛔️ eth_call reverted.");
        console.error("raw revert data:", data0 || "<none>");
        console.error("message:", e?.reason || e?.shortMessage || e?.message);
    }
}
main().catch((e) => { console.error(e); process.exit(1); });