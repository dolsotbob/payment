import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import type { Vault, VaultV2, TestToken } from "../typechain-types";
import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";

describe("Vault Upgrade (UUPS)", () => {
    let owner: SignerWithAddress;
    let treasury: SignerWithAddress;
    let user: SignerWithAddress;
    let token: TestToken;
    let vault: Vault;

    beforeEach(async () => {
        [owner, treasury, user] = await ethers.getSigners();

        // TestToken 배포
        const TokenFactory = await ethers.getContractFactory("TestToken");
        token = await TokenFactory.deploy(ethers.parseUnits("1000000", 18));

        // Vault v1 Proxy 배포
        const VaultFactory = await ethers.getContractFactory("Vault");
        vault = await upgrades.deployProxy(
            VaultFactory,
            [await token.getAddress(), treasury.address],
            { initializer: "initialize", kind: "uups" }
        ) as unknown as Vault;

        // Vault에 일부 토큰 적립
        await token.transfer(await vault.getAddress(), ethers.parseUnits("1000", 18));
    });

    it("✅ Should preserve state after upgrade", async () => {
        const beforeBalance = await token.balanceOf(await vault.getAddress());

        // 👇 VaultV2로 업그레이드 (로직만 바뀜, 상태(state)는 유지)
        const VaultV2Factory = await ethers.getContractFactory("VaultV2");
        const upgraded = await upgrades.upgradeProxy(
            await vault.getAddress(),
            VaultV2Factory
        ) as VaultV2;

        // 기존 상태값 유지 확인
        const afterBalance = await token.balanceOf(await upgraded.getAddress());
        expect(afterBalance).to.equal(beforeBalance);

        // 새로 추가된 V2 함수 호출 테스트 (예시: version())
        expect(await upgraded.version()).to.equal("Vault V2");
    });

    it("✅ Should execute initializeV2() only once", async () => {
        const VaultV2Factory = await ethers.getContractFactory("VaultV2");
        const upgraded = await upgrades.upgradeProxy(await vault.getAddress(), VaultV2Factory) as VaultV2;

        // reinitializer(2) 실행
        await upgraded.initializeV2();
        expect(await upgraded.note()).to.equal("Vault Upgraded");

        // 두 번째 실행은 실패해야 함
        await expect(upgraded.initializeV2()).to.be.revertedWithCustomError(
            upgraded,
            "InvalidInitialization"
        );
    });
});