// 최근 결제 요약 + 배송 상태 
import React from 'react';
import './MyPage.css';

const OrderHistory: React.FC = () => {
    // 예시 주문 데이터 
    const orders = [
        { id: 1, item: 'T-shirt', status: 'Shipped' },
        { id: 2, item: 'Shoes', status: 'Preparing' },
    ];

    return (
        <div className='mypage-section'>
            <h3>Order History</h3>
            <ul>
                {orders.map((order) => (
                    <li key={order.id}>
                        {order.item} - {order.status}
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default OrderHistory;