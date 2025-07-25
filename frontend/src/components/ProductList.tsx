// 사용자가 구매 가능한 상품 목록을 보여주는 UI 컴포넌트 
// 결제를 직접 실행하지 않고 어떤 상품이 선택됐는지 알려주는 역할 
import React, { useState } from 'react';
import './css/ProductList.css';
import { Product } from '../types';

interface ProductListProps {
    products: Product[]; // ✅ 상위에서 상품 목록 (이름, 가격 등 포함) 전달받음
    onPurchase: (product: Product) => void; // 상위 컴포넌트 구매 요청 콜백 
}

const ProductList: React.FC<ProductListProps> = ({ products, onPurchase }) => {
    const [hoveredProductId, setHoveredProductId] = useState<number | null>(null);

    return (
        <div className="product-list">
            <h2 className="product-list-title">⭐️ NEW ARRIVALS ⭐️</h2>
            <ul>
                {products.map((product) => (
                    <li key={product.id}
                        className="product-item"
                        onMouseEnter={() => setHoveredProductId(product.id)}
                        onMouseLeave={() => setHoveredProductId(null)}
                    >
                        <img
                            src={
                                hoveredProductId === product.id && product.hoverImageUrl
                                    ? product.hoverImageUrl
                                    : product.imageUrl
                            }
                            alt={product.name}
                            className="product-image"
                        />
                        <h3>{product.name}</h3>
                        <p>가격: {product.price} TORI</p>
                        <button onClick={() => onPurchase(product)}>선택하기</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ProductList;