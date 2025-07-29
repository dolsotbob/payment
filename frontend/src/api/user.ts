// 프로필, 보호된 유저 API 

import axios from 'axios';

export const getProfile = async () => {
    const token = localStorage.getItem('token');
    const res = await axios.get(`${process.env.REACT_APP_BACKEND_URL}/user/me`, {
        headers: {
            Authorization: `Bearer ${token}`,
        },
    });
    return res.data;
}