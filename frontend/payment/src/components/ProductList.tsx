// ProductList.tsx

import React from 'react';
import { Product } from '../types';

interface ProductListProps {
    products: Product[]; // ✅ 상위에서 전달받음
    onPurchase: (product: Product) => void;
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