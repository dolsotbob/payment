// 사용자가 구매 가능한 상품 목록을 보여주는 UI 컴포넌트 
// 결제를 직접 실행하지 않고 어떤 상품이 선택됐는지 알려주는 역할 
import React, { useState, useEffect } from 'react';
import './css/ProductList.css';
import { Product } from '../types/types';
import { formatUnits } from "ethers";

interface ProductListProps {
    products: Product[]; // 상위에서 상품 목록 (이름, 가격 등 포함) 전달받음
    onPurchase: (product: Product) => void; // 상위 컴포넌트 구매 요청 콜백 
}

const ProductList: React.FC<ProductListProps> = ({ products, onPurchase }) => {
    const [hoveredProductId, setHoveredProductId] = useState<Product['id'] | null>(null);
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

    // 모달 열릴 때 body 스크롤 잠금 + ESC로 닫기
    useEffect(() => {
        if (!selectedProduct) return;

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setSelectedProduct(null);
        };

        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        window.addEventListener('keydown', onKeyDown);

        return () => {
            document.body.style.overflow = prevOverflow;
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [selectedProduct]);

    // wei → TORI 문자열 변환 헬퍼
    const toTori = (wei?: string | bigint) =>
        wei == null ? "0" : formatUnits(wei, 18);

    const displayPrice = (p: Product) => {
        return `${toTori(p.priceWei)} TORI`;
    };

    // 무한 스크롤 느낌을 위해 1회 복제 (key 충돌 방지용 dup 플래그 사용)
    const carouselItems = [...products, ...products];

    return (
        <div className="product-list">
            <h2 className="product-list-title">🎉 NEW ARRIVALS 🎉</h2>

            {/* 가로 스크롤 가능한 캐러셀 */}
            <div className="carousel-container">
                <ul className="carousel" aria-label="상품 캐러셀">
                    {carouselItems.map((product, index) => {
                        const isDup = index >= products.length ? 'dup1' : 'orig';
                        const isHovered = hoveredProductId === product.id;

                        const imgSrc = isHovered && (product as any).hoverImageUrl
                            ? (product as any).hoverImageUrl
                            : (product as any).imageUrl;

                        return (
                            <li
                                key={`${product.id}-${isDup}-${index}`}
                                className="carousel-item"
                                onMouseEnter={() => setHoveredProductId(product.id)}
                                onMouseLeave={() => setHoveredProductId(null)}
                                onClick={() => setSelectedProduct(product)}
                                role="button"
                                tabIndex={0}
                                aria-label={`${product.name} 상세 보기`}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') setSelectedProduct(product);
                                }}
                            >
                                <img
                                    src={imgSrc}
                                    alt={product.name}
                                    className="product-image"
                                    loading="lazy"
                                />
                                <div className="carousel-item-name">{product.name}</div>
                                <div className="carousel-item-price">{displayPrice(product)} TORI</div>
                            </li>
                        );
                    })}
                </ul>
            </div>

            {/* 모달: 선택한 상품 정보 */}
            {selectedProduct && (
                <div
                    className="modal-overlay"
                    onClick={() => setSelectedProduct(null)}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="product-modal-title"
                >
                    <div
                        className="modal-content"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <img
                            src={(selectedProduct as any).imageUrl}
                            alt={selectedProduct.name}
                            className="modal-image"
                        />
                        <h3 id="product-modal-title">{selectedProduct.name}</h3>
                        <p>가격: {displayPrice(selectedProduct)} TORI</p>

                        <div className="modal-actions">
                            <button
                                onClick={() => {
                                    onPurchase(selectedProduct);
                                    setSelectedProduct(null);
                                }}
                            >
                                결제하기
                            </button>
                            <button
                                className="close-btn"
                                onClick={() => setSelectedProduct(null)}
                                aria-label="모달 닫기"
                            >
                                X
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductList;