// (나) 이 파일의 용도: NFT 메타데이터(JSON형식)를 IPFS에 업로드하는 것 

import axios from 'axios';  // HTTP 요청을 보낼 때 사용할 axios를 불러옴
import { jwt } from '../pinata.config';  // Pinata API 인증용 JWT 토큰을 불러온다 
import * as fs from "fs";
import path from 'path';
import FormData from "form-data";

// 업로드할 로컬 폴더 경로 (이미 존재하는 폴더)
const LOCAL_METADATA_DIR = path.resolve(__dirname, "coupon_metadata"); // pinata/apis/coupon_metadata

function validateJsonFiles(dir: string) {
    if (!fs.existsSync(dir)) {
        throw new Error(`❌ Not found: ${dir}`);
    }
    const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
    if (files.length === 0) {
        throw new Error(`❌ No .json files in ${dir}`);
    }

    // 간단한 유효성 검사: 파일명은 10진수 id.json, 내용은 JSON 파싱 가능
    for (const f of files) {
        const match = f.match(/^(\d+)\.json$/);
        if (!match) {
            throw new Error(`❌ Invalid filename "${f}". Expected "<id>.json" (e.g., 1.json)`);
        }
        const full = path.join(dir, f);
        try {
            JSON.parse(fs.readFileSync(full, "utf-8"));
        } catch (e) {
            throw new Error(`❌ Invalid JSON in "${f}": ${(e as Error).message}`);
        }
    }

    return files;
}


async function uploadFolderToPinata(dir: string, dirName = "coupon_metadata") {
    const files = validateJsonFiles(dir);

    const form = new FormData();
    for (const f of files) {
        const full = path.join(dir, f);
        // filepath에 dirName을 포함해 디렉터리 계층을 유지시킵니다.
        form.append("file", fs.createReadStream(full), {
            filepath: path.posix.join(dirName, f),
        });
    }

    form.append("pinataMetadata", JSON.stringify({ name: dirName }));
    form.append("pinataOptions", JSON.stringify({ wrapWithDirectory: true }));

    const res = await axios.post("https://api.pinata.cloud/pinning/pinFileToIPFS", form, {
        headers: {
            Authorization: `Bearer ${jwt}`,
            ...form.getHeaders(),
        },
        maxBodyLength: Infinity,
    });

    return res.data as { IpfsHash: string; PinSize: number; Timestamp: string };
}

export const uploadExistingMetadataFolder = async () => {
    console.log("📦 Using existing folder:", LOCAL_METADATA_DIR);
    const data = await uploadFolderToPinata(LOCAL_METADATA_DIR, "coupon_metadata");
    const folderCID = data.IpfsHash;
    const baseURI = `https://gateway.pinata.cloud/ipfs/${folderCID}/{id}.json`;

    console.log("\n=== Folder Upload Result ===");
    console.log("📁 Folder CID:", folderCID);
    console.log("🔗 BASE_URI   :", baseURI);

    // 결과 저장
    const outDir = path.resolve(__dirname, "../build");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, "metadata.folder.pin.results.json");
    fs.writeFileSync(
        outFile,
        JSON.stringify({ folderCID, baseURI, files: fs.readdirSync(LOCAL_METADATA_DIR) }, null, 2),
        "utf-8"
    );
    console.log(`\n📝 saved: ${outFile}`);

    return { folderCID, baseURI };
};

uploadExistingMetadataFolder()
    .then(() => console.log("✅ Folder metadata upload complete"))
    .catch((err) => {
        console.error("❌ Folder upload failed:", err);
        process.exit(1);
    });