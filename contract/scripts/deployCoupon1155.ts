import { ethers, network, run } from "hardhat";
import { makeAbi } from './abiGenerator';
import fs from 'fs';
import path from 'path';
import "dotenv/config";

function requireEnv(name: string): string {
    const v = process.env[name];
    if (!v || v.trim() === "") throw new Error(`❌ Missing required env: ${name}`);
    return v.trim();
}

// "1,2,3" 또는 "0x01,0x02" 모두 허용. 문자열 그대로 반환(정밀도 안전)
function parseIdList(name: string, allowEmpty = false): string[] {
    const raw = (process.env[name] || "").trim();
    if (raw === "") {
        if (allowEmpty) return [];
        throw new Error(`❌ Missing required env: ${name}`);
    }
    const arr = raw.split(",").map((s) => s.trim());
    // 간단한 유효성(정수/hex)
    arr.forEach((id) => {
        if (!/^(\d+|0x[0-9a-fA-F]+)$/.test(id)) {
            throw new Error(`❌ ${name} has invalid id: "${id}"`);
        }
    });
    // 중복 방지
    const uniq = new Set(arr.map((x) => x.toLowerCase()));
    if (uniq.size !== arr.length) {
        throw new Error(`❌ ${name} has duplicated ids`);
    }
    return arr;
}

function parseAmountList(name: string, allowEmpty = false): string[] {
    const raw = (process.env[name] || "").trim();
    if (raw === "") {
        if (allowEmpty) return [];
        throw new Error(`❌ Missing required env: ${name}`);
    }
    const arr = raw.split(",").map((s) => s.trim());
    arr.forEach((amt) => {
        if (!/^\d+$/.test(amt) || BigInt(amt) <= 0n) {
            throw new Error(`❌ ${name} has invalid amount: "${amt}"`);
        }
    });
    return arr;
}

// "id:uri,id:uri" 형태 파싱
function parseIdUriPairs(name: string): Array<{ id: string; uri: string }> {
    const raw = (process.env[name] || "").trim();
    if (raw === "") return [];
    return raw.split(",").map((pair) => {
        const [id, ...uriParts] = pair.split(":");
        const uri = uriParts.join(":").trim(); // URI에 ":"가 포함될 수 있음
        if (!id || !uri) throw new Error(`❌ Invalid ${name} pair: "${pair}"`);
        if (!/^(\d+|0x[0-9a-fA-F]+)$/.test(id.trim())) {
            throw new Error(`❌ ${name} has invalid id: "${id}"`);
        }
        return { id: id.trim(), uri };
    });
}

function looksLikeErc1155BaseURI(u: string): boolean {
    // 매우 느슨한 검사: {id}.json 또는 {id} 포함
    return /\{id\}/i.test(u);
}

