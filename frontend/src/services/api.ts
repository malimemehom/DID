import axios from 'axios';

// 获取正确的 API 基础 URL
const getApiBaseUrl = (): string => {
    // 在 Vercel 部署环境中，这个变量会自动设置
    if (process.env.REACT_APP_API_URL) {
        return process.env.REACT_APP_API_URL;
    }
    
    // Vercel 自动提供的环境变量
    if (process.env.REACT_APP_API_SERVER) {
        return process.env.REACT_APP_API_SERVER;
    }
    
    // 生产环境默认使用相对路径（同域）
    if (process.env.NODE_ENV === 'production') {
        // 如果前端和后端在不同的 Vercel 项目，需要手动指定后端 URL
        return 'https://did-backend2.vercel.app';
    }
    
    // 开发环境
    return 'http://localhost:3001';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true // 确保跨域请求携带凭证
});

export const searchRabbitHole = async (params: {
    query: string;
    previousConversation?: Array<{ user?: string; assistant?: string }>;
    concept?: string;
    followUpMode?: "expansive" | "focused";
}, signal?: AbortSignal) => {
    const response = await api.post('/rabbitholes/search', params, { signal });
    return response.data;
};

export const chatWithAI = async (messages: Array<{ role: string; content: string }>, systemPrompt?: string) => {
    const response = await api.post('/chat', { messages, systemPrompt });
    return response.data;
};

// Global interceptor to catch 401/403 Authorization errors (expired or invalid token)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && (error.response.status === 401 || error.response.status === 403)) {
            // Token is invalid/expired
            localStorage.removeItem('auth_token');
            localStorage.removeItem('auth_user');
            window.location.reload(); // Reload the window to reset the AuthContext and UI state
        }
        return Promise.reject(error);
    }
);

export default api; 