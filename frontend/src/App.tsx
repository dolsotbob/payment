import React, { useState } from 'react';  // React 라이브러리와 useState 상태 저장 리액트 훅 
import { ethers } from 'ethers';  // 메타마스크와 통신할 수 있는 Ethereum JS 라이브러리
import ProductList from './components/ProductList';
import { Product } from './types';
// import PayButton from './components/PayButton';
import ApproveAndPay from './components/ApproveAndPay';

const App: React.FC = () => {
  // 상태 변수 선언 
  // account: 연결된 지갑 주소를 저장할 변수 
  // 처음엔 null이지만, 지갑을 연결하면 주소가 여기 저장됨
  const [account, setAccount] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

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
  // 상품을 클릭(선택) 했을 때 호출되는 함수 
  // 전달 받은 product 객체를 상태 변수 selectedProduct에 저장 
  // 저장된 selectedProduct는 아래 컴포넌트들(PayButton, ApproveAndPay)에서 amount={selectedProduct.price} 형태로 전달된다 
  const handlePurchase = (product: Product) => {
    setSelectedProduct(product);
  };


  return (
    <div style={{ padding: '2rem' }}>
      <h1>🛍️ 코인로 쇼핑하는 스토어 MVP</h1>

      {/* // 지갑 연결 여부에 따라 조건부 렌더링  */}
      {!account ? (
        <button onClick={connectWallet}>🦊 지갑 연결</button>
      ) : (
        <p>✅ 연결된 지갑: {account}</p>
      )}

      {/* 상품 목록을 보여주는 컴포넌트 
      onPurchase: 사용자가 "결제하기"를 누르면 호출되는 함수 {handlePurchase}로 전달  */}
      <ProductList products={products} onPurchase={handlePurchase} />

      {account && selectedProduct && (
        <>
          {/* <PayButton account={account} amount={selectedProduct.price} /> */}
          <ApproveAndPay account={account} amount={selectedProduct.price} />
        </>
      )}
    </div>
  );
};

export default App;
