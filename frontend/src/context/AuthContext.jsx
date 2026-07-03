import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from "react";
import {
    clearAuthState,
    csrfFetch,
    ensureCsrfToken,
    hasAuthState,
} from "../utils/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const isRefreshing = useRef(false);
    const refreshInterval = useRef(null);

    const handleError = (e) => {
        console.error(e);
        const payload = e?.response ?? e?.data ?? null;
        if (payload) {
            if (typeof payload === "string") {
                setError(payload);
                return;
            }
            if (payload.detail) {
                setError(Array.isArray(payload.detail) ? payload.detail.join(" ") : String(payload.detail));
                return;
            }
            const vals = [];
            const collect = (v) => {
                if (Array.isArray(v)) return v.forEach(collect);
                if (v && typeof v === "object") return Object.values(v).forEach(collect);
                if (v != null) vals.push(String(v));
            };
            collect(payload);
            if (vals.length) {
                setError(vals.join(" "));
                return;
            }
        }
        setError(typeof e === "string" ? e : e?.message || "Ошибка");
    };

    const safeJson = async (res) => {
        try {
            return await res.json();
        } catch {
            return null;
        }
    };

    const buildError = (res, data) => {
        let msg = `Status ${res?.status ?? "unknown"}`;
        if (data) {
            if (typeof data === "string") msg = data;
            else if (data.detail) msg = Array.isArray(data.detail) ? data.detail.join(" ") : String(data.detail);
            else {
                const vals = [];
                const collect = (v) => {
                    if (Array.isArray(v)) return v.forEach(collect);
                    if (v && typeof v === "object") return Object.values(v).forEach(collect);
                    if (v != null) vals.push(String(v));
                };
                collect(data);
                if (vals.length) msg = vals.join(" ");
            }
        }
        const err = new Error(msg);
        err.response = data;
        err.status = res?.status;
        return err;
    };

    const refreshAccessToken = useCallback(async () => {
        if (isRefreshing.current) return false;
        isRefreshing.current = true;
        try {
            const res = await csrfFetch("/token/refresh/", {
                method: "POST",
                headers: { "Accept": "application/json", "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });

            if (!res.ok) {
                clearAuthState();
                return false;
            }
            await safeJson(res);
            return true;
        } catch (e) {
            console.warn("refreshAccessToken error", e);
            return false;
        } finally {
            isRefreshing.current = false;
        }
    }, []);

    const fetchUser = useCallback(
        async (retry = true) => {
            setLoading(true);
            setError(null);
            try {
                const res = await csrfFetch("/users/me/", {
                    method: "GET",
                    headers: { "Accept": "application/json" },
                });

                if (res.status === 401 && retry) {
                    const ok = await refreshAccessToken();
                    if (!ok) {
                        setUser(null);
                        clearAuthState();
                        return null;
                    }
                    return await fetchUser(false);
                }

                if (!res.ok) {
                    const data = await safeJson(res);
                    throw buildError(res, data);
                }

                const data = await safeJson(res);
                setUser(data);
                return data;
            } catch (e) {
                handleError(e);
                setUser(null);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [refreshAccessToken]
    );

    const login = useCallback(async (email, password) => {
        setLoading(true);
        setError(null);
        try {
            const res = await csrfFetch("/login/", {
                method: "POST",
                headers: { "Accept": "application/json", "Content-Type": "application/json" },
                body: JSON.stringify({ email, password }),
            });

            if (!res.ok) {
                const data = await safeJson(res);
                throw buildError(res, data);
            }

            await fetchUser();
            return true;
        } catch (e) {
            handleError(e);
            throw e;
        } finally {
            setLoading(false);
        }
    }, [fetchUser]);

    const register = useCallback(async (email, password, password2) => {
        setLoading(true);
        setError(null);
        try {
            const res = await csrfFetch("/users/", {
                method: "POST",
                headers: { "Accept": "application/json", "Content-Type": "application/json" },
                body: JSON.stringify({ email, password, password2 }),
            });

            if (!res.ok) {
                const data = await safeJson(res);
                throw buildError(res, data);
            }

            return true;
        } catch (e) {
            handleError(e);
            throw e;
        } finally {
            setLoading(false);
        }
    }, []);

    const logout = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await csrfFetch("/logout/", {
                method: "POST",
                headers: { "Accept": "application/json", "Content-Type": "application/json" },
                body: JSON.stringify({}),
            });
        } catch (e) {
            console.warn("Logout error", e);
        } finally {
            if (refreshInterval.current) clearInterval(refreshInterval.current);
            clearAuthState();
            setUser(null);
            setLoading(false);
        }
    }, []);

    const updateProfile = useCallback(
        async (fields) => {
            setLoading(true);
            setError(null);
            try {
                const res = await csrfFetch("/users/me/", {
                    method: "PATCH",
                    headers: { "Accept": "application/json", "Content-Type": "application/json" },
                    body: JSON.stringify(fields),
                });

                if (res.status === 401) {
                    const ok = await refreshAccessToken();
                    if (!ok) throw new Error("Unauthorized");

                    const res2 = await csrfFetch("/users/me/", {
                        method: "PATCH",
                        headers: { "Accept": "application/json", "Content-Type": "application/json" },
                        body: JSON.stringify(fields),
                    });

                    if (!res2.ok) {
                        const data = await safeJson(res2);
                        throw buildError(res2, data);
                    }

                    const updated = await safeJson(res2);
                    setUser(updated);
                    return updated;
                }

                if (!res.ok) {
                    const data = await safeJson(res);
                    throw buildError(res, data);
                }

                const updated = await safeJson(res);
                setUser(updated);
                return updated;
            } catch (e) {
                handleError(e);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [refreshAccessToken]
    );

    const changePassword = useCallback(
        async (oldP, newP, newP2) => {
            setLoading(true);
            setError(null);
            try {
                const res = await csrfFetch("/users/me/change_password/", {
                    method: "POST",
                    headers: { "Accept": "application/json", "Content-Type": "application/json" },
                    body: JSON.stringify({ password: oldP, new_password: newP, new_password2: newP2 }),
                });

                if (res.status === 401) {
                    const ok = await refreshAccessToken();
                    if (!ok) throw new Error("Unauthorized");

                    const res2 = await csrfFetch("/users/me/change_password/", {
                        method: "POST",
                        headers: { "Accept": "application/json", "Content-Type": "application/json" },
                        body: JSON.stringify({ password: oldP, new_password: newP, new_password2: newP2 }),
                    });

                    if (!res2.ok) {
                        const data = await safeJson(res2);
                        throw buildError(res2, data);
                    }

                    return true;
                }

                if (!res.ok) {
                    const data = await safeJson(res);
                    throw buildError(res, data);
                }

                return true;
            } catch (e) {
                handleError(e);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [refreshAccessToken]
    );

    /**
     * authFetch - универсальная обёртка fetch, обрабатывающая 401:
     * - добавляет базовый API URL к относительным путям
     * - по умолчанию ставит credentials: 'include' и Content-Type: application/json
     * - при 401 пытается вызвать refreshAccessToken() и повторить запрос один раз
     * - при неудаче вызывает logout() и выбрасывает ошибку с полезным сообщением
     */
    const authFetch = useCallback(
        async (path, options = {}, retry = true) => {
            const defaultHeaders = { "Content-Type": "application/json" };
            const opts = {
                credentials: "include",
                ...options,
                headers: {
                    ...defaultHeaders,
                    ...(options.headers || {}),
                },
            };

            const res = await csrfFetch(path, opts);

            // если 401 — пробуем обновить токен и повторить запрос один раз
            if (res.status === 401 && retry) {
                try {
                    const refreshed = await refreshAccessToken();
                    if (refreshed) {
                        return await authFetch(path, options, false);
                    } else {
                        // refresh не сработал — разлогиниваемся и кидаем ошибку
                        try { await logout(); } catch { /* ignore */ }
                        const data = await safeJson(res);
                        throw buildError(res, data);
                    }
                } catch (e) {
                    try { await logout(); } catch { /* ignore */ }
                    throw e;
                }
            }

            if (!res.ok) {
                const data = await safeJson(res);
                throw buildError(res, data);
            }

            if (res.status === 204) return null;

            try {
                return await res.json();
            } catch {
                return null;
            }
        },
        [refreshAccessToken, logout]
    );

    useEffect(() => {
        (async () => {
            try {
                await ensureCsrfToken();
                if (hasAuthState()) {
                    await fetchUser();
                }
            } catch { /* empty */ }
        })();
    }, [fetchUser]);

    useEffect(() => {
        if (!user) {
            if (refreshInterval.current) clearInterval(refreshInterval.current);
            return undefined;
        }

        refreshInterval.current = setInterval(async () => {
            try {
                const ok = await refreshAccessToken();
                if (!ok) await logout();
            } catch {
                await logout();
            }
        }, 14 * 60 * 1000);

        return () => {
            if (refreshInterval.current) clearInterval(refreshInterval.current);
        };
    }, [user, refreshAccessToken, logout]);

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                loading,
                error,
                register,
                login,
                logout,
                updateProfile,
                changePassword,
                fetchUser,
                refreshAccessToken,
                authFetch,
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
