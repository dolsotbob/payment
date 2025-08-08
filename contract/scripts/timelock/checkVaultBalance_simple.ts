// scripts/timelock/checkVaultBalance_simple.ts
import { ethers } from "hardhat";
import "dotenv/config";

async function main() {
    const VAULT = process.env.VAULT_ADDRESS!;
    if (!VAULT) throw new Error("VAULT_ADDRESS missing in .env");

    const vault = await ethers.getContractAt("Vault", VAULT);

    // Vault에 들어있는 토큰 잔액(원시 단위)
    const rawBal = await vault.getVaultBalance();

    console.log("Vault address:", VAULT);
    console.log("Vault balance (raw):", rawBal.toString());

    // decimals 변환하려면 토큰 주소를 읽어서 처리
    const tokenAddr = await vault.token();
    const token = await ethers.getContractAt(
        ["function decimals() view returns (uint8)", "function symbol() view returns (string)"],
        tokenAddr
    );
    const dec = await token.decimals();
    const sym = await token.symbol();
    console.log("Token:", tokenAddr, `(${sym}, dec=${dec})`);
    console.log("Vault balance (human):", ethers.formatUnits(rawBal, dec));
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

// 실행 예: 
// npx hardhat run scripts/timelock/checkVaultBalance_simple.ts --network kairos