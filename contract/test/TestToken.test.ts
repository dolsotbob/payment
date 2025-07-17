// 배포 후 총 공급량 = 소유자 잔액을 검증하는 단위 테스트
import { ethers } from "hardhat";
import { expect } from "chai";

describe("TestToken", () => {
    it("Should deploy with total supply to owner", async () => {
        const [owner] = await ethers.getSigners();
        const Token = await ethers.getContractFactory("TestToken");
        const token = await Token.deploy(ethers.parseUnits("1000000", 18));

        const supply = await token.totalSupply();
        const balance = await token.balanceOf(owner.address);

        expect(balance).to.equal(supply);
    });
});