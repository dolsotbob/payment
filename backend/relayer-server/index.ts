// 이 서버 역할: 사용자가 서명만 하면, 이 서버가 대신 블록체인에 트랜잭션을 실행(→ 가스 지불)해주는 Proxy입니다.
import express from 'express';
import { ethers } from 'ethers';
import cors from 'cors';
import dotenv from 'dotenv';
import MyForwarderAbi from '../src/abis/MyForwarder.json';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8080;
const RPC_URL = process.env.RPC_URL;
const PRIVATE_KEY = process.env.RELAYER_PRIVATE_KEY;
const FORWARDER_ADDRESS = process.env.FORWARDER_ADDRESS;

if (!PRIVATE_KEY || !FORWARDER_ADDRESS || !RPC_URL) {
    throw new Error("❌ 환경변수 설정이 잘못되었습니다. .env 파일을 확인하세요.");
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
const forwarder = new ethers.Contract(FORWARDER_ADDRESS, MyForwarderAbi.abi, wallet);

app.post('/relay', async (req, res) => {
    try {
        // 프론트앤드에서 전송한 ForwardRequest 객체와 서명을 추출한다 
        const { request, signature } = req.body;

        // 메타트랜잭션 요청 실행
        // forwarder.execute() 호출을 Relayer가 signer로 실행했기 때문에 Relayer가 가스비를 냄 
        const tx = await forwarder.execute(request, signature, { gasLimit: 500000 });
        const receipt = await tx.wait();

        console.log(`✅ MetaTx executed: ${receipt.transactionHash}`);
        res.json({ success: true, txHash: receipt.transactionHash });
    } catch (err) {
        console.error('❌ Relay error:', err);
        res.status(500).json({ success: false, error: (err as Error).message });
    }
});

// 서버를 PORT 에서 실행 
app.listen(PORT, () => {
    console.log(`🚀 Relayer listening on port ${PORT}`);
});