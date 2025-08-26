import { ethers } from 'ethers';

// 이 함수는 EIP-2612 Permit 서명 정보를 생성하여, permit() 함수 호출에 필요한 v, r, s, deadline 값을 반환한다 
export const buildPermitCallData = async (
    token: ethers.Contract,  // token이란 이름의 TestToken.sol 인스턴스를 PayButton.tsx에서 전달받음  
    payment: ethers.Contract,
    signer: ethers.Signer,  // 사용자 지갑 객체 
    owner: string,      // 서명할 사용자 지갑 주소 
    amount: string,     // 승인할 토큰 금액 
    valueOverride?: string  // 선택: permit allowance 를 별도로 저장하고 싶을 때 
): Promise<{
    v: number;
    r: string;
    s: string;
    deadline: number;
}> => {
    // 1) 토큰 메타 (decimals, name)
    const [decimals, tokenName, tokenAddress, paymentAddress] = await Promise.all([
        token.decimals().catch(() => 18), // 없는 경우 18로 fallback
        token.name().catch(() => "Token"),
        token.getAddress?.() ?? token.target,
        payment.getAddress?.() ?? payment.target,
    ]);

    // 2) permit allowance (value) 계산
    // V3: require(value >= afterPrice). 보통 price(=amount)로 충분.
    const priceBN = ethers.parseUnits(amount, Number(decimals));
    const valueBN = valueOverride
        ? ethers.parseUnits(valueOverride, Number(decimals))
        : priceBN;

    // 3) nonce & deadline 
    const nonceRaw = await token.nonces(owner); // 중복 서명 방지를 위한 고유값 
    const nonce = BigInt(nonceRaw).toString(); // 문자열 정규화
    const deadline = Math.floor(Date.now() / 1000) + 300;  // 5분 후 만료 

    // chainId 확보 (signer 기존 네트워크)
    const { chainId } = await signer.provider!.getNetwork();

    // 4) EIP-712 Domain/Types/Message
    const domain = {
        name: await token.name(),
        version: "1",
        chainId,
        verifyingContract: await token.getAddress(),  // TestToken.sol의 주소 
    };

    // EIP-712 Typed Data 구조 정의 
    // ERC20 Permit 표준 구조체 
    const types = {
        Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' },
        ],
    };

    const message = {
        owner,
        spender: paymentAddress,  // Payment 컨트랙트에게 권한을 줌 
        value: valueBN,
        nonce,
        deadline,
    };

    // 5) 실제 서명 (ethers v6: signTypedData) 
    const signature = await (signer as any).signTypedData(domain, types, message);
    const { v, r, s } = ethers.Signature.from(signature); // 서명을 v, r, s 값으로 분해 

    return {
        v,
        r,
        s,
        deadline,
    };
};


/*
Permit 방식은 사용자가 approve() 없이도 사전 서명만으로 결제 컨트랙트에게 토큰 전송 권한을 부여
→ 즉, 이 함수는 유저 서명을 위한 메시지를 구성하고, 
EIP-712 방식으로 서명한 후, 
Payment.sol에서 쓸 v, r, s, deadline을 만들어내는 역할을 맡음 
*/
