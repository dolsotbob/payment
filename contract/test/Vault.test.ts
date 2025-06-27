import { ethers } from "hardhat";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";

describe("Vault", () => {
    let token: any;
    let vault: any;
    let owner: any;
    let treasury: any;
    let user: any;

    beforeEach(async () => {
        [owner, treasury, user] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("TestToken");
        token = await Token.deploy(ethers.parseUnits("1000000", 18));

        const Vault = await ethers.getContractFactory("Vault");
        vault = await Vault.deploy(token.target, treasury.address);

        // 오너가 Vault에 토큰 보내기
        await token.transfer(vault.target, ethers.parseUnits("1000", 18));
    });

    it("Should allow owner to withdraw to specific address", async () => {
        const amount = ethers.parseUnits("500", 18);
        await vault.withdraw(user.address, amount);

        const userBalance = await token.balanceOf(user.address);
        expect(userBalance).to.equal(amount);
    });

    it("Should allow sweeping to treasury", async () => {
        const balance = await token.balanceOf(vault.target);
        await vault.sweepToTreasury();

        const treasuryBalance = await token.balanceOf(treasury.address);
        expect(treasuryBalance).to.equal(balance);
    });

    it("Should not allow non-owner to withdraw", async () => {
        await expect(
            vault.connect(user).withdraw(user.address, ethers.parseUnits("100", 18))
        ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });
});