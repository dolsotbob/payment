// scripts/setTokenURIs.ts
import { ethers } from "hardhat";
import fs from "fs";
import path from "path";
import "dotenv/config";

interface MetadataPinResult {
    id: string;
    cid: string;
    tokenUri: string;
}

async function main() {
    const contractAddress = process.env.COUPON1155_ADDRESS;
    if (!contractAddress) {
        throw new Error("❌ COUPON1155_ADDRESS is not set in .env");
    }

    // === 1) metadata.pin.results.json 파일 읽기 ===
    const resultsPath = path.resolve(__dirname, "../build/metadata.pin.results.json");
    if (!fs.existsSync(resultsPath)) {
        throw new Error(`❌ Metadata results file not found: ${resultsPath}`);
    }

    const results: MetadataPinResult[] = JSON.parse(fs.readFileSync(resultsPath, "utf-8"));
    if (results.length === 0) {
        throw new Error("❌ No metadata entries found in results file");
    }

    console.log(`📦 Loaded ${results.length} metadata entries from ${resultsPath}`);

    // === 2) 컨트랙트 인스턴스 불러오기 ===
    const coupon1155 = await ethers.getContractAt("Coupon1155", contractAddress);

    // === 3) 각 id → tokenURI 세팅 ===
    for (const { id, tokenUri } of results) {
        console.log(`⏳ Setting tokenURI for ID ${id} → ${tokenUri}`);
        const tx = await coupon1155.setTokenURI(ethers.toBigInt(id), tokenUri);
        await tx.wait();
        console.log(`✅ Done: ID ${id}`);
    }

    console.log("🎉 All tokenURIs set successfully!");
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});