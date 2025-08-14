// (나) 이 파일의 용도: NFT 메타데이터(JSON형식)를 IPFS에 업로드하는 것 

import axios from 'axios';  // HTTP 요청을 보낼 때 사용할 axios를 불러옴
import { jwt } from '../pinata.config';  // Pinata API 인증용 JWT 토큰을 불러온다 
import * as fs from "fs";
import path from 'path';
// import { uploadFileToIPFS } from './upload.file';  // 이미지 자동 업로드 붙일 때 사용 

type Attr = { trait_type: string; value: string };
type Meta = {
    name: string;
    description: string;
    image: string; // ipfs://CID 또는 게이트웨이 URL
    attributes: Attr[];
};

export const uploadMetaData = async () => {
    // const imageUrl = await uploadFileToIPFS();
    // (나) 위 주석 처리된 코드는 이미지를 먼저 IPFS에 업로드하고 그 URL을 메타데이터에 넣으려는 코드(나중에 자동화할 때 쓰면 좋음) 
    // IPFS에 업로드할 JSON 객체 (메타데이터) 정의 
    const metadataList: Meta[] = [
        {
            name: "Spring Corn",
            description: "5%-single-use discount coupon issued in Spring, from March to May",
            image: "https://gateway.pinata.cloud/ipfs/bafybeiax2hk6c6t6nnpuaxezjklbr5fgpxa7steg62nvp5k6xd2obt7gve", // IPFS CID URL
            attributes: [
                { trait_type: "ID", value: "1" },
                { trait_type: "Season", value: "Spring" },
                { trait_type: "Crop", value: "Corn" },
                { trait_type: "Discount Rate", value: "500" },
                { trait_type: "Consumable", value: "true" },
                { trait_type: "Uses", value: "1" },
                { trait_type: "ExpiresMode", value: "AFTER_PURCHASE_1Y" },
                { trait_type: "PriceCapTORI", value: "50" },
            ],
        },
        {
            name: "Summer Barley",
            description: "10%-single-use discount coupon issued in Summer, from June to August",
            image: "https://gateway.pinata.cloud/ipfs/bafybeig4d2cbarj25wsdrcagz46twl5hnybncbcvbmglpu4ahuo3zytrhu",
            attributes: [
                { trait_type: "ID", value: "2" },
                { trait_type: "Season", value: "Summer" },
                { trait_type: "Crop", value: "Barley" },
                { trait_type: "Discount Rate", value: "1000" }, // 10% = 1000 bps
                { trait_type: "Consumable", value: "true" },
                { trait_type: "Uses", value: "1" },
                { trait_type: "ExpiresMode", value: "AFTER_PURCHASE_1Y" },
                { trait_type: "PriceCapTORI", value: "50" }
            ],
        },
        {
            name: "Autumn Soybean",
            description: "5%-three-use discount coupon issued in Autumn, from September to November",
            image: "https://gateway.pinata.cloud/ipfs/bafybeicsufh26x77eytcmj77k2gjxov6pvinr5z4m5hnjwopg77q5udeuu",
            attributes: [
                { trait_type: "ID", value: "3" },
                { trait_type: "Season", value: "Autumn" },
                { trait_type: "Crop", value: "Soybean" },
                { trait_type: "Discount Rate", value: "500" }, // 5% = 500 bps
                { trait_type: "Consumable", value: "true" },
                { trait_type: "Uses", value: "3" },
                { trait_type: "ExpiresMode", value: "AFTER_PURCHASE_1Y" },
                { trait_type: "PriceCapTORI", value: "50" }
            ],
        },
        {
            name: "Winter Rye",
            description: "20%-single-use discount coupon issued in Winter, from December to February",
            image: "https://gateway.pinata.cloud/ipfs/bafybeiayrv6o2leusmwph4wldpe2mnahp3gfut6rxxxgmped6jfvomcboy",
            attributes: [
                { trait_type: "ID", value: "4" },
                { trait_type: "Season", value: "Winter" },
                { trait_type: "Crop", value: "Rye" },
                { trait_type: "Discount Rate", value: "2000" }, // 20% = 2000 bps
                { trait_type: "Consumable", value: "true" },
                { trait_type: "Uses", value: "1" },
                { trait_type: "ExpiresMode", value: "AFTER_PURCHASE_1Y" },
                { trait_type: "PriceCapTORI", value: "50" }
            ],
        },
        {
            name: "Wheat",
            description: "5% discount coupon (permanent). No expiration.",
            image: "https://gateway.pinata.cloud/ipfs/bafybeifup5qzp6nhmw6l3to2ewljxckxsuqrdctflvzjbbfitxcrwvi3na",
            attributes: [
                { trait_type: "ID", value: "5" },
                { trait_type: "Season", value: "Any" },
                { trait_type: "Crop", value: "Wheat" },
                { trait_type: "Discount Rate", value: "500" },
                { trait_type: "Consumable", value: "false" },
                { trait_type: "Uses", value: "unlimited" },
                { trait_type: "ExpiresMode", value: "NONE" },
                { trait_type: "PriceCapTORI", value: "50" }
            ],
        },
        {
            name: "Rice",
            description: "5% discount coupon (permanent). No expiration.",
            image: "https://gateway.pinata.cloud/ipfs/bafybeidole6tczedsajqpmh2pk4ihxi3xus72w4de523ae2sqecgxka2o4",
            attributes: [
                { trait_type: "ID", value: "6" },
                { trait_type: "Season", value: "Any" },
                { trait_type: "Crop", value: "Rice" },
                { trait_type: "Discount Rate", value: "500" },
                { trait_type: "Consumable", value: "false" },
                { trait_type: "Uses", value: "unlimited" },
                { trait_type: "ExpiresMode", value: "NONE" },
                { trait_type: "PriceCapTORI", value: "50" }
            ],
        },
        {
            name: "Bonus",
            description: "25%-single-use discount coupon. Valid for 1 year after purchase.",
            image: "https://gateway.pinata.cloud/ipfs/bafybeidz5wy6jka64ext4ui3j4u27zu4inhz342q2e23cnmfqsrsspo7hy",
            attributes: [
                { trait_type: "ID", value: "7" },
                { trait_type: "Season", value: "Any" },
                { trait_type: "Crop", value: "Bonus" },
                { trait_type: "Discount Rate", value: "2500" }, // 25% = 2500 bps
                { trait_type: "Consumable", value: "true" },   // ※ 용도 미지정 → 단일 사용으로 가정
                { trait_type: "Uses", value: "1" },
                { trait_type: "ExpiresMode", value: "AFTER_PURCHASE_1Y" },
                { trait_type: "PriceCapTORI", value: "50" }
            ],
        },
    ];

    const results: { id: string; cid: string; tokenUri: string }[] = [];

    for (const meta of metadataList) {
        // (옵션) 자동 이미지 업로드 파이프라인 연결 예시
        // if (meta.image.startsWith("file://")) {
        //   const cid = await uploadFileToIPFS(meta.image.replace("file://", ""));
        //   meta.image = `ipfs://${cid}`;
        // }

        // ID 추출(컨트랙트에서 매핑할 용도)
        const idAttr = meta.attributes.find((a) => a.trait_type === "ID");
        const id = idAttr?.value ?? "unknown";

        const body = {
            pinataMetadata: {
                name: `coupon-${id}-${meta.name}`.toLowerCase().replace(/\s+/g, "-"),
            },
            pinataContent: meta,
        };

        try {
            // Pinata의 JSON 업로드 API에 POST 요청을 보냄 
            const { data } = await axios.post(
                "https://api.pinata.cloud/pinning/pinJSONToIPFS",
                body,
                {
                    headers: {
                        Authorization: `Bearer ${jwt}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            // 업로드 결과로 받은 CID를 이용해 Token URI 생성 (이걸 NFT 스마트 계약에 넣어야 토큰이 올바른 메타데이터를 가리킴)
            const cid = data.IpfsHash;
            const tokenUri = `https://gateway.pinata.cloud/ipfs/${cid}`;
            results.push({ id, cid, tokenUri });
            console.log('\n메타데이터를 IPFS에 업로드합니다.');
            console.log(`✅ [${id}] pinned: ${cid} → ${tokenUri}`);
        } catch (err) {
            console.error(`❌ [${id}] pin failed`, err);
        }
    }

    console.log("\n=== summary ===");
    results.forEach((r) => console.log(`[${r.id}] ${r.tokenUri}`));

    // 결과 저장 (예: ./build/metadata.pin.results.json)
    const outDir = path.resolve(__dirname, "../build");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    const outFile = path.join(outDir, "metadata.pin.results.json");
    fs.writeFileSync(outFile, JSON.stringify(results, null, 2), "utf-8");
    console.log(`\n📝 saved: ${outFile}`);

    return results;
};

uploadMetaData()
    .then(() => {
        console.log("✅ Metadata upload complete");
    })
    .catch((err) => {
        console.error("❌ Metadata upload failed:", err);
        process.exit(1);
    });