import fs from 'fs';
import path from 'path';
import type * as ethers from 'ethers';

const basePath = __dirname;
const rootDir = path.join(basePath, '../');
const frontendDir = path.join(basePath, '../../frontend/src/abis');
const sharedDir = path.join(basePath, '../../backend/src/abis'); // 백엔드에도 하나 공유 

// ABI와 address를 포함하는 JSON 생성
const makeData = (json: string, address: string | ethers.Addressable) => {
    const abi = JSON.parse(json).abi;

    return JSON.stringify(
        {
            abi: abi,
            address: address,
        },
        null,
        2
    );
};

// 특정 위치에 파일 생성
const makeFile = async (
    location: string, // 컴파일된 JSON 경로
    destinationDir: string, // 저장할 디렉토리
    filename: string, // 저장할 파일 이름
    address: string | ethers.Addressable
) => {
    const jsonPath = path.join(rootDir, location);
    const json = fs.readFileSync(jsonPath, { encoding: 'utf-8' });

    // 디렉토리 없으면 생성
    if (!fs.existsSync(destinationDir)) {
        fs.mkdirSync(destinationDir, { recursive: true });
    }

    const outputPath = path.join(destinationDir, filename);
    fs.writeFileSync(outputPath, makeData(json, address));
    console.log(`✅ ABI 저장: ${outputPath}`);
};

// 두 위치에 ABI 저장
export const makeAbi = async (
    contract: string,
    address: string | ethers.Addressable
) => {
    const artifactPath = `artifacts/contracts/${contract}.sol/${contract}.json`;
    const filename = `${contract}.json`;

    await makeFile(artifactPath, frontendDir, filename, address);
    await makeFile(artifactPath, sharedDir, filename, address);
};
