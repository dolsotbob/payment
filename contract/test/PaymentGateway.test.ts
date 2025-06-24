// expect from chai: 테스트에서 “이 값이 기대한 값과 같아야 한다”는 식의 단언(assertion) 에 사용됩니다.
// ethers from hardhat: Hardhat이 제공하는 이더리움 개발 도구를 사용합니다.
import { ethers } from "hardhat";
import { expect } from "chai";

// 주요 테스트 항목:
// 	•	pay() 함수가 정상적으로 실행되어 토큰이 전송되고 이벤트가 발생하는지
// 	•	pay() 실패 케이스 (잔액 부족 등)
// 	•	setStoreWallet() 함수가 오직 owner만 호출 가능한지

describe("PaymentGateway", function () {
    // 테스트에 사용할 변수 미리 선언 
    let token: any;
    let paymentGateway: any;
    let owner: any;
    let buyer: any;
    let storeWallet: any;

    // 각 테스트 전에 실행되는 초기화 블록 
    beforeEach(async function () {
        // hardhat의 가상 지갑 3개를 가져옴 
        [owner, buyer, storeWallet] = await ethers.getSigners();

        // 테스트용 ERC20 토큰 배포
        const Token = await ethers.getContractFactory("MyToken");
        token = await Token.deploy("TestToken", "TT", 18, ethers.parseEther("1000"));
        await token.waitForDeployment();

        // PaymentGateway 배포
        // 베포하면서 token 주소, storeWallet 주소를 생성자 인자로 전달 
        const PaymentGateway = await ethers.getContractFactory("PaymentGateway");
        paymentGateway = await PaymentGateway.deploy(await token.getAddress(), storeWallet.address);
        await paymentGateway.waitForDeployment();

        // owner가 buyer에게 토큰 전송
        await token.transfer(buyer.address, ethers.parseEther("100"));
    });

    it("should allow payment and emit event", async function () {
        const amount = ethers.parseEther("10");

        // buyer가 결제할 수 있도록 approve
        await token.connect(buyer).approve(await paymentGateway.getAddress(), amount);

        // 결제
        await expect(paymentGateway.connect(buyer).pay(amount))
            .to.emit(paymentGateway, "Paid")
            .withArgs(buyer.address, amount);
    });

    it("should fail if not approved", async function () {
        const amount = ethers.parseEther("10");

        // 결제 실패 예상
        await expect(paymentGateway.connect(buyer).pay(amount)).to.be.revertedWith("Payment failed");
    });

    it("only owner can change storeWallet", async function () {
        const newWallet = ethers.Wallet.createRandom();

        await expect(paymentGateway.connect(buyer).setStoreWallet(newWallet.address)).to.be.revertedWithCustomError(
            paymentGateway,
            "OwnableUnauthorizedAccount"
        );

        await expect(paymentGateway.connect(owner).setStoreWallet(newWallet.address)).to.not.be.reverted;
    });
});