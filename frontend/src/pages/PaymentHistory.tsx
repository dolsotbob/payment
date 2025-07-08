// src/pages/PaymentHistory.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { formatEther } from 'ethers';

interface PaymentRecord {
    id: number;
    from: string;
    amount: string;  // in wei
    cashbackAmount: string;  // in wei
    productName: string
    status: 'SUCCESS' | 'FAILED';
    txHash: string;
    createdAt: string;
}

interface Props {
    account: string;
}

const PaymentHistory: React.FC<Props> = ({ account }) => {
    const [records, setRecords] = useState<PaymentRecord[]>([]);

    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await axios.get<PaymentRecord[]>(
                    `${process.env.REACT_APP_API_URL}/payment?user=${account.toLowerCase()}`
                );
                setRecords(res.data);
            } catch (error) {
                console.error('❌ 결제 내역 조회 실패:', error);
            }
        };

        if (account) {
            fetchHistory();
        }
    }, [account]);

    return (
        <div style={{ padding: '2rem' }}>
            <h2>📜 결제 내역</h2>

            {records.length === 0 ? (
                <p>결제 내역이 없습니다.</p>
            ) : (
                <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))' }}>
                    {records.map((r) => (
                        <div key={r.id} style={{
                            border: '1px solid #ccc',
                            borderRadius: '10px',
                            padding: '1rem',
                            boxShadow: '0 2px 5px rgba(0, 0, 0, 0.1)'
                        }}>
                            <p><strong>📅 날짜:</strong> {new Date(r.createdAt).toLocaleString()}</p>
                            <p><strong>📦 상품: </strong> {r.productName || '이름 없음'}</p>
                            <p><strong>💸 결제:</strong> {Number(formatEther(r.amount)).toFixed(6)} KAIA</p>
                            <p><strong>🎁 캐시백:</strong> {Number(formatEther(r.cashbackAmount)).toFixed(6)} KAIA</p>
                            <p>
                                <strong>🔗 Tx:</strong>{' '}
                                <a
                                    href={`https://kairos.kaiascan.io/tx/${r.txHash}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {r.txHash.slice(0, 10)}...
                                </a>
                            </p>
                            <p><strong>상태:</strong> {r.status === 'SUCCESS' ? '✅ 성공' : '❌ 실패'}</p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default PaymentHistory;