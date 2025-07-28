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
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    return (
        <div className="product-list">
            <h2 className="product-list-title">⭐️ NEW ARRIVALS ⭐️</h2>

            {/* 가로 스크롤 가능한 캐러셀 */}
            <div className="carousel-container">
                <ul className="carousel">
                    {[...products, ...products].map((product, index) => (
                        <li key={`${product.id}-${index}`}
                            // className={`carousel-item ${selectedProduct?.id === product.id ? 'selected' : ''}`}
                            className='carousel-item'
                            onMouseEnter={() => setHoveredProductId(product.id)}
                            onMouseLeave={() => setHoveredProductId(null)}
                            onClick={() => setSelectedProduct(product)}
                        >
                            <img
                                src={
                                    hoveredProductId === product.id && product.hoverImageUrl
                                        ? product.hoverImageUrl || product.imageUrl
                                        : product.imageUrl
                                }
                                alt={product.name}
                                className="product-image"
                            />
                            <div className="carousel-item-name">{product.name}</div>
                            <div className="carousel-item-price">{product.price} TORI</div>
                        </li>
                    ))}
                </ul>
            </div>

            {/* 모달: 선택한 상품 정보 */}
            {selectedProduct && (
                <div className="modal-overlay" onClick={() => setSelectedProduct(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <img
                            src={selectedProduct.imageUrl}
                            alt={selectedProduct.name}
                            className="modal-image"
                        />
                        <h3>{selectedProduct.name}</h3>
                        <p>가격: {selectedProduct.price} TORI</p>
                        {/* <p>색상: {selectedProduct.color}</p> */}
                        <button onClick={() => onPurchase(selectedProduct)}>결제하기</button>
                        <button className="close-btn" onClick={() => setSelectedProduct(null)}>X</button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductList;