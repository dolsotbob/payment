import path from "path"; import dotenv from "dotenv";
dotenv.config({ path: path.resolve(__dirname, "../../.env") });

import { ethers } from "hardhat";
import { Interface } from "ethers";

async function main() {
    const PROXY = process.env.PAYMENT_ADDRESS!;
    const TL = process.env.TIMELOCK_ADDRESS!;
    const NEW = process.env.NEW_IMPL_PAYMENT!;

    console.log({ PROXY, TL, NEW });

    // 공용 인터페이스 모음 (있는 것만 응답됨)
    const iAccess = new Interface([
        "function hasRole(bytes32,address) view returns (bool)",
        "function getRoleAdmin(bytes32) view returns (bytes32)",
        "function UPGRADER_ROLE() view returns (bytes32)"
    ]);
    const iOwnable = new Interface([
        "function owner() view returns (address)"
    ]);
    const iPausable = new Interface([
        "function paused() view returns (bool)"
    ]);
    const iERC165 = new Interface([
        "function supportsInterface(bytes4) view returns (bool)"
    ]);

    // helper: eth_call with from=Timelock
    const call = async (data: string) => {
        try {
            const ret = await ethers.provider.call({ to: PROXY, data, from: TL });
            return { ok: true, ret };
        } catch (e: any) {
            const body = e?.body && (() => { try { return JSON.parse(e.body); } catch { return null; } })();
            const data0 = body?.error?.data ?? e?.data ?? e?.value?.data ?? e?.info?.error?.data;
            return { ok: false, err: (e?.reason || e?.shortMessage || e?.message), raw: data0 };
        }
    };

    // 0) owner()
    try {
        const { ret, ok, err } = await call(iOwnable.encodeFunctionData("owner", [])) as any;
        if (ok) {
            const [owner] = iOwnable.decodeFunctionResult("owner", ret);
            console.log("owner():", owner);
        } else {
            console.log("owner() call failed:", err);
        }
    } catch { }

    // 1) supportsInterface(IAccessControl=0x7965db0b)
    const IAccessControlId = "0x7965db0b";
    try {
        const { ok, ret } = await call(iERC165.encodeFunctionData("supportsInterface", [IAccessControlId])) as any;
        if (ok) console.log("supports AccessControl:", iERC165.decodeFunctionResult("supportsInterface", ret)[0]);
    } catch { }

    // 2) UPGRADER_ROLE 상수/hasRole(TL) 확인
    let upgraderRole: string | null = null;
    try {
        const { ok, ret } = await call(iAccess.encodeFunctionData("UPGRADER_ROLE", [])) as any;
        if (ok) {
            upgraderRole = iAccess.decodeFunctionResult("UPGRADER_ROLE", ret)[0];
            console.log("UPGRADER_ROLE():", upgraderRole);
        } else {
            console.log("UPGRADER_ROLE() not found (or call failed)");
        }
    } catch { }
    if (upgraderRole) {
        try {
            const { ok, ret } = await call(iAccess.encodeFunctionData("hasRole", [upgraderRole, TL])) as any;
            if (ok) {
                const has = iAccess.decodeFunctionResult("hasRole", ret)[0];
                console.log("hasRole(UPGRADER_ROLE, TL):", has);
            }
        } catch { }
    } else {
        // 상수가 public이 아닐 수 있으니 문자열 해시로 추정
        const guessed = ethers.id("UPGRADER_ROLE"); // keccak256("UPGRADER_ROLE")
        try {
            const { ok, ret } = await call(iAccess.encodeFunctionData("hasRole", [guessed, TL])) as any;
            if (ok) {
                const has = iAccess.decodeFunctionResult("hasRole", ret)[0];
                console.log("hasRole(keccak('UPGRADER_ROLE'), TL):", has, "(guessed)");
                if (!has) console.log("↳ TL에 업그레이더 롤이 없을 가능성");
            }
        } catch { }
    }

    // 3) paused()
    try {
        const { ok, ret } = await call(iPausable.encodeFunctionData("paused", [])) as any;
        if (ok) {
            const paused = iPausable.decodeFunctionResult("paused", ret)[0];
            console.log("paused():", paused);
        }
    } catch { }

    // 4) 마지막으로 upgradeTo를 드라이런 (from=Timelock) — 혹시 이번엔 문자열이 나올 수도
    const iUUPS = new Interface(["function upgradeTo(address)"]);
    const data = iUUPS.encodeFunctionData("upgradeTo", [NEW]);
    const res = await call(data);
    if (res.ok) console.log("upgradeTo dry-run: would succeed ✅");
    else {
        console.log("upgradeTo dry-run REVERT ⛔️", res.err);
        console.log("raw:", res.raw || "<none>");
    }
}

main().catch(e => { console.error(e); process.exit(1); });