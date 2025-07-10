import { expect } from 'chai';
import { ethers } from 'hardhat';
import { Wallet, TypedDataDomain, TypedDataField } from 'ethers';
import { MyForwarder } from '../typechain-types';
import { signTypedData } from './utils/signTypedData';

describe('MyForwarder', () => {
    let forwarder: MyForwarder;
    let user: Wallet;
    let target: any;
    let chainId: number;

    beforeEach(async () => {
        const [signer] = await ethers.getSigners();
        // signer의 privateKey가 없을 경우 외부 wallet을 연결해야 합니다
        user = new Wallet(process.env.PRIVATE_KEY!, ethers.provider); // ✅ .env에 PRIVATE_KEY가 있어야 함
        chainId = Number((await ethers.provider.getNetwork()).chainId);

        const ForwarderFactory = await ethers.getContractFactory('MyForwarder');
        forwarder = await ForwarderFactory.deploy();
        await forwarder.waitForDeployment();

        const DummyTarget = await ethers.getContractFactory('TestTarget');
        target = await DummyTarget.deploy();
        await target.waitForDeployment();
    });

    const buildRequest = async (value: bigint, gas: bigint, data: string, nonce: bigint) => ({
        from: user.address,
        to: await target.getAddress(),
        value,
        gas,
        deadline: BigInt(Math.floor(Date.now() / 1000) + 60),
        data,
        nonce,
    });

    const types: Record<string, TypedDataField[]> = {
        ForwardRequest: [
            { name: 'from', type: 'address' },
            { name: 'to', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'gas', type: 'uint256' },
            { name: 'deadline', type: 'uint48' },
            { name: 'data', type: 'bytes' },
            { name: 'nonce', type: 'uint256' },
        ],
    };

    it('should verify a valid meta-tx signature', async () => {
        const nonce = await forwarder.nonces(user.address);
        const data = target.interface.encodeFunctionData('storeValue', [42]);
        const request = await buildRequest(0n, 100_000n, data, nonce);

        const domain = async () => ({
            name: 'MyForwarder',
            version: '1',
            chainId,
            verifyingContract: await forwarder.getAddress(),
        });

        const signature = await signTypedData(user, await domain(), types, request);
        const valid = await forwarder.verify(request, signature);
        expect(valid).to.equal(true);
    });

    it('should reject invalid signature', async () => {
        const nonce = await forwarder.nonces(user.address);
        const data = target.interface.encodeFunctionData('storeValue', [42]);
        const request = await buildRequest(0n, 100_000n, data, nonce);

        const invalidSignature = '0x' + '00'.repeat(65);

        await expect(
            forwarder.verify(request, invalidSignature)
        ).to.be.revertedWith('ECDSA: invalid v');
    });

    it('should execute valid meta-tx and call target contract', async () => {
        const nonce = await forwarder.nonces(user.address);
        const data = target.interface.encodeFunctionData('storeValue', [1234]);
        const request = await buildRequest(0n, 100_000n, data, nonce);

        const domain: TypedDataDomain = {
            name: 'MyForwarder',
            version: '1',
            chainId,
            verifyingContract: await forwarder.getAddress(),
        };

        const signature = await signTypedData(user, domain, types, request);
        await forwarder.execute(request, signature);
        expect(await target.value()).to.equal(1234);
    });
});