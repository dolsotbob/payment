import { ethers } from "hardhat";
import { expect } from "chai";
import { Coupon1155 } from "../typechain-types";

describe("Coupon1155", () => {
    let coupon1155: Coupon1155;

    beforeEach(async () => {
        const [owner] = await ethers.getSigners();
        const Coupon1155Factory = await ethers.getContractFactory("Coupon1155");
        coupon1155 = (await Coupon1155Factory.deploy(
            "https://gateway.pinata.cloud/ipfs/{id}.json",
            owner.address
        )) as Coupon1155;
        await coupon1155.waitForDeployment();
    });

    describe("Deployment", () => {
        it("should set the correct owner", async () => {
            const [owner] = await ethers.getSigners();
            expect(await coupon1155.owner()).to.equal(owner.address);
        });

        it("should return the base URI with {id} placeholder", async () => {
            expect(await coupon1155.uri(1)).to.equal(
                "https://gateway.pinata.cloud/ipfs/{id}.json"
            );
        });
    });

    describe("Custom Token URIs", () => {
        it("should allow the owner to set a custom URI for a token ID", async () => {
            await coupon1155.setTokenURI(1, "ipfs://custom-uri-for-token-1.json");
            expect(await coupon1155.uri(1)).to.equal("ipfs://custom-uri-for-token-1.json");
        });

        it("should emit a URI event when a custom URI is set", async () => {
            await expect(coupon1155.setTokenURI(1, "ipfs://another-custom.json"))
                .to.emit(coupon1155, "URI")
                .withArgs("ipfs://another-custom.json", 1);
        });
    });

    describe("Minting & Burning", () => {
        it("should allow the owner to mint tokens", async () => {
            const [owner, addr1] = await ethers.getSigners();
            await coupon1155.mint(addr1.address, 1, 10, "0x");
            expect(await coupon1155.balanceOf(addr1.address, 1)).to.equal(10);
        });

        it("should allow token holders to burn their tokens", async () => {
            const [owner, addr1] = await ethers.getSigners();
            await coupon1155.mint(addr1.address, 1, 5, "0x");
            await coupon1155.connect(addr1).burn(addr1.address, 1, 2);
            expect(await coupon1155.balanceOf(addr1.address, 1)).to.equal(3);
        });
    });
});