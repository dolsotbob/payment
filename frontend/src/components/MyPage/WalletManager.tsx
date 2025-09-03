// 나중에 지갑연결하면 여기서 잔액 확인할 수 있도록 + 자산 송금/받기 할 수 있도록 하기 

import React, { useEffect, useState } from 'react';
import './MyPage.css';

const WalletManager: React.FC = () => {
    const [balance, setBalance] = useState('0');

    useEffect(() => {
        // 예시로 더미 잔액
        setBalance('123.45 TORI');
    }, []);

    return (
        <div className="mypage-section">
            <h3>Wallet</h3>
            <p><strong>Balance:</strong> {balance}</p>
            {/* 나중에 NFT / 리워드 보기로 확장 */}
        </div>
    );
}

export default WalletManager;