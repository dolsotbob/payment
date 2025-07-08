// 사용자가 구매 가능한 상품 목록을 보여주는 UI 컴포넌트 
// 결제를 직접 실행하지 않고 어떤 상품이 선택됐는지 알려주는 역할 
import React from 'react';
import './css/ProductList.css';
import { Product } from '../types';
import { ethers } from 'ethers';

interface ProductListProps {
    products: Product[]; // ✅ 상위에서 상품 목록 (이름, 가격 등 포함) 전달받음
    onPurchase: (product: Product) => void; // 상위 컴포넌트 구매 요청 콜백 
}

const ProductList: React.FC<ProductListProps> = ({ products, onPurchase }) => {
    console.log('ProductList에 전달된 products:', products); // ✅ 여기!

    return (
        <div className="product-list">
            <h2 className="product-list-title">⭐️ 판매 중 ⭐️</h2>
            <ul>
                {products.map((product) => (
                    <li key={product.id} className="product-item">
                        <img src={product.imageUrl} alt={product.name} className="product-image" />
                        <h3>{product.name}</h3>
                        <p>가격: {ethers.formatUnits(product.price.toString(), 18)} TTKN</p>
                        <button onClick={() => onPurchase(product)}>선택하기</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ProductList;