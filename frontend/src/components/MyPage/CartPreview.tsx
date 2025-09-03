import React from 'react';
import './MyPage.css';

const CartPreview: React.FC = () => {
    const cartItems = [
        { id: 1, name: 'T-shirt', price: '0.01 TORI' },
    ];

    return (
        <div className='mypage-section'>
            <h3>Cart Preview</h3>
            {cartItems.length > 0 ? (
                <ul>
                    {cartItems.map(item => (
                        <li key={item.id}>{item.name} - {item.price}</li>
                    ))}
                </ul>
            ) : (
                <p>Cart is empty.</p>
            )}
        </div>
    )
}

export default CartPreview;