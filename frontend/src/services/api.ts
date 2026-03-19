import axios from 'axios';

// 获取正确的 API 基础 URL（不包含 /api 路径）
const getApiBaseUrl = (): string => {
    let url = '';
    
    if (process.env.REACT_APP_API_URL) {
        url = process.env.REACT_APP_API_URL;
    } else if (process.env.REACT_APP_API_SERVER) {
        url = process.env.REACT_APP_API_SERVER;
    }
    
    if (url) {
        // 移除末尾的 /api 如果存在
        url = url.replace(/\/api\s*$/, '');
        // 如果没有 http/https 前缀，自动补全（避免 Axios 将其作为相对路径处理）
        if (!url.startsWith('http://') && !url.startsWith('https://')) {
            url = 'https://' + url;
        }
        return url;
    }
    
    if (process.env.NODE_ENV === 'production') {
        return 'https://did-backend.vercel.app';
    }
    
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
    try {
        console.log(`[API] Sending search request to ${API_BASE_URL}/api/rabbitholes/search`, params);
        console.log('[API] Axios baseURL:', api.defaults.baseURL);
        const response = await api.post('/rabbitholes/search', params, { signal });
        console.log('[API] Search response received:', response.data);
        return response.data;
    } catch (error: any) {
        console.error('[API] Search request failed:', error);
        console.error('[API] Error code:', error.code);
        console.error('[API] Error message:', error.message);
        console.error('[API] Error response:', error.response);
        console.error('[API] Error request:', error.request);
        
        if (!error.response) {
            // 网络错误或请求被中止
            if (error.code === 'ECONNREFUSED' || error.message?.includes('ECONNREFUSED')) {
                throw new Error(`❌ 无法连接到后端服务器 (${API_BASE_URL}) - 请确保后端已启动`);
            }
            if (error.code === 'ERR_NETWORK' || error.message?.includes('ERR_NETWORK')) {
                throw new Error(`❌ 网络错误: ${error.message}\n建议检查：1) 后端服务器是否运行 2) 防火墙设置 3) URL是否正确 (${API_BASE_URL})`);
            }
            throw new Error(`❌ 网络错误: ${error.message || '无法连接到服务器'}`);
        }
        
        if (error.response?.status === 500) {
            throw new Error(`❌ 服务器错误 (500): ${error.response?.data?.details || error.response?.data?.error || '未知错误'}`);
        }
        
        if (error.response?.status === 400) {
            throw new Error(`❌ 请求参数错误: ${error.response?.data?.error || '参数格式不正确'}`);
        }
        
        throw new Error(`❌ 请求失败 (${error.response?.status}): ${error.response?.data?.error || error.message}`);
    }
};

export const chatWithAI = async (messages: Array<{ role: string; content: string }>, systemPrompt?: string) => {
    const response = await api.post('/chat', { messages, systemPrompt });
    return response.data;
};

export const generateDebateSummary = async (params: {
    sources: Array<{ title: string; snippet?: string }>;
    proArguments?: Array<{ content: string; note?: string }>;
    conArguments?: Array<{ content: string; note?: string }>;
}) => {
    const response = await api.post('/rabbitholes/debate/summary', params);
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