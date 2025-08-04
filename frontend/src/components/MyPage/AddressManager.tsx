import React, { useState, useEffect } from 'react';
import './MyPage.css';

const AddressManager: React.FC = () => {
    const [address, setAddress] = useState('');

    //  useEffect를 사용하여, 컴포넌트가 처음 렌더링될 때(localStorage에서 주소를 읽어와 상태를 초기화하는 코드
    // 두 번째 인자로 []가 들어가면, 컴포넌트가 마운트(처음 화면에 나타날 때)될 때 딱 한 번 실행됨 
    useEffect(() => {
        const stored = localStorage.getItem('shippingAddress');
        // 만약 localStorage에 'shippingAddress'라는 키로 저장된 값이 있다면, 그 값을 가져와 setAddress에 전달 
        if (stored) setAddress(stored);
    }, []);

    const handleSave = () => {
        localStorage.setItem('shippingAddress', address);
        alert('Address saved!');
    };

    return (
        <div className="mypage-section">
            <h3>Shipping Address</h3>
            <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={3}
                style={{ width: '100%' }}
            />
            <br />
            <button onClick={handleSave}>Save</button>
        </div>
    );
};

export default AddressManager;