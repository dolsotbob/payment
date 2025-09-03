// scripts/timelock/transferOwnership.ts
import { ethers, network } from "hardhat";
import "dotenv/config";

const OWNABLE_ABI = [
    "function owner() view returns (address)",
    "function transferOwnership(address newOwner) external",
];

async function main() {
    const timelock = process.env.TIMELOCK_ADDRESS!;
    // 여러 프록시를 쉼표로 나열: PROXIES=0xPaymentProxy,0xVaultProxy
    const proxies = (process.env.PROXIES || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

    if (!timelock || proxies.length === 0) {
        throw new Error("❌ Set TIMELOCK_ADDRESS and PROXIES in .env");
    }

    console.log(`📡 Network: ${network.name}`);
    console.log(`🔐 Timelock: ${timelock}`);
    console.log(`🎯 Targets: ${proxies.join(", ")}`);

    // Timelock 배포 확인(선택적이지만 권장)
    const code = await ethers.provider.getCode(timelock);
    if (code === "0x") throw new Error("❌ TIMELOCK_ADDRESS has no code (not a contract?)");

    const [signer] = await ethers.getSigners();

    for (const proxy of proxies) {
        // ✅ Vault, Payment 등 어떤 Ownable 컨트랙트든 프록시 주소만 주면 동작
        const c = new ethers.Contract(proxy, OWNABLE_ABI, signer);

        const owner: string = await c.owner();
        console.log(`\n[${proxy}] current owner: ${owner}`);

        if (owner.toLowerCase() === timelock.toLowerCase()) {
            console.log(" - already owned by Timelock. skip.");
            continue;
        }

        const tx = await c.transferOwnership(timelock);
        console.log(` - transferOwnership tx: ${tx.hash}`);
        await tx.wait();

        const newOwner: string = await c.owner();
        console.log(` - new owner: ${newOwner}`);
    }

    console.log("\n✅ Ownership transfer completed.");
}

main().catch((e) => {
    console.error("❌ Ownership transfer failed:", e);
    process.exit(1);
});