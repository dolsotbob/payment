// src/pages/PaymentHistory.tsx
import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { ethers } from 'ethers';

// null/undefined/이상값 → '0' 으로 정규화
const toWeiString = (v: unknown): string => {
    if (v == null) return '0';
    const s = String(v);
    return /^[0-9]+$/.test(s) ? s : '0';
};
// 안전 포맷 (18decimals 기준)
const fmt = (v: unknown, decimals = 18) => ethers.formatUnits(toWeiString(v), decimals);

interface PaymentRecord {
    id: number;
    from: string;
    // 백엔드가 주는 필드들: null/undefined 가능
    originalPrice?: string | null;
    discountedPrice?: string | null;
    discountAmount?: string | null;
    cashbackAmount?: string | null;
    productName?: string | null;
    status?: 'SUCCESS' | 'FAILED' | 'PENDING';
    txHash?: string | null;
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
                    `${process.env.REACT_APP_BACKEND_URL}/payment?user=${account.toLowerCase()}`
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
                            <p><strong>📦 상품: </strong> {r.productName ?? '이름 없음'}</p>
                            <p><strong>💸 결제:</strong> {Number(fmt(r.discountedPrice ?? r.originalPrice)).toFixed(6)} TORI</p>
                            <p><strong>🎁 캐시백:</strong> {Number(fmt(r.cashbackAmount)).toFixed(6)} TORI</p>

                            <p>
                                <strong>🔗 Tx:</strong>{' '}

                                {r.txHash ? (
                                    <a href={`https://kairos.kaiascan.io/tx/${r.txHash}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {r.txHash.slice(0, 10)}...
                                    </a>
                                ) : '—'}
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