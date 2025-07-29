// 프로필, 보호된 유저 API 

// user.ts
import api from './axios';

export const getProfile = async () => {
    const res = await api.get('/user/me');
    return res.data;
};