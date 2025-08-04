// 📝 나중에 API로 캐시백 금액 불러오기 

import React from 'react';
import './MyPage.css';

const RewardInfo: React.FC = () => {
    // 예시 누적 캐시백
    const totalCashback = '10.50 TORI';

    return (
        <div className='mypage-section'>
            <h3>Reward Info</h3>
            <p><strong>Total Cashback:</strong> {totalCashback}</p>
            {/* 나중에 그래프나 차트 추가 */}
        </div>
    );
};

export default RewardInfo;