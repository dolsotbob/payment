// 지갑 연결 및 라우팅 담당 

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import LoginPage from './pages/LoginPage';
import ProfilePage from './pages/ProfilePage';
import PaymentHistory from './pages/PaymentHistory';
import PaymentPage from './pages/PaymentPage';
import Footer from './components/Footer';
import { ethers } from 'ethers';
import './App.css';

const App: React.FC = () => {
  // 상태 변수 선언 
  // account: 연결된 지갑 주소를 저장할 변수 
  // 처음엔 null이지만, 지갑을 연결하면 주소가 여기 저장됨
  const [account, setAccount] = useState<string | null>(null);

  const connectWallet = async () => {
    if (!window.ethereum) {
      alert("🦊 메타마스크를 설치해주세요!");
      return;
    }

    try {
      // provide는 ethers.js에서 메마와 통신하기 위한 연결 통로를 만드는 객체 
      // window.ethereum을 기반으로 하며 이후 모든 요청은 provider를 통해 이루어짐 
      // ethers.BrowserProvider: 브라우저에서 메타마스크로 연결하는 객체  
      const provider = new ethers.BrowserProvider(window.ethereum);
      // 메마에서 사용자 지갑 주소 알려달라고 요청; 여기서 사용자의 지갑 연결 창이 뜬다 (허용 시 주소 반환)
      // eth_requestAccounts: 메타마스크에게 “지갑 연결”을 요청하는 명령어
      const accounts = await provider.send("eth_requestAccounts", []);
      // 상태 업데이트 
      // 대부분의 dApp은 첫 번째 지갑 주소만 사용하므로 accounts[0]을 사용 
      setAccount(accounts[0]);
    } catch (error) {
      console.error("❌ 지갑 연결 실패:", error);
      alert('지갑 연결 중 오류가 발생했습니다. 다시 시도해주세요.');
    }
  };

  return (
    <Router>
      <Navbar account={account} />
      <div className='container'>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/" element={
            <PaymentPage
              account={account}
              connectWallet={connectWallet}
            />}
          />
          <Route path="/payment-history" element={
            account ? <PaymentHistory account={account} /> : <p>🦊 지갑을 먼저 연결해주세요</p>
          } />
        </Routes>
        <Footer />
      </div>
    </Router >
  );
};

export default App;
