import React, { useState, useEffect } from 'react';  // React 라이브러리와 useState 상태 저장 리액트 훅 
import { ethers } from 'ethers';  // 메타마스크와 통신할 수 있는 Ethereum JS 라이브러리
import ProductList from './components/ProductList';
import { Product } from './types';
import PayButton from './components/PayButton';
import ApproveAndPay from './components/ApproveAndPay';

const App: React.FC = () => {
  // 상태 변수 선언 
  // account: 연결된 지갑 주소를 저장할 변수 
  // 처음엔 null이지만, 지갑을 연결하면 주소가 여기 저장됨
  const [account, setAccount] = useState<string | null>(null);

  // 1. 상품 목록 (App이 상태 주도권을 가짐)
  const products: Product[] = [
    { id: 1, name: 'Web3 티셔츠', price: '0.01' },
    { id: 2, name: 'NFT 머그컵', price: '0.02' },
    { id: 3, name: '블록체인 책', price: '0.05' },
  ];

  // 2. 🦊 지갑 연결
  const connectWallet = async () => {  // 지갑 연결 요청을 실행하는 버튼 이벤트 핸들러 함수 
    try {
      // 사용자의 브라우저에 메마 설치 여부 확인 -> 없으면 경고창 띄우고 함수 종료 
      // window.ethereum: window는 브라우저 전역 객체, ethereum은 메마가 브라우저에 추가해주는 객체 
      if (!window.ethereum) {
        alert("🦊 메타마스크를 설치해주세요!");
        return;
      }
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
      console.error("지갑 연결 실패:", error);
      alert('지갑 연결에 실패했습니다.');
    }
  };

  // 3. 💸 결제 처리
  const storeAddress = "0xf4d9250bcca2a0df2089bc1021bcdcc99964c210";

  const handlePurchase = async (product: Product) => {
    try {
      if (!window.ethereum || !account) {
        alert('지갑이 연결되어야 결제가 가능합니다.');
        return;
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

      const tx = await signer.sendTransaction({
        to: '0x스토어지갑주소', // 👉 TODO: 실제 상점 지갑 주소로 수정
        value: ethers.parseEther(product.price.replace(" ETH", "")),  // 예: "0.01 ETH" -> "0.01"
      });

      console.log("결제 트랜잭션:", tx);
      await tx.wait();
      alert(`${product.name} 결제 완료!`);
    } catch (error) {
      console.error('결제 실패:', error);
      alert('결제에 실패했습니다.');
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>🛍️ 코인 쇼핑몰 MVP</h1>

      {!account ? (
        <button onClick={connectWallet}>🦊 지갑 연결</button>
      ) : (
        <p>✅ 연결된 지갑: {account}</p>
      )}

      <ProductList products={products} onPurchase={handlePurchase} />

      {account && (
        <PayButton account={account} amount='0.01' />
      )}

      {/* acount!는 null이 아님을 확신한다는 의미  */}
      <ApproveAndPay account={account!} amount='0.01' />
    </div>
  );
};

export default App;
