// 라우팅에 의해 보여지는 하나의 "페이지" 컴포넌트 
// src/pages/MyPage/index.tsx 

import '../MyPage/MyPage.css';

import UserInfo from '../../components/MyPage/UserInfo';
import RewardInfo from '../../components/MyPage/RewardInfo';
import WalletManager from '../../components/MyPage/WalletManager';
import OrderHistory from '../../components/MyPage/OrderHistory';
import CartPreview from '../../components/MyPage/CartPreview';
import LogoutButton from '../../components/MyPage/LogoutButton';
import AddressManager from '../../components/MyPage/AddressManager';

const MyPage = () => {
    return (
        <div className="mypage-container">
            <div className="mypage-header">
                <h2>My Page</h2>
                <LogoutButton />
            </div>

            <UserInfo />
            <RewardInfo />
            <WalletManager />
            <AddressManager />
            <OrderHistory />
            <CartPreview />
        </div>
    );
};

export default MyPage; 