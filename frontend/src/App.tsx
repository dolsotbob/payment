// 지갑 연결 및 라우팅 담당 
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { walletLogin } from './utils/walletLogin';
import PaymentHistory from './pages/PaymentHistory';
import PaymentPage from './pages/PaymentPage';
import Footer from './components/Footer';
import MyPage from './pages/MyPage';
import './App.css';
import { fetchUserCoupons } from './utils/couponUtils';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

// 1) QueryClient는 컴포넌트 밖에서 생성(리렌더마다 재생성 방지)
const queryClient = new QueryClient();

// 2) 최상위 Provider 래퍼를 default export로
export default function AppRoot() {
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  )
}

// 3) 실제 앱 내용은 named export (default 아님)
export function App() {
  const [account, setAccount] = useState<string | null>(null);
  const handleLoginWithWallet = async () => {
    await walletLogin();
  };

  const handleLogout = () => {
    localStorage.removeItem('jwt'); // <-- token을 jwt로 교체    
    setAccount(null); // 상태 초기화
  };

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

