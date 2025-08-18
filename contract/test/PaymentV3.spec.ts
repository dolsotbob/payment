import { expect } from "chai";
import { ethers } from "hardhat";

describe("PaymentV3", () => {
    async function deployAll() {
        const [owner, buyer] = await ethers.getSigners();

        // Token (with mock permit)
        const Token = await ethers.getContractFactory("MockPermitERC20");
        const token = await Token.deploy();
        await token.waitForDeployment();

        // Vault
        const Vault = await ethers.getContractFactory("MockVault");
        const vault = await Vault.deploy();
        await vault.waitForDeployment();

        // Coupon1155
        const C1155 = await ethers.getContractFactory("Coupon1155");
        const c1155 = await C1155.deploy("https://base/{id}.json", owner.address);
        await c1155.waitForDeployment();

        // PaymentV3
        const Payment = await ethers.getContractFactory("Payment");
        const pay = await Payment.deploy();
        await pay.waitForDeployment();
        await pay.initialize(await token.getAddress(), await vault.getAddress(), 200, 9000, owner.address);

        // seed buyer tokens & coupon
        // mint to owner initially, then transfer to buyer
        await token.transfer(buyer.address, ethers.parseUnits("1000", 18));
        await c1155.mint(buyer.address, 1, 1, "0x");

        return { owner, buyer, token, vault, c1155, pay };
    }

    it("applies ERC1155 coupon and pays with permit mock", async () => {
        const { buyer, token, c1155, pay } = await deployAll();

        // set rule
        await pay.setCouponRule({
            nft: await c1155.getAddress(),
            id: 1n,
            discountBps: 500, // 5%
            expiresAt: 0n,
            enabled: true,
            consumable: true
        });

        const price = ethers.parseUnits("100", 18);

        // mock permit: simply sets allowance
        await token.connect(buyer).permit(buyer.address, await pay.getAddress(), price, 0, 0, "0x", "0x");

        // call payment
        await expect(pay.connect(buyer).permitAndPayWithCashback(
            buyer.address,
            price,                // value
            Math.floor(Date.now() / 1000) + 3600, // deadline
            27, "0x", "0x",      // v,r,s - ignored by mock
            price,
            await c1155.getAddress(),
            1n,
            true
        )).to.emit(pay, "CouponApplied");

        // coupon should be marked used
        const used = await pay.isCouponUsed(buyer.address, await c1155.getAddress(), 1n);
        expect(used).to.eq(true);
    });

    it("reverts when coupon is expired", async () => {
        const { buyer, token, c1155, pay } = await deployAll();
        const now = (await ethers.provider.getBlock("latest"))!.timestamp;

        await pay.setCouponRule({
            nft: await c1155.getAddress(),
            id: 1n,
            discountBps: 1000,
            expiresAt: BigInt(now - 1), // already expired
            enabled: true,
            consumable: true
        });

        const price = ethers.parseUnits("50", 18);
        await token.connect(buyer).permit(buyer.address, await pay.getAddress(), price, 0, 0, "0x", "0x");

        await expect(pay.connect(buyer).permitAndPayWithCashback(
            buyer.address,
            price,
            now + 3600,
            27, "0x", "0x",
            price,
            await c1155.getAddress(),
            1n,
            true
        )).to.be.revertedWithCustomError(pay, "CouponExpired");
    });

    it("quoteDiscounted exposes reason strings", async () => {
        const { buyer, c1155, pay } = await deployAll();
        const price = ethers.parseUnits("10", 18);

        // no rule -> disabled
        const [discounted, bps, willConsume, reason] = await pay.quoteDiscounted(price, buyer.address, await c1155.getAddress(), 1n);
        expect(discounted).to.eq(price);
        expect(bps).to.eq(0);
        expect(willConsume).to.eq(false);
        expect(reason).to.be.oneOf(["disabled", "no-balance", "noop"]); // rule가 없으면 disabled로 떨어짐
    });
});