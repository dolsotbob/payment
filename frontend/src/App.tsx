// 지갑 연결 및 라우팅 담당 

import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import { connectAndLogin } from './utils/walletLogin';
import ProfilePage from './pages/ProfilePage';
import PaymentHistory from './pages/PaymentHistory';
import PaymentPage from './pages/PaymentPage';
import Footer from './components/Footer';
import { ethers } from 'ethers';
import './App.css';

const App: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);

  const handleLoginWithWallet = async () => {
    await connectAndLogin(setAccount);
  };

  return (
    <Router>
      <Navbar account={account} />
      <div className='container'>
        <Routes>
          <Route path="/mypage" element={<ProfilePage />} />
          <Route path="/" element={
            <PaymentPage
              account={account}
              onLogin={handleLoginWithWallet}
              onLogout={() => setAccount(null)}
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
