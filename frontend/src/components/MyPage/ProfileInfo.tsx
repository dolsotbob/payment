// 로그인 후 조회 페이지 
// 나중에 username, userId, 이메일 여기서 저장하고 표시되게 하기 

import React, { useEffect, useState } from 'react';
import { getProfile } from '../../api/user';

const ProfileInfo: React.FC = () => {
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        getProfile()
            .then(setUser)
            .catch(() => {
                alert('로그인이 필요합니다');
                window.location.href = '/login';
            });
    }, []);

    if (!user) return <p>불러오는 중...</p>;

    return (
        <div>
            <h2>프로필</h2>
            <p>Username: {user.username}</p>
            <p>User ID: {user.userId}</p>
        </div>
    );
};

export default ProfileInfo; 