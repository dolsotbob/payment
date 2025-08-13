// 지갑 연결 및 라우팅 담당 

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { connectAndLogin } from './utils/walletLogin';
import PaymentHistory from './pages/PaymentHistory';
import PaymentPage from './pages/PaymentPage';
import Footer from './components/Footer';
import MyPage from './pages/MyPage';
import './App.css';
import { fetchUserCoupons } from './utils/coupon';

const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [coupons, setCoupons] = useState<any[]>([]);

  const handleLoginWithWallet = async () => {
    await connectAndLogin(setAccount);
  };

  const handleLogout = () => {
    localStorage.removeItem('token'); // JWT 제거
    setAccount(null); // 상태 초기화
  };

  useEffect(() => {
    if (!account) { setCoupons([]); return; }
    fetchUserCoupons(account).then(setCoupons).catch(() => setCoupons([]));
  }, [account]);

  return (
    <Router>
      <Navbar account={account} onLogout={handleLogout} />
      <div className='container'>
        <Routes>
          <Route path="/" element={
            <PaymentPage
              account={account}
              // coupons={coupons}
              onLogin={handleLoginWithWallet}
            />}
          />
          <Route path="/payment-history" element={
            account ? <PaymentHistory account={account} /> : <p>🦊 지갑을 먼저 연결해주세요</p>
          } />
          <Route path="/mypage" element={<MyPage />} />
        </Routes>
        <Footer />
      </div>
    </Router >
  );
};

export default App;
