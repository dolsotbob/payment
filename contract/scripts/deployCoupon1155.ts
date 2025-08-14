import { ethers, network } from "hardhat";
import "dotenv/config";

function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v || v.trim() === "") {
        throw new Error(`❌ Missing required env: ${name}`);
    }
    return v.trim();
}

function parseCommaNums(name: string, allowEmpty = false): number[] {
    const raw = (process.env[name] || "").trim();
    if (raw === "") {
        if (allowEmpty) return [];
        throw new Error(`❌ Missing required env: ${name}`);
    }
    return raw.split(",").map((x) => {
        const n = Number(x.trim());
        if (!Number.isFinite(n) || n < 0) {
            throw new Error(`❌ ${name} has invalid number: "${x}"`);
        }
        return n;
    });
}

async function main() {
    console.log(`📡 Network: ${network.name}`);

    // 필수값
    const BASE_URI = requireEnv("COUPON1155_BASE_URI"); // 예: https://cdn.example.com/coupons/{id}.json
    const INITIAL_OWNER = requireEnv("COUPON1155_INITIAL_OWNER"); // 소유자(민트/URI설정 권한)

    // 선택값(초기 배포 시 민트)
    const DO_INITIAL_MINT = (process.env.COUPON1155_DO_INITIAL_MINT || "false").toLowerCase() === "true";
    const MINT_TO = process.env.COUPON1155_MINT_TO?.trim() || "";
    const MINT_IDS = process.env.COUPON1155_MINT_IDS?.trim() || "";
    const MINT_AMOUNTS = process.env.COUPON1155_MINT_AMOUNTS?.trim() || "";

    console.log("🔧 Params");
    console.log("  BASE_URI          :", BASE_URI);
    console.log("  INITIAL_OWNER     :", INITIAL_OWNER);
    console.log("  DO_INITIAL_MINT   :", DO_INITIAL_MINT);
    if (DO_INITIAL_MINT) {
        console.log("  MINT_TO           :", MINT_TO);
        console.log("  MINT_IDS          :", MINT_IDS);
        console.log("  MINT_AMOUNTS      :", MINT_AMOUNTS);
    }

    // 배포
    const factory = await ethers.getContractFactory("Coupon1155");
    const contract = await factory.deploy(BASE_URI, INITIAL_OWNER);
    console.log("🚀 Deploying Coupon1155...");
    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log(`✅ Deployed Coupon1155 at: ${address}`);

    // 초기 민트(선택)
    if (DO_INITIAL_MINT) {
        if (!MINT_TO) throw new Error("❌ COUPON1155_MINT_TO is required when DO_INITIAL_MINT=true");
        if (!MINT_IDS || !MINT_AMOUNTS) {
            throw new Error("❌ COUPON1155_MINT_IDS and COUPON1155_MINT_AMOUNTS are required when DO_INITIAL_MINT=true");
        }
        const ids = parseCommaNums("COUPON1155_MINT_IDS");
        const amounts = parseCommaNums("COUPON1155_MINT_AMOUNTS");
        if (ids.length !== amounts.length) {
            throw new Error("❌ MINT_IDS length must equal MINT_AMOUNTS length");
        }

        console.log(`🪙 Minting batch to ${MINT_TO} ...`);
        const tx = await contract.mintBatch(MINT_TO, ids, amounts, "0x");
        const rcpt = await tx.wait();
        console.log(`✅ Minted. tx: ${rcpt?.hash}`);
    }

    // 참고: Kairos(Kaia)에서는 Etherscan-like API 키가 없으면 자동 verify가 어려울 수 있습니다.
    // 가능한 경우, 아래를 활용:
    // await run("verify:verify", { address, constructorArguments: [BASE_URI, INITIAL_OWNER] });
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});