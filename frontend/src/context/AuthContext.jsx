// src/context/AuthContext.js
import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from "react";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    // Состояние
    const [accessToken, setAccessToken] = useState(
        () => localStorage.getItem("accessToken")
    );
    const [refreshToken, setRefreshToken] = useState(
        () => localStorage.getItem("refreshToken")
    );
    const [user, setUser] = useState(() => {
        const u = localStorage.getItem("user");
        return u ? JSON.parse(u) : null;
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const isRefreshing = useRef(false);
    const refreshInterval = useRef(null);

    // Утилиты
    const handleError = (e) => {
        console.error(e);
        setError(e.message || "Ошибка");
    };
    const parseJwt = (token) => {
        try {
            const part = token.split(".")[1];
            return JSON.parse(
                atob(part.replace(/-/g, "+").replace(/_/g, "/"))
            );
        } catch {
            return {};
        }
    };
    const isExpired = (token) => {
        const { exp } = parseJwt(token);
        return !exp || exp * 1000 < Date.now();
    };

    // Обновление accessToken через refreshToken
    const refreshAccessToken = useCallback(async () => {
        if (!refreshToken) throw new Error("Нет refreshToken");
        if (isRefreshing.current) return;
        isRefreshing.current = true;
        try {
            const res = await fetch("http://127.0.0.1:8000/api/token/refresh/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ refresh: refreshToken }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || `Status ${res.status}`);
            }
            const { access } = await res.json();
            setAccessToken(access);
            localStorage.setItem("accessToken", access);
            return access;
        } finally {
            isRefreshing.current = false;
        }
    }, [refreshToken]);

    // Авто-обновление каждые 14 минут
    useEffect(() => {
        if (accessToken) {
            refreshInterval.current = setInterval(async () => {
                try {
                    await refreshAccessToken();
                } catch {
                    // если не удалось — выходим
                    logout();
                }
            }, 14 * 60 * 1000);
        }
        return () => clearInterval(refreshInterval.current);
    }, [accessToken, refreshAccessToken]);

    // Загрузка профиля
    const fetchUser = useCallback(
        async (token) => {
            setLoading(true);
            setError(null);

            // перед запросом — если токен истек, обновляем
            let t = token;
            if (isExpired(t)) {
                try {
                    t = await refreshAccessToken();
                } catch {
                    await logout();
                    return;
                }
            }

            try {
                const res = await fetch("http://127.0.0.1:8000/api/users/me/", {
                    headers: { Authorization: `Bearer ${t}` },
                });
                if (!res.ok) throw new Error(`Status ${res.status}`);
                const data = await res.json();
                setUser(data);
                localStorage.setItem("user", JSON.stringify(data));
            } catch (e) {
                handleError(e);
                setUser(null);
            } finally {
                setLoading(false);
            }
        },
        [refreshAccessToken]
    );

    // Login
    const login = useCallback(
        async (email, password) => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch("http://127.0.0.1:8000/api/login/", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || `Status ${res.status}`);
                }
                const { access, refresh } = await res.json();
                setAccessToken(access);
                setRefreshToken(refresh);
                localStorage.setItem("accessToken", access);
                localStorage.setItem("refreshToken", refresh);

                await fetchUser(access);
            } catch (e) {
                handleError(e);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [fetchUser]
    );

    // Logout
    const logout = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await fetch("http://127.0.0.1:8000/api/logout/", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({ refresh: refreshToken }),
            });
        } catch (e) {
            console.warn("Logout error", e);
        } finally {
            clearInterval(refreshInterval.current);
            setAccessToken(null);
            setRefreshToken(null);
            setUser(null);
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("user");
            setLoading(false);
        }
    }, [accessToken, refreshToken]);

    // Registration
    const register = useCallback(async (email, password, password2) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch("http://127.0.0.1:8000/api/users/", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, password2 }),
            });
            if (!res.ok) {
                const err = await res.json();
                const error = new Error("Ошибка регистрации");
                error.response = err; // передаём весь объект с ошибками
                throw error;

            }
        } catch (e) {
            handleError(e);
            throw e;
        } finally {
            setLoading(false);
        }
    }, []);

    // Update profile
    const updateProfile = useCallback(
        async (fields) => {
            setLoading(true);
            setError(null);

            // pre-check token
            let t = accessToken;
            if (isExpired(t)) {
                try {
                    t = await refreshAccessToken();
                } catch {
                    await logout();
                    return;
                }
            }

            try {
                const res = await fetch("http://127.0.0.1:8000/api/users/me/", {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${t}`,
                    },
                    body: JSON.stringify(fields),
                });
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || `Status ${res.status}`);
                }
                const updated = await res.json();
                setUser(updated);
                localStorage.setItem("user", JSON.stringify(updated));
            } catch (e) {
                handleError(e);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [accessToken, refreshAccessToken, logout]
    );

    // Change password
    const changePassword = useCallback(
        async (oldP, newP, newP2) => {
            setLoading(true);
            setError(null);

            let t = accessToken;
            if (isExpired(t)) {
                try {
                    t = await refreshAccessToken();
                } catch {
                    await logout();
                    return;
                }
            }

            try {
                const res = await fetch(
                    "http://127.0.0.1:8000/api/users/me/change_password/",
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            Authorization: `Bearer ${t}`,
                        },
                        body: JSON.stringify({
                            password: oldP,
                            new_password: newP,
                            new_password2: newP2,
                        }),
                    }
                );
                if (!res.ok) {
                    const err = await res.json();
                    throw new Error(err.detail || `Status ${res.status}`);
                }
            } catch (e) {
                handleError(e);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [accessToken, refreshAccessToken, logout]
    );

    // Авто-загрузка профиля при старте
    useEffect(() => {
            if (accessToken) {
                fetchUser(accessToken);
            }
        },
        [accessToken, fetchUser]);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!accessToken,
                loading,
                error,
                register,
                login,
                logout,
                updateProfile,
                changePassword,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
};
