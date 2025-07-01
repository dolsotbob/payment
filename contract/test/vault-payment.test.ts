import { expect } from "chai";
import { ethers } from "hardhat";
import { Vault, Payment, TestToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomicfoundation/hardhat-chai-matchers";

describe("Vault ↔ Payment Integration (TS)", function () {
    let token: TestToken;
    let vault: Vault;
    let payment: Payment;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;

    beforeEach(async () => {
        [owner, user] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("TestToken");
        token = await Token.deploy(ethers.parseUnits("1000", 18)) as TestToken;

        const Vault = await ethers.getContractFactory("Vault");
        vault = await Vault.deploy(token.getAddress(), owner.address) as Vault;

        const Payment = await ethers.getContractFactory("Payment");
        payment = await Payment.deploy(token.getAddress(), vault.getAddress()) as Payment;

        await vault.connect(owner).setPaymentContract(payment.getAddress());

        await token.connect(owner)
            .approve(vault.getAddress(), ethers.parseUnits("200", 18));
        await vault.connect(owner)
            .chargeCashback(ethers.parseUnits("200", 18));

        await token.connect(owner)
            .mint(user.address, ethers.parseUnits("10", 18));
        await token.connect(user)
            .approve(payment.getAddress(), ethers.parseUnits("5", 18));
    });

    it("User should receive cashback upon pay()", async function () {
        const payAmount = ethers.parseUnits("5", 18);
        const expectedCashback = (payAmount * 2n) / 100n; // 2%

        const balBefore = await token.balanceOf(user.address);

        const tx = await payment.connect(user).pay(payAmount);  // ContractTransaction 
        await tx.wait();

        const filter = payment.filters.CashbackSent(user.address);
        const events = await payment.queryFilter(filter);
        expect(events.length).to.be.greaterThan(0);
        expect(events[0].args?.cashbackAmount).to.equal(expectedCashback);

        const balAfter = await token.balanceOf(user.address);
        const expectedBalance = balBefore - payAmount + expectedCashback;
        expect(balAfter).to.equal(expectedBalance);
    });

    it("Should revert when Vault has insufficient reserve", async function () {
        await vault.connect(owner)
            .withdraw(owner.address, ethers.parseUnits("200", 18));

        await expect(
            payment.connect(user).pay(ethers.parseUnits("5", 18))
        ).to.be.revertedWith("Insufficient cashback reserve");
    });
});