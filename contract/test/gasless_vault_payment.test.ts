import { expect } from "chai";
import { ethers } from "hardhat";
import { Vault, Payment, TestToken, MyForwarder } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
import "@nomicfoundation/hardhat-chai-matchers";

describe("Vault ↔ Payment Integration (TS)", function () {
    let token: TestToken;
    let vault: Vault;
    let payment: Payment;
    let forwarder: MyForwarder;
    let owner: SignerWithAddress;
    let user: SignerWithAddress;

    beforeEach(async () => {
        [owner, user] = await ethers.getSigners();

        const Token = await ethers.getContractFactory("TestToken");
        token = await Token.deploy(ethers.parseUnits("1000", 18)) as TestToken;

        const Forwarder = await ethers.getContractFactory("MyForwarder");
        forwarder = await Forwarder.deploy("MyForwarder") as MyForwarder;

        const Vault = await ethers.getContractFactory("Vault");
        vault = await Vault.deploy(token.getAddress(), owner.address) as Vault;

        const Payment = await ethers.getContractFactory("Payment");
        payment = await Payment.deploy(
            await token.getAddress(),
            await vault.getAddress(),
            await forwarder.getAddress()
        ) as Payment;

        await vault.connect(owner).setPaymentContract(payment.getAddress());

        await token.connect(owner).approve(vault.getAddress(), ethers.parseUnits("200", 18));
        await vault.connect(owner).chargeCashback(ethers.parseUnits("200", 18));

        await token.connect(owner).mint(user.address, ethers.parseUnits("10", 18));
        await token.connect(user).approve(payment.getAddress(), ethers.parseUnits("5", 18));
    });

    it("User should receive cashback upon pay()", async function () {
        const payAmount = ethers.parseUnits("5", 18);
        const expectedCashback = (payAmount * 2n) / 100n;

        const balBefore = await token.balanceOf(user.address);

        const tx = await payment.connect(user).pay(payAmount);
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
        await vault.connect(owner).withdraw(owner.address, ethers.parseUnits("200", 18));

        await expect(
            payment.connect(user).pay(ethers.parseUnits("5", 18))
        ).to.be.revertedWith("Insufficient cashback reserve");
    });

    it("User pays via Forwarder (meta-tx) and receives cashback without gas usage", async function () {
        const payAmount = ethers.parseUnits("5", 18);
        const expectedCashback = (payAmount * 2n) / 100n;

        const userInitialEth = await ethers.provider.getBalance(user.address);
        const userInitialToken = await token.balanceOf(user.address);

        // ➤ meta-tx 데이터 구성 (ForwardRequest 타입)
        const nonce = await forwarder.nonces(user.address);
        const deadline = Math.floor(Date.now() / 1000) + 3600;

        const data = payment.interface.encodeFunctionData("pay", [payAmount]);

        const domain = {
            name: "MyForwarder",
            version: "1",
            chainId: (await ethers.provider.getNetwork()).chainId,
            verifyingContract: await forwarder.getAddress(),
        };

        const types = {
            ForwardRequest: [
                { name: "from", type: "address" },
                { name: "to", type: "address" },
                { name: "value", type: "uint256" },
                { name: "gas", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint48" },
                { name: "data", type: "bytes" },
            ],
        };

        const message = {
            from: user.address,
            to: await payment.getAddress(),
            value: 0,
            gas: 1_000_000,
            nonce: nonce,
            deadline: deadline,
            data,
        };

        // ➤ user가 서명한 EIP-712 signature 생성
        const signature = await user.signTypedData(domain, types, message);

        // ➤ forwarder가 execute 호출 (gas 대납)
        const tx = await forwarder.connect(owner).execute({ ...message, signature });
        await tx.wait();

        const userFinalEth = await ethers.provider.getBalance(user.address);
        const userFinalToken = await token.balanceOf(user.address);

        // ➤ Cashback 검증
        const expectedTokenBalance = userInitialToken - payAmount + expectedCashback;
        expect(userFinalToken).to.equal(expectedTokenBalance);

        // ➤ Gasless 여부 검증: ETH 잔액 감소 없어야 함
        expect(userFinalEth).to.equal(userInitialEth);
    });
});