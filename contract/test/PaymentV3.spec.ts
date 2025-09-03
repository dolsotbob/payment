// test/PaymentV3.spec.ts
import { ethers, upgrades } from "hardhat";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-network-helpers";

describe("PaymentV3 (upgrade flow)", () => {
    // Signers
    let owner: any, buyer: any, other: any;

    // Contracts
    let token: any;        // MockPermitERC20 (간이 permit)
    let vault: any;        // MockVault
    let coupon1155: any;   // Coupon1155
    let payment: any;      // Proxy (V3 ABI로 바인딩)
    let proxyAddress: string;

    // Consts
    const COUPON_ID = 1;
    const ONE_ETHER = 10n ** 18n;
    const PRICE = 10n * ONE_ETHER;          // 결제 금액
    const PERMIT_VALUE = PRICE;             // permit allowance (>= price)

    // beforeEach에서 만든 만료 시각을 테스트에서 재사용
    let expiresAtSaved: number;

    beforeEach(async () => {
        [owner, buyer, other] = await ethers.getSigners();

        // 1) Mocks
        const Token = await ethers.getContractFactory("MockPermitERC20");
        token = await Token.deploy();
        await token.waitForDeployment();

        const Vault = await ethers.getContractFactory("MockVault");
        vault = await Vault.deploy();
        await vault.waitForDeployment();

        const Coupon1155 = await ethers.getContractFactory("Coupon1155");
        // constructor(string baseURI_, address initialOwner)
        coupon1155 = await Coupon1155.deploy("", await owner.getAddress());
        await coupon1155.waitForDeployment();

        // 2) Proxy deploy (V1 = Payment)
        // initialize(_token, _vaultAddress, _cashbackBps, _maxDiscountBps, _initialOwner)
        const Payment = await ethers.getContractFactory("Payment");
        const proxy = await upgrades.deployProxy(
            Payment,
            [
                await token.getAddress(),
                await vault.getAddress(),
                200,                        // cashbackBps = 2%
                9000,                       // maxDiscountBps = 90%
                await owner.getAddress(),
            ],
            { initializer: "initialize" }
        );
        await proxy.waitForDeployment();
        proxyAddress = await proxy.getAddress();

        // 3) Upgrade to V3 (contract name = PaymentV3)
        const PaymentV3 = await ethers.getContractFactory("PaymentV3");
        await upgrades.validateUpgrade(proxyAddress, PaymentV3);
        await upgrades.upgradeProxy(proxyAddress, PaymentV3);
        // ✅ 반드시 V3 ABI로 다시 바인딩
        payment = await ethers.getContractAt("PaymentV3", proxyAddress);

        // 4) Coupon rule set + mint to buyer
        const now = await time.latest();
        expiresAtSaved = now + 180 * 24 * 60 * 60; // 6개월(≈180일)

        // setCouponRule(CouponRule rule)
        await payment.setCouponRule({
            nft: await coupon1155.getAddress(),
            id: COUPON_ID,
            discountBps: 500,     // 5%
            expiresAt: expiresAtSaved,
            enabled: true,
            consumable: true,
        });

        // buyer에게 쿠폰 지급
        await coupon1155.connect(owner).mint(
            await buyer.getAddress(),
            COUPON_ID,
            1,
            "0x"
        );

        // 5) 토큰 준비 + 간이 permit 승인
        await token.mint(await buyer.getAddress(), PERMIT_VALUE);
        await token.permit(
            await buyer.getAddress(),              // owner
            proxyAddress,                          // spender = Payment proxy
            PERMIT_VALUE,                          // value
            Math.floor(Date.now() / 1000) + 3600,  // deadline
            27,
            ethers.ZeroHash,
            ethers.ZeroHash
        );
    });

    it("applies ERC1155 coupon and pays with permit mock", async () => {
        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

        // permitAndPayWithCashback(
        //   address owner,
        //   uint256 value,
        //   uint256 deadline,
        //   uint8 v,
        //   bytes32 r,
        //   bytes32 s,
        //   uint256 price,
        //   address couponNft,
        //   uint256 couponId,
        //   bool useCoupon
        // )
        const tx = await payment.connect(buyer).permitAndPayWithCashback(
            await buyer.getAddress(),          // owner
            PERMIT_VALUE,                      // value
            deadline,                          // deadline
            27,                                // v (mock이므로 더미)
            ethers.ZeroHash,                   // r
            ethers.ZeroHash,                   // s
            PRICE,                             // price
            await coupon1155.getAddress(),     // couponNft
            COUPON_ID,                         // couponId
            true                               // useCoupon
        );
        await tx.wait();

        // (선택) 후속 검증: Vault 잔액/이벤트 등 프로젝트 맞춰 추가
        // expect(...).to.equal(...);
    });

    it("reverts when coupon is expired (use-time check)", async () => {
        // 등록했던 expiresAtSaved를 기준으로 만료 시점 넘김
        await time.increaseTo(expiresAtSaved + 1);

        const deadline = BigInt(Math.floor(Date.now() / 1000) + 3600);

        await expect(
            payment.connect(buyer).permitAndPayWithCashback(
                await buyer.getAddress(),
                PERMIT_VALUE,
                deadline,
                27,
                ethers.ZeroHash,
                ethers.ZeroHash,
                PRICE,
                await coupon1155.getAddress(),
                COUPON_ID,
                true
            )
        ).to.be.revertedWith("permit expired");
    });
});