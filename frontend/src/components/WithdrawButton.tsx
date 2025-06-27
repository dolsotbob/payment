// Vault에서 출금하기 (onlyOwner용)

import React from 'react';
import { ethers } from 'ethers';
import { getVaultContract, getProviderAndSigner } from '../utils/blockchain';

interface WithdrawButtonProps {
    amount: string; // 예: '1.5' (ETH 단위)
}

const WithdrawButton: React.FC<WithdrawButtonProps> = ({ amount }) => {
    const handleWithdraw = async () => {
        try {
            if (!amount || Number(amount) <= 0) {
                alert('❗출금할 금액을 입력해주세요.');
                return;
            }

            const { signer } = await getProviderAndSigner();
            const vault = getVaultContract(signer);

            const weiAmount = ethers.parseUnits(amount, 18);
            const tx = await vault.withdraw(weiAmount);
            await tx.wait();

            alert(`✅ ${amount} 토큰 출금 성공!`);
        } catch (err) {
            console.error('❌ 출금 실패:', err);
            alert('❌ 출금에 실패했습니다.');
        }
    };

    return (
        <button onClick={handleWithdraw}>
            Vault에서 {amount} 토큰 출금하기
        </button>
    );
};

export default WithdrawButton;