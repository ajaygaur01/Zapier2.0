"use client";

// apps/frontend/src/context/AuthContext.tsx
import { createContext, useContext, useEffect, useState } from "react";
import { signinApi, signupApi, getMeApi } from "../hooks/useAuth";

interface User {
    id: number;
    name: string;
    email: string;
}

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signin: (email: string, password: string) => Promise<void>;
    signup: (name: string, email: string, password: string) => Promise<void>;
    signout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    // on app load check if token exists and fetch user
    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) {
            setLoading(false);
            return;
        }

        getMeApi()
            .then((data: any) => setUser(data.user))
            .catch(() => localStorage.removeItem("token"))
            .finally(() => setLoading(false));
    }, []);

    const signin = async (email: string, password: string) => {
        const data = await signinApi(email, password);
        localStorage.setItem("token", data.token);
        setUser(data.user);
    };

    const signup = async (name: string, email: string, password: string) => {
        const data = await signupApi(name, email, password);
        localStorage.setItem("token", data.token);
        setUser(data.user);
    };

    const signout = () => {
        localStorage.removeItem("token");
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, loading, signin, signup, signout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used inside AuthProvider");
    }
    return context;
}