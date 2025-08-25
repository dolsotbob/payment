// 지갑 연결 및 라우팅 담당 
import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { walletLogin } from './utils/walletLogin';
import PaymentHistory from './pages/PaymentHistory';
import PaymentPage from './pages/PaymentPage';
import Footer from './components/Footer';
import MyPage from './pages/MyPage';
import './App.css';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/AuthContext";

// 1) QueryClient는 컴포넌트 밖에서 생성(리렌더마다 재생성 방지)
const queryClient = new QueryClient();

// 2) 최상위 Provider 래퍼를 default export로
export default function AppRoot() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </QueryClientProvider>
  )
}

// 3) 실제 앱 내용 (Context 사용)
export function App() {
  const { account, isLoggedIn, loading, loginWithWallet, logout } = useAuth();

  // 로딩 중 상태 표시(선택)
  if (loading) {
    return (
      <div className='loading'>
        초기화 중...
      </div>
    )
  }

  return (
    <Router>
      <Navbar account={account} onLogout={logout} />
      <div className="container">
        <Routes>
          <Route
            path="/"
            element={
              <PaymentPage
                account={account}
                onLogin={loginWithWallet} // ✅ Context의 로그인 사용
              />
            }
          />
          <Route
            path="/payment-history"
            element={
              isLoggedIn && account ? (
                <PaymentHistory account={account} />
              ) : (
                <p>🦊 지갑을 먼저 연결해주세요</p>
              )
            }
          />
          <Route path="/mypage" element={<MyPage />} />
        </Routes>
        <Footer />
      </div>
    </Router>
  );
}
