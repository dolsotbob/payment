import { ethers } from "hardhat";
import { expect } from "chai";
import "@nomicfoundation/hardhat-chai-matchers";

describe("Payment with Cashback", function () {
    let owner: any;  // 컨트랙트 관리자 주소 (관리 기능 수행)
    let user: any;
    let storeWallet: any;  // 결제받을 판매자의 주소 
    let token: any;
    let gateway: any;

    const initialSupply = ethers.parseEther("1000"); // 예: 1000 TTK
    const paymentAmount = ethers.parseEther("100");
    const cashbackRate = 2; // 2%

    beforeEach(async () => {
        [owner, user, storeWallet] = await ethers.getSigners();

        // TestToken 배포
        const TokenFactory = await ethers.getContractFactory("TestToken", owner);
        token = await TokenFactory.deploy(initialSupply);
        await token.waitForDeployment();

        // 사용자에게 토큰 전송
        await token.transfer(user.address, ethers.parseEther("200"));

        // PaymentWithCashback 배포
        const GatewayFactory = await ethers.getContractFactory("PaymentWithCashback");
        gateway = await GatewayFactory.connect(owner).deploy(token.getAddress(), storeWallet.address);
        await gateway.waitForDeployment();

        // 캐시백 비율 설정 (onlyOwner)
        await gateway.setCashbackRate(cashbackRate);

        // user -> gateway에 approve
        const userToken = token.connect(user);
        await userToken.approve(gateway.target, paymentAmount);

        // storeWallet에게 토큰 지급 (캐시백 재원)
        // storeWallet도 캐시백 보낼 수 있도록 충분한 토큰 보유
        await token.transfer(storeWallet.address, ethers.parseEther("500"));
        await token.connect(storeWallet).approve(await gateway.getAddress(), ethers.parseEther("500"));
    });

    it("결제 시 토큰이 store로 전송되고, 캐시백이 유저에게 전송됨", async () => {
        const userToken = token.connect(user);
        const gatewayFromUser = gateway.connect(user);

        const beforeUser = await token.balanceOf(user.address);
        const beforeStore = await token.balanceOf(storeWallet.address);

        const tx = await gatewayFromUser.pay(paymentAmount);
        await tx.wait();

        const afterUser = await token.balanceOf(user.address);
        const afterStore = await token.balanceOf(storeWallet.address);

        const cashbackAmount = paymentAmount * BigInt(cashbackRate) / BigInt(100);

        expect(afterUser).to.equal(beforeUser - paymentAmount + cashbackAmount);
        expect(afterStore).to.equal(beforeStore + paymentAmount - cashbackAmount);
    });

    it("캐시백 비율은 100보다 커질 수 없음", async () => {
        await expect(gateway.setCashbackRate(150)).to.be.rejectedWith("Rate must be <= 100");
    });

    it("오너만 캐시백 비율을 변경 가능", async () => {
        const gatewayFromUser = gateway.connect(user);
        await expect(gatewayFromUser.setCashbackRate(5)).to.be.reverted;
    });
});