// 이 서버 역할: 사용자가 서명만 하면, 이 서버가 대신 블록체인에 트랜잭션을 실행(→ 가스 지불)해주는 Proxy입니다.
import express, { Request, Response } from 'express';
import { ethers } from 'ethers';
import cors from 'cors';
import dotenv from 'dotenv';
import MyForwarderAbi from '../src/abis/MyForwarder.json';
import TestTokenAbi from '../src/abis/TestToken.json';  // metaApprove 지원하는 토큰 ABI 추가
import PaymentAbi from '../src/abis/Payment.json';
import { sendPaymentToBackend } from './utils/sendPaymentToBackend';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const RPC_URL = process.env.RPC_URL;
const RELAYER_PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const FORWARDER_ADDRESS = process.env.FORWARDER_ADDRESS;
const SPENDER_ADDRESS = process.env.REACT_APP_CONTRACT_ADDRESS!; // Payment 컨트랙트 주소 

if (!RPC_URL || !RELAYER_PRIVATE_KEY || !FORWARDER_ADDRESS || !SPENDER_ADDRESS) {
    throw new Error("❌ 환경변수가 설정되지 않았습니다.");
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(RELAYER_PRIVATE_KEY, provider);
const forwarder = new ethers.Contract(FORWARDER_ADDRESS, MyForwarderAbi.abi, wallet);

const decodeAmount = (data: string): string => {
    try {
        const iface = new ethers.Interface(PaymentAbi.abi);
        const [amount] = iface.decodeFunctionData('pay', data);
        return amount.toString();
    } catch (e) {
        console.warn('❗ 결제 금액 디코딩 실패:', e);
        return '0';
    }
};

app.post('/relay', async (req, res) => {
    try {
        // 프론트앤드에서 전송한 ForwardRequest 객체와 서명을 추출한다 
        const { request, signature, productId } = req.body;
        console.log('📦 받은 productId 타입:', typeof productId, productId);
        let tx;

        if (signature === null) {
            // ✅ 메타 Approve 직접 실행 (Forwarder 아님)
            const tokenContract = new ethers.Contract(request.to, TestTokenAbi.abi, wallet);

            // ABI 디코딩으로 metaApprove 파라미터 추출 
            const decoded = tokenContract.interface.decodeFunctionData('metaApprove', request.data);

            const [owner, spender, value, deadline, sig] = decoded;

            tx = await tokenContract.metaApprove(owner, spender, value, deadline, sig);
            const receipt = await tx.wait();

            await sendPaymentToBackend({
                txHash: receipt.hash,
                from: owner,
                amount: value.toString(),
                cashbackAmount: '0',
                status: 'SUCCESS',
                gasUsed: receipt.gasUsed.toString(),
                gasCost: tx.gasPrice ? (receipt.gasUsed * tx.gasPrice).toString() : '0',
                productId, // relayer -> backend 
            });

            return res.json({ success: true, txHash: receipt.hash });
        } else {
            // ✅ Forwarder를 통해 일반 메타 트랜잭션 실행 

            // 1. nonce를 Forwarder에서 가져오기
            const nonce = await forwarder.nonces(request.from);

            // 2. request 검증 (EIP712 검증 포함)
            const isValid = await forwarder.verify(request, signature, nonce);
            if (!isValid) {
                return res.status(400).json({ error: 'Invalid signature or nonce' });
            }

            // 3. 트랜잭션 실행 (Relayer가 가스 지불)
            // forwarder.execute() 호출을 Relayer가 signer로 실행했기 때문에 Relayer가 가스비를 냄 
            tx = await forwarder.execute(request, signature, nonce, {
                gasLimit: request.gas || 500000,
            });
        }

        const receipt = await tx.wait();
        console.log(`✅ MetaTx executed: ${receipt.hash}`);

        await sendPaymentToBackend({
            txHash: receipt.hash,
            from: request.from,
            amount: decodeAmount(request.data),
            cashbackAmount: '0',
            status: 'SUCCESS',
            gasUsed: receipt.gasUsed.toString(),
            gasCost: tx.gasPrice ? (receipt.gasUsed * tx.gasPrice).toString() : '0',
            productId,
        });

        console.log('✅ 메타 트랜잭션 응답 발송:', receipt.hash);
        res.json({ success: true, txHash: receipt.hash });
    } catch (err) {
        console.error('❌ Relay error:', err);
        res.status(500).json({ success: false, error: (err as Error).message });
    }
});

// 서버를 PORT 에서 실행 
app.listen(PORT, () => {
    console.log(`🚀 Relayer listening on port ${PORT}`);
});