async function main() {
    console.log(`📡 Network: ${network.name}`);
    const [deployer] = await ethers.getSigners();
    const deployerAddr = await deployer.getAddress();
    const chainId = (await ethers.provider.getNetwork()).chainId;
    console.log(`👤 Deployer: ${deployerAddr}`);
    console.log(`⛓️  ChainId: ${chainId}`);

    // 필수값
    const BASE_URI = requireEnv("COUPON1155_BASE_URI"); // e.g., ipfs://CID/{id}.json
    const INITIAL_OWNER = requireEnv("COUPON1155_INITIAL_OWNER");

    if (!looksLikeErc1155BaseURI(BASE_URI)) {
        console.warn(
            `⚠️  COUPON1155_BASE_URI does not contain "{id}". ERC1155 clients expect {id}.json pattern unless you override uri(id).`
        );
    }

    // 선택값(초기 민트)
    const DO_INITIAL_MINT =
        (process.env.COUPON1155_DO_INITIAL_MINT || "false").toLowerCase() ===
        "true";
    const MINT_TO = (process.env.COUPON1155_MINT_TO || "").trim();

    const ids = DO_INITIAL_MINT ? parseIdList("COUPON1155_MINT_IDS") : [];
    const amounts = DO_INITIAL_MINT
        ? parseAmountList("COUPON1155_MINT_AMOUNTS")
        : [];

    if (DO_INITIAL_MINT) {
        if (!/^0x[0-9a-fA-F]{40}$/.test(MINT_TO)) {
            throw new Error("❌ COUPON1155_MINT_TO must be a valid address");
        }
        if (ids.length !== amounts.length) {
            throw new Error("❌ MINT_IDS length must equal MINT_AMOUNTS length");
        }
    }

    // 선택값(개별 URI 세팅/잠금)
    const SET_TOKEN_URIS = parseIdUriPairs("COUPON1155_SET_TOKEN_URIS"); // "1:ipfs://..,2:ipfs://.."
    const LOCK_TOKEN_URIS = parseIdList("COUPON1155_LOCK_TOKEN_URIS", true); // "1,2,3"

    // 배포
    const Coupon1155Factory = await ethers.getContractFactory("Coupon1155");
    console.log("🚀 Deploying Coupon1155...");
    const Coupon1155Contract = await Coupon1155Factory.deploy(BASE_URI, INITIAL_OWNER);
    await Coupon1155Contract.waitForDeployment();
    const coupon1155Address = await Coupon1155Contract.getAddress();
    console.log(`✅ Deployed Coupon1155 at: ${coupon1155Address}`);


    // 기본 점검
    try {
        // 있을 때만
        // @ts-ignore
        if (typeof Coupon1155Contract.owner === "function") {
            // @ts-ignore
            const owner = await Coupon1155Contract.owner();
            console.log(`🔑 owner(): ${owner}`);
        }
    } catch {
        console.warn("⚠️  owner() check skipped");
    }

    try {
        const sampleUri = await Coupon1155Contract.uri(1);
        console.log(`🔎 uri(1): ${sampleUri}`);
    } catch {
        console.warn("⚠️  uri(1) check skipped");
    }

    // 초기 민트
    if (DO_INITIAL_MINT) {
        console.log(`🪙 Minting batch to ${MINT_TO} ...`);
        // 컨트랙트에 외부 mintBatch가 반드시 있어야 함
        const tx = await Coupon1155Contract.mintBatch(MINT_TO, ids, amounts, "0x");
        const rcpt = await tx.wait(1);
        console.log(`✅ Minted. tx: ${rcpt?.hash}`);
    }

    // 개별 URI 세팅
    if (SET_TOKEN_URIS.length > 0) {
        console.log("📝 Setting per-token URIs...");
        for (const { id, uri } of SET_TOKEN_URIS) {
            const tx = await Coupon1155Contract.setTokenURI(id, uri);
            await tx.wait(1);
            console.log(`  • setTokenURI(${id}) → ${uri}`);
        }
    }

    // 개별 URI 잠금(있을 때만)
    if (LOCK_TOKEN_URIS.length > 0) {
        console.log("🔐 Locking per-token URIs...");
        // @ts-ignore: 조건부 존재
        if (typeof Coupon1155Contract.lockTokenURI === "function") {
            for (const id of LOCK_TOKEN_URIS) {
                // @ts-ignore
                const tx = await Coupon1155Contract.lockTokenURI(id);
                await tx.wait(1);
                console.log(`  • lockTokenURI(${id})`);
            }
        } else {
            console.warn("⚠️  lockTokenURI not found on contract; skipped");
        }
    }

    // (옵션) 자동 검증
    const DO_VERIFY = (process.env.DO_VERIFY || "false").toLowerCase() === "true";
    if (DO_VERIFY) {
        console.log("🧾 Verifying on explorer...");
        try {
            await run("verify:verify", {
                address: coupon1155Address,
                constructorArguments: [BASE_URI, INITIAL_OWNER],
            });
            console.log("✅ Verified");
        } catch (e) {
            console.warn("⚠️  Verify failed or not supported:", (e as Error).message);
        }
    }

    // ABI 저장
    await makeAbi("Coupon1155", coupon1155Address);

    // .env에 COUPON1155_ADDRESS 업데이트
    const envPath = path.resolve(__dirname, "..", ".env");
    let envContent = "";
    try {
        envContent = fs.readFileSync(envPath, "utf8");
    } catch {
        console.warn("⚠️ .env 파일이 없어서 새로 생성합니다.");
    }
    const newLine = `COUPON1155_ADDRESS=${coupon1155Address}`;
    if (envContent.includes("COUPON1155_ADDRESS=")) {
        envContent = envContent.replace(/COUPON1155_ADDRESS=.*/g, newLine);
    } else {
        envContent = (envContent ? envContent.trim() + "\n" : "") + newLine;
    }
    fs.writeFileSync(envPath, envContent.trim() + "\n");
    console.log(`✅ .env 파일에 COUPON1155_ADDRESS=${coupon1155Address} 저장 완료`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});