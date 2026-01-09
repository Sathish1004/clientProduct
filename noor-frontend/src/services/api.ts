import axios from 'axios';
import { Platform } from 'react-native';

// Use different API URLs based on platform
const getApiUrl = () => {
    if (Platform.OS === 'web') {
        return 'http://localhost:5000/api';
    } else if (Platform.OS === 'android') {
        return 'http://10.0.2.2:5000/api'; // Android Emulator localhost
    } else {
        return 'http://localhost:5000/api'; // iOS Simulator
    }
};

const API_URL = getApiUrl();

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 10000, // 10 second timeout
});

export const setAuthToken = (token: string | null) => {
    if (token) {
        api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
        delete api.defaults.headers.common['Authorization'];
    }
};

export default api;
