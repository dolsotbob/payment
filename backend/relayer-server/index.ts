// 이 서버 역할: 사용자가 서명만 하면, 이 서버가 대신 블록체인에 트랜잭션을 실행(→ 가스 지불)해주는 Proxy입니다.
import express from 'express';
import { ethers } from 'ethers';
import cors from 'cors';
import dotenv from 'dotenv';
import { MyForwarder } from './typechain-types';
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

console.log('📦 ABI length:', MyForwarderAbi.abi?.length);
console.log('🔍 ABI contains execute?:', MyForwarderAbi.abi?.some((item: any) => item.name === 'execute'));
if (!MyForwarderAbi.abi) {
    throw new Error('❌ MyForwarder ABI is missing. Check your ABI JSON file.');
}

const forwarderInterface = new ethers.Interface(MyForwarderAbi.abi);
const forwarder = new ethers.Contract(
    FORWARDER_ADDRESS,
    MyForwarderAbi.abi,
    wallet
) as unknown as MyForwarder;

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
    console.log('📥 POST /relay 요청 수신');  // ✅ 요청 도착 로그 추가

    // ✅ [여기!] request 객체 유효성 검사
    const { request, productId } = req.body;
    if (!request.to || !request.data) {
        return res.status(400).json({ error: 'Missing "to" or "data" field in request' });
    }

    console.log("📥 Received metaPay request:", req.body.request);
    console.log('📥 받은 request.data:', request.data);
    console.log("typeof:", typeof request.data);
    console.log("isHexString:", ethers.isHexString(request.data));
    console.log('📥 받은 request.data 길이:', request.data.length);
    console.log('📥 받은 request 전체:', request);

    try {
        // 프론트앤드에서 전송한 ForwardRequest 객체와 서명을 추출한다 
        const { request, productId } = req.body;
        console.log("🔍 [relay] 전체 request.body:", JSON.stringify(req.body, null, 2));
        const signature = request.signature;
        console.log('📦 받은 productId 타입:', typeof productId, productId);
        let tx;

        if (signature === undefined || signature === null || signature === '') {
            // ✅ 메타 Approve 직접 실행 (Forwarder 아님)
            const tokenContract = new ethers.Contract(request.to, TestTokenAbi.abi, wallet);

            // ABI 디코딩으로 metaApprove 파라미터 추출 
            const decoded = tokenContract.interface.decodeFunctionData('metaApprove', request.data);
            const [owner, spender, value, deadline, sig] = decoded;

            // ✅ EIP-712 도메인 정의 (토큰 기준)
            const tokenName = await tokenContract.name();
            const network = await wallet.provider!.getNetwork();
            const nonce = await tokenContract.nonces(owner);

            const domain = {
                name: tokenName,
                version: '1',
                chainId: Number(network.chainId),
                verifyingContract: await tokenContract.getAddress(),
            };
            console.log('🔎 Relayer domain:', domain);

            const types = {
                MetaApprove: [
                    { name: 'owner', type: 'address' },
                    { name: 'spender', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'deadline', type: 'uint256' },
                ],
            };

            const toSign = {
                owner,
                spender,
                value,
                nonce,
                deadline,
            };
            console.log('🧾 [metaApprove] toSign:', toSign);
            console.log('✍️ [metaApprove] sig:', signature);

            const recovered = ethers.verifyTypedData(domain, types, toSign, sig);
            console.log('👤 [metaApprove] recovered:', recovered);

            if (recovered.toLowerCase() !== owner.toLowerCase()) {
                return res.status(400).json({ error: 'Invalid signature or nonce' });
            }

            // 실제 metaApprove 실행 
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

            const allowance = await tokenContract.allowance(owner, SPENDER_ADDRESS);
            console.log('✅ Allowance after metaApprove:', allowance.toString());

            return res.json({ success: true, txHash: receipt.hash });
        } else {
            // ✅ Forwarder를 통해 일반 메타 PAY 트랜잭션 실행 

            // EIP-712 서명 검증 (verifyTypedData)
            if (!wallet.provider) {
                throw new Error("❌ Wallet에 provider가 연결되어 있지 않습니다.");
            }

            const network = await wallet.provider.getNetwork();

            const domain = {
                name: 'MyForwarder',
                version: '1',
                chainId: Number(network.chainId),
                verifyingContract: FORWARDER_ADDRESS,
            }
            console.log('🔎 Relayer domain:', domain);

            const types = {
                ForwardRequest: [
                    { name: 'from', type: 'address' },
                    { name: 'to', type: 'address' },
                    { name: 'value', type: 'uint256' },
                    { name: 'gas', type: 'uint256' },
                    { name: 'deadline', type: 'uint256' },
                    { name: 'data', type: 'bytes' },
                    { name: 'nonce', type: 'uint256' },
                ],
            };

            const toSign = {
                from: request.from,
                to: request.to,
                value: BigInt(request.value || '0'),
                gas: BigInt(request.gas || '500000'),
                deadline: Number(request.deadline),
                data: request.data,
                nonce: BigInt(request.nonce || '0'),
            };
            console.log('🧾 [metaPay] toSign:', toSign);
            console.log('🧾 [Relayer] toSign.data (bytes):', toSign.data);
            console.log('typeof toSign.data:', typeof toSign.data);
            console.log('ethers.isHexString(toSign.data):', ethers.isHexString(toSign.data));
            console.log('✍️ [metaPay] signature:', signature);
            console.log('👤 expected from:', request.from);
            console.log('➡️ expected to:', request.to);

            const recovered = ethers.verifyTypedData(domain, types, toSign, signature);
            console.log('👤 [metaPay] recovered:', recovered);

            if (recovered.toLowerCase() !== request.from.toLowerCase()) {
                return res.status(400).json({ error: 'Invalid signature or nonce' });
            }

            // ethers.js가 내부적으로 생성할 트랜잭션 데이터가 올바른지 사전 점검 
            // const txRequest = await (forwarder.populateTransaction as any).execute(toSign, signature);
            // console.log('📦 예상 트랜잭션 데이터:', txRequest);
            // console.log('📦 예상 txRequest.data:', txRequest.data);
            // console.log('🔍 forwarder.populateTransaction keys:', Object.keys(forwarder.populateTransaction));

            // 메타 트랜잭션 실행 (Relayer가 가스 지불)            
            console.log("🚀 실행 전 전달 data:", toSign.data);
            // // 여기서 명시적으로 ABI 인코딩 (이 방식은 안됨 > 주석 처리 )
            // const data = forwarderInterface.encodeFunctionData('execute', [toSign, signature]);

            // tx = await wallet.sendTransaction({
            //     to: FORWARDER_ADDRESS,
            //     data,
            //     gasLimit: BigInt(request.gas || 500000),
            // });

            // forwarder.execute() 호출 대신 encodeFunctionData() + sendTransaction() 방식으로 전환
            // 트랜잭션이 전송되기 전에 반드시 ABI 인코딩 확인
            // forwarder.execute() 호출을 Relayer가 signer로 실행했기 때문에 Relayer가 가스비를 냄 
            tx = await forwarder.execute(toSign, signature, {
                gasLimit: BigInt(request.gas || 500000),
            });
        }

        const receipt = await tx.wait();
        if (!receipt) {
            throw new Error("❌ Transaction receipt is null");
        }
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
    console.log(`🛠️ Forwarder address: ${FORWARDER_ADDRESS}`);
    console.log(`🔗 Provider: ${RPC_URL}`);
});

