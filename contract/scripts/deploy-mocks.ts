import { ethers, network } from "hardhat";
import fs from "fs";
import path from "path";
import "dotenv/config";

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log(`⛓  Network: ${network.name}`);
    console.log(`👤 Deployer: ${deployer.address}`);

    // --- MockPermitERC20 ---
    const TokenF = await ethers.getContractFactory("MockPermitERC20");
    const token = await TokenF.deploy();
    await token.waitForDeployment();
    const tokenAddr = await token.getAddress();
    console.log(`✅ MockPermitERC20 deployed: ${tokenAddr}`);

    // --- MockVault ---
    const VaultF = await ethers.getContractFactory("MockVault");
    const vault = await VaultF.deploy();
    await vault.waitForDeployment();
    const vaultAddr = await vault.getAddress();
    console.log(`✅ MockVault deployed:       ${vaultAddr}`);

    // 저장(선택): deployments/mocks.<network>.json
    const outDir = path.join(process.cwd(), "deployments");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
    const outPath = path.join(outDir, `mocks.${network.name}.json`);
    const out = {
        network: network.name,
        deployer: deployer.address,
        MockPermitERC20: tokenAddr,
        MockVault: vaultAddr,
        timestamp: new Date().toISOString(),
    };
    fs.writeFileSync(outPath, JSON.stringify(out, null, 2));
    console.log(`📝 Saved: ${outPath}`);
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});