// apps/frontend/src/api/auth.ts
import axios from "axios";

const API_URL = "http://localhost:3000";

export const api = axios.create({
    baseURL: API_URL,
});

// attach token to every request automatically
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export async function signupApi(name: string, email: string, password: string) {
    const res = await api.post("/api/v1/user/signup", { name, email, password });
    return res.data;
}

export async function signinApi(email: string, password: string) {
    const res = await api.post("/api/v1/user/signin", { email, password });
    return res.data;
}

export async function getMeApi() {
    const res = await api.get("/api/v1/user");
    return res.data;
}