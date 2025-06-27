import { expect } from 'chai';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { DataSource } from 'typeorm';
import { ethers } from 'ethers';
import PaymentArtifact from '../../contract/artifacts/contracts/Payment.sol/Payment.json';
import * as dotenv from 'dotenv';

dotenv.config();

describe('Payment Integration E2E', () => {
    let app: INestApplication;
    let server: any;
    let provider: ethers.JsonRpcProvider;
    let signer: ethers.JsonRpcSigner;
    let paymentContract: any;

    before(async () => {
        provider = new ethers.JsonRpcProvider('http://localhost:8545');
        signer = await provider.getSigner(0);

        const factory = new ethers.ContractFactory(
            PaymentArtifact.abi,
            PaymentArtifact.bytecode,
            signer
        );

        paymentContract = await factory.deploy(
            process.env.TOKEN_ADDRESS!,
            process.env.STORE_WALLET!
        );
        await paymentContract.waitForDeployment();

        const moduleFixture = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        app = moduleFixture.createNestApplication();
        await app.init();
        server = app.getHttpServer();
    });

    after(async () => {
        await app.close();
    });

    it('should record payment in DB', async () => {
        const wei = ethers.parseUnits('1', 18);
        const tx = await paymentContract.pay(wei);
        const receipt = await tx.wait();

        const response = await request(server)
            .post('/payment')
            .send({
                txHash: receipt.hash,
                from: await signer.getAddress(),
                amount: wei.toString(),
                cashbackAmount: ethers.parseUnits('0.02', 18).toString(),
                status: 'SUCCESS',
            })
            .expect(201);

        const ds = app.get(DataSource);
        const saved = await ds
            .getRepository('Payment')
            .findOneBy({ txHash: receipt.hash });

        expect(saved).to.not.be.undefined;
        expect(saved!.status).to.equal('SUCCESS');
    });
});