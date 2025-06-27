import { ethers } from "hardhat";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";

describe("Payment", () => {
    let token: any;
    let vault: any;
    let payment: any;
    let owner: any;
    let user: any;

    beforeEach(async () => {
        [owner, user] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("TestToken");
        token = await Token.deploy(ethers.parseUnits("1000000", 18));

        const Vault = await ethers.getContractFactory("Vault");
        vault = await Vault.deploy(token.target, owner.address);

        const Payment = await ethers.getContractFactory("Payment");
        payment = await Payment.deploy(token.target, vault.target);

        // 유저에게 토큰 주기
        await token.transfer(user.address, ethers.parseUnits("100", 18));
    });

    it("Should perform pay with cashback and send to vault", async () => {
        const amount = ethers.parseUnits("50", 18);
        const cashbackRate = await payment.cashbackRate(); // 2% → 1.0

        await token.connect(user).approve(payment.target, amount);

        const vaultBefore = await token.balanceOf(vault.target);
        const userBefore = await token.balanceOf(user.address);

        const tx = await payment.connect(user).pay(amount);
        await tx.wait();

        const cashbackAmount = amount * BigInt(cashbackRate) / BigInt(100);
        const vaultAfter = await token.balanceOf(vault.target);
        const userAfter = await token.balanceOf(user.address);

        expect(vaultAfter - vaultBefore).to.equal(amount - cashbackAmount);
        expect(userBefore - userAfter).to.equal(amount - cashbackAmount);
    });

    it("Should revert on zero amount", async () => {
        await expect(payment.connect(user).pay(0)).to.be.revertedWith(
            "Amount must be greater than 0"
        );
    });
});