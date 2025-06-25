// 사용자가 구매 가능한 상품 목록을 보여주는 UI 컴포넌트 
// 결제를 직접 실행하지 않고 어떤 상품이 선택됐는지 알려주는 역할 
import React from 'react';
import { Product } from '../types';

interface ProductListProps {
    products: Product[]; // ✅ 상위에서 상품 목록 (이름, 가격 등 포함) 전달받음
    onPurchase: (product: Product) => void; // 상위 컴포넌트 구매 요청 콜백 
}

const ProductList: React.FC<ProductListProps> = ({ products, onPurchase }) => {
    return (
        <div style={{ padding: '1rem' }}>
            <h2>🛒 상품 목록</h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
                {products.map((product) => (
                    <li
                        key={product.id}
                        style={{
                            marginBottom: '1rem',
                            border: '1px solid #ddd',
                            padding: '1rem',
                            borderRadius: '8px',
                        }}
                    >
                        <h3>{product.name}</h3>
                        <p>가격: {product.price}</p>
                        <button onClick={() => onPurchase(product)}>결제하기</button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default ProductList;