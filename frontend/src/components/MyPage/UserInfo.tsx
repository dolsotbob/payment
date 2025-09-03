// 지갑 주소 + 이메일 관리 
// components/MyPage/UserInfo.tsx
import React from 'react';
import './MyPage.css';

// const UserInfo: UserInfo라는 이름의 변수를 선언하고,그 변수에 컴포넌트를 할당한다 
// : React.FC: 타입스트립트의 타입 지정; 이 컴포넌트가 React Function Component임을 명시한다 
// FC는 FunctionComponent의 줄임말이며, React.FC<Props> 형태로 props타입도 지정 가능 
const UserInfo: React.FC = () => {
    const walletAddress = localStorage.getItem('walletAddress');

    return (
        <div className='mypage-section'>
            <h3>User Info</h3>
            <p><strong>Wallet:</strong> {walletAddress || 'Not connected'}</p>
        </div>
    );
};

export default UserInfo;