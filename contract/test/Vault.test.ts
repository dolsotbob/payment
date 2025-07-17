import { ethers } from "hardhat";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import type { TestToken, Vault } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Vault", () => {
    let token: TestToken;
    let vault: Vault;
    let owner: SignerWithAddress;
    let treasury: any;
    let user: any;

    beforeEach(async () => {
        [owner, treasury, user] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("TestToken");
        token = await Token.deploy(ethers.parseUnits("1000000", 18));

        const Vault = await ethers.getContractFactory("Vault");
        vault = await Vault.deploy(token.target, treasury.address);

        // Vault에 수익금 토큰 입금 
        await token.transfer(vault.target, ethers.parseUnits("1000", 18));
    });

    it("Should allow owner to charge cashback", async () => {
        const chargeAmount = ethers.parseUnits("300", 18);
        await token.approve(vault.target, chargeAmount);
        await vault.chargeCashback(chargeAmount);

        const vaultBalance = await token.balanceOf(vault.target);
        expect(vaultBalance).to.be.gte(chargeAmount);
    });

    it("Should allow paymentContract to provide cashback", async () => {
        await vault.setPaymentContract(owner.address); // owner를 임시 paymentContract로 설정

        const to = user.address;
        const amount = ethers.parseUnits("200", 18);
        await vault.provideCashback(to, amount);

        const balance = await token.balanceOf(to);
        expect(balance).to.equal(amount);
    });

    it("Should revert provideCashback if not called by paymentContract", async () => {
        await expect(
            vault.connect(user).provideCashback(user.address, ethers.parseUnits("100", 18))
        ).to.be.revertedWith("Not authorized");
    });

    it("Should allow owner to withdraw to specific address", async () => {
        const amount = ethers.parseUnits("500", 18);
        await vault.withdraw(user.address, amount);

        const userBalance = await token.balanceOf(user.address);
        expect(userBalance).to.equal(amount);
    });

    it("Should allow sweeping to treasury", async () => {
        const beforeBalance = await token.balanceOf(vault.target);
        await vault.sweepToTreasury();

        const treasuryBalance = await token.balanceOf(treasury.address);
        const afterVaultBalance = await token.balanceOf(vault.target);

        expect(treasuryBalance).to.equal(beforeBalance);
        expect(afterVaultBalance).to.equal(0);
    });

    it("Should not allow non-owner to withdraw", async () => {
        await expect(
            vault.connect(user).withdraw(user.address, ethers.parseUnits("100", 18))
        ).to.be.revertedWithCustomError(vault, "OwnableUnauthorizedAccount");
    });

    it("Should allow setPaymentContract and provide cashback", async () => {
        const cashbackAmount = ethers.parseUnits("200", 18);

        // paymentContract 권한 부여
        await vault.setPaymentContract(owner.address);

        const beforeBalance = await token.balanceOf(user.address);
        await vault.provideCashback(user.address, cashbackAmount);
        const afterBalance = await token.balanceOf(user.address);

        expect(afterBalance - beforeBalance).to.equal(cashbackAmount);
    });

});