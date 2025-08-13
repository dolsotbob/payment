import { ethers, network, run } from "hardhat";
import "dotenv/config";

async function main() {
    console.log(`\n=== Deploy PaymentV2 (implementation) on ${network.name} ===`);

    // 1) PaymentV2 팩토리 취득
    const PaymentV2 = await ethers.getContractFactory("PaymentV2");

    // 2) 배포 (UUPS 구현 컨트랙트 — 프록시 아님)
    const impl = await PaymentV2.deploy();
    await impl.waitForDeployment();

    const implAddress = await impl.getAddress();
    console.log(`PaymentV2 implementation deployed at: ${implAddress}`);

    // 3) (선택) Etherscan 검증
    //    - H/H etherscan 플러그인 설정되어 있고, ETHERSCAN_API_KEY가 있으면 자동 검증
    //    - 구현 컨트랙트라서 constructor args 없음
    if (process.env.ETHERSCAN_API_KEY) {
        try {
            console.log("Verifying on Etherscan...");
            await run("verify:verify", {
                address: implAddress,
                constructorArguments: [],
            });
            console.log("✅ Verified");
        } catch (e: any) {
            const msg = (e && (e.message || e.toString())) || "";
            if (msg.includes("Already Verified")) {
                console.log("ℹ️ Already verified");
            } else {
                console.warn("⚠️ Verification skipped:", msg);
            }
        }
    } else {
        console.log("ℹ️ ETHERSCAN_API_KEY not set — skip verification");
    }

    console.log("\nNext step:");
    console.log("- Put this address into NEW_IMPL_PAYMENT in your .env");
    console.log("- Then run scheduleUpgradePayment.ts → executeUpgradePayment.ts to upgrade the proxy.\n");
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});