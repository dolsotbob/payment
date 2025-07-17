import { ethers } from "hardhat";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";
import { TypedDataDomain } from "ethers";

describe("Payment (Permit 기반)", () => {
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

        await vault.setPaymentContract(await payment.getAddress()); // 권한 부여 
        await payment.connect(owner).setCashbackRate(2);// 명확하게 2% 설정
        console.log("현재 캐시백 비율:", (await payment.cashbackRate()).toString());

        await token.transfer(user.address, ethers.parseUnits("100", 18)); // 유저에게 토큰 지급 
        await token.transfer(vault.target, ethers.parseUnits("1000", 18));  // Vault에 캐시백 준비
    });

    it("Should perform permit-based payment with cashback and vault transfer", async () => {
        const value = ethers.parseUnits("50", 18);  // permit 승인 금액 
        const amount = value;   // 실제 결제 금액 
        const cashbackRate = await payment.cashbackRate(); // 2%

        const deadline = Math.floor(Date.now() / 1000) + 3600;   // 현재 시점 기준 1시간 유효 
        const nonce = await token.nonces(user.address);

        const domain: TypedDataDomain = {
            name: "TestToken",
            version: "1",
            chainId: (await ethers.provider.getNetwork()).chainId,
            verifyingContract: await token.getAddress(),
        };

        const types = {
            Permit: [
                { name: "owner", type: "address" },
                { name: "spender", type: "address" },
                { name: "value", type: "uint256" },
                { name: "nonce", type: "uint256" },
                { name: "deadline", type: "uint256" },
            ],
        };

        const message = {
            owner: user.address,
            spender: await payment.getAddress(),
            value,
            nonce,
            deadline,
        };

        const signature = await user.signTypedData(domain, types, message);
        const { v, r, s } = ethers.Signature.from(signature);

        const vaultBefore = await token.balanceOf(vault.target);
        const userBefore = await token.balanceOf(user.address);

        const tx = await payment.connect(user).permitAndPayWithCashback(
            user.address,
            value,
            deadline,
            v,
            r,
            s,
            amount
        );
        // await tx.wait();

        const cashbackAmount = (amount * BigInt(cashbackRate)) / 100n;
        const vaultAfter = await token.balanceOf(vault.target);
        const userAfter = await token.balanceOf(user.address);

        const expectedVaultIncrease = amount - cashbackAmount * 2n;
        const expectedUserDecrease = amount - cashbackAmount;

        expect(vaultAfter - vaultBefore).to.equal(expectedVaultIncrease);
        expect(userBefore - userAfter).to.equal(expectedUserDecrease);
    });

    it("Should revert with invalid signature", async () => {
        const value = ethers.parseUnits("10", 18);
        const deadline = Math.floor(Date.now() / 1000) + 3600;
        const amount = value;
        const { v, r, s } = { v: 27, r: "0x".padEnd(66, "0"), s: "0x".padEnd(66, "0") };

        await expect(
            payment.connect(user).permitAndPayWithCashback(
                user.address,
                value,
                deadline,
                v,
                r,
                s,
                amount
            )
        ).to.be.reverted;
    });
});