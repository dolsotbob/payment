import { ethers } from "hardhat";
import type { TypedDataDomain } from "ethers";

export async function signPermit({
    token,
    owner,        // Hardhat signer (ethers.Signer)
    spender,
    value,
    deadline,
}: {
    token: any;
    owner: any;
    spender: string;
    value: bigint;
    deadline: bigint;
}) {
    const [name, chainId, nonce] = await Promise.all([
        token.name(),
        owner.provider.getNetwork().then((n: { chainId: any; }) => n.chainId),
        token.nonces(await owner.getAddress()),
    ]);

    const domain: TypedDataDomain = {
        name,
        version: "1",
        chainId,
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
        owner: await owner.getAddress(),
        spender,
        value,
        nonce,
        deadline,
    };

    // ethers v6: signTypedData
    const sig = await owner.signTypedData(domain, types, message);

    const { v, r, s } = ethers.Signature.from(sig);
    return { v, r, s };
}