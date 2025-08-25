import React, {
    createContext,
    useContext,
    useState,
    useEffect,
    useCallback,
    useRef,
} from "react";

const AuthContext = createContext();

const API_BASE = "http://127.0.0.1:8000/api";

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const u = localStorage.getItem("user");
            return u ? JSON.parse(u) : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const isRefreshing = useRef(false);
    const refreshInterval = useRef(null);

    const handleError = (e) => {
        // Универсальный лог и запись в state.error — пытаемся извлечь
        // полезное сообщение из тела ответа (e.response / e.data), если оно есть.
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
            // собрать все строковые значения из объекта/массива
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

    // buildError формирует читаемое сообщение из response body (валидаторные ошибки и т.д.)
    const buildError = (res, data) => {
        const payload = data ?? null;
        let msg = `Status ${res?.status ?? "unknown"}`;
        if (payload) {
            if (typeof payload === "string") {
                msg = payload;
            } else if (payload.detail) {
                msg = Array.isArray(payload.detail) ? payload.detail.join(" ") : String(payload.detail);
            } else {
                // собираем все строковые значения из объекта/массивов
                const vals = [];
                const collect = (v) => {
                    if (Array.isArray(v)) return v.forEach(collect);
                    if (v && typeof v === "object") return Object.values(v).forEach(collect);
                    if (v != null) vals.push(String(v));
                };
                collect(payload);
                if (vals.length) msg = vals.join(" ");
            }
        }
        const err = new Error(msg);
        err.response = payload;
        err.status = res?.status;
        return err;
    };

    const getAccessFromStorage = () => localStorage.getItem("accessToken");

    const getAuthHeaders = (extra = {}) => {
        const headers = { Accept: "application/json", ...extra };
        const access = getAccessFromStorage();
        if (access) headers["Authorization"] = `Bearer ${access}`;
        return headers;
    };

    /**
     * refreshAccessToken — пробует несколько стратегий:
     * 1) Отправить POST /token/refresh/ с credentials: 'include' и пустым телом (cookie-flow).
     * 2) Если сервер отвечает ошибкой про пустой "refresh", пробуем отправить refresh из localStorage
     *    (dev / non-cookie flow). Если сервер вернул refresh/access в теле — сохраняем их локально как fallback.
     */
    const refreshAccessToken = useCallback(async () => {
        if (isRefreshing.current) return false;
        isRefreshing.current = true;
        try {
            // 1) попытка cookie-flow
            let res = await fetch(`${API_BASE}/token/refresh/`, {
                method: "POST",
                credentials: "include",
                headers: getAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({}),
            });

            if (res.ok) {
                const data = await safeJson(res);
                if (data) {
                    if (data.refresh) localStorage.setItem("refreshToken", data.refresh);
                    if (data.access) localStorage.setItem("accessToken", data.access);
                }
                return true;
            }

            // fallback: попробуем использовать refresh из localStorage (dev mode)
            const txt = await res.text().catch(() => null);
            let parsed = null;
            try {
                parsed = txt ? JSON.parse(txt) : null;
            } catch {
                parsed = null;
            }
            console.warn("refresh failed response:", parsed || txt || `Status ${res.status}`);

            const storedRefresh = localStorage.getItem("refreshToken");
            if (storedRefresh) {
                const res2 = await fetch(`${API_BASE}/token/refresh/`, {
                    method: "POST",
                    credentials: "include",
                    headers: getAuthHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ refresh: storedRefresh }),
                });

                if (res2.ok) {
                    const data = await safeJson(res2);
                    if (data) {
                        if (data.refresh) localStorage.setItem("refreshToken", data.refresh);
                        if (data.access) localStorage.setItem("accessToken", data.access);
                    }
                    return true;
                }

                const txt2 = await res2.text().catch(() => null);
                console.warn("refresh fallback failed:", txt2);
                return false;
            }

            return false;
        } catch (e) {
            console.warn("refreshAccessToken error", e);
            return false;
        } finally {
            isRefreshing.current = false;
        }
    }, []);

    /**
     * fetchUser — получает профиль текущего пользователя.
     * При 401 пробуем refresh и повторяем один раз.
     */
    const fetchUser = useCallback(
        async (retry = true) => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE}/users/me/`, {
                    method: "GET",
                    credentials: "include",
                    headers: getAuthHeaders(),
                });

                if (res.status === 401 && retry) {
                    const ok = await refreshAccessToken();
                    if (!ok) {
                        // никак не получилось обновить токен — очищаем локально
                        setUser(null);
                        localStorage.removeItem("user");
                        localStorage.removeItem("accessToken");
                        localStorage.removeItem("refreshToken");
                        throw new Error("Unauthorized");
                    }
                    return await fetchUser(false);
                }

                if (!res.ok) {
                    const data = await safeJson(res);
                    const err = buildError(res, data); throw err;
                }

                const data = await safeJson(res);
                setUser(data);
                localStorage.setItem("user", JSON.stringify(data));
                return data;
            } catch (e) {
                handleError(e);
                setUser(null);
                localStorage.removeItem("user");
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [refreshAccessToken]
    );

    /**
     * login — отправляем credentials. После успешного логина запрашиваем профиль.
     * Если сервер возвращает refresh/access в теле — сохраняем их как fallback (dev).
     */
    const login = useCallback(
        async (email, password) => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE}/login/`, {
                    method: "POST",
                    credentials: "include",
                    headers: getAuthHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({ email, password }),
                });

                if (!res.ok) {
                    const data = await safeJson(res);
                    const err = buildError(res, data); throw err;
                }

                const data = await safeJson(res);
                if (data) {
                    if (data.refresh) localStorage.setItem("refreshToken", data.refresh);
                    if (data.access) localStorage.setItem("accessToken", data.access);
                }

                // Попробуем получить профиль — если cookie не были установлены, fetchUser
                // попытается сделать refresh (и использует fallback из localStorage).
                await fetchUser();
                return true;
            } catch (e) {
                handleError(e);
                throw e;
            } finally {
                setLoading(false);
            }
        },
        [fetchUser]
    );

    /**
     * register — создание пользователя (неавторизованный вызов)
     */
    const register = useCallback(async (email, password, password2) => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_BASE}/users/`, {
                method: "POST",
                headers: getAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ email, password, password2 }),
            });
            if (!res.ok) {
                const data = await safeJson(res);
                const err = new Error(data?.detail || "Ошибка регистрации");
                err.response = data;
                throw err;
            }
            return true;
        } catch (e) {
            handleError(e);
            throw e;
        } finally {
            setLoading(false);
        }
    }, []);

    /**
     * logout — сервер добавит refresh в blacklist и очистит cookie.
     */
    const logout = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            await fetch(`${API_BASE}/logout/`, {
                method: "POST",
                credentials: "include",
                headers: getAuthHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({}),
            });
        } catch (e) {
            console.warn("Logout error", e);
        } finally {
            if (refreshInterval.current) clearInterval(refreshInterval.current);
            setUser(null);
            localStorage.removeItem("user");
            // удаляем dev fallback токены при логауте
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            setLoading(false);
        }
    }, []);

    /**
     * updateProfile — PATCH /users/me/
     * При 401 пробуем refresh и повторяем один раз
     */
    const updateProfile = useCallback(
        async (fields) => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE}/users/me/`, {
                    method: "PATCH",
                    credentials: "include",
                    headers: getAuthHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify(fields),
                });

                if (res.status === 401) {
                    const ok = await refreshAccessToken();
                    if (!ok) throw new Error("Unauthorized");

                    const res2 = await fetch(`${API_BASE}/users/me/`, {
                        method: "PATCH",
                        credentials: "include",
                        headers: getAuthHeaders({ "Content-Type": "application/json" }),
                        body: JSON.stringify(fields),
                    });
                    if (!res2.ok) {
                        const data = await safeJson(res2);
                        const err = buildError(res2, data); throw err;
                    }
                    const updated = await safeJson(res2);
                    setUser(updated);
                    localStorage.setItem("user", JSON.stringify(updated));
                    return updated;
                }

                if (!res.ok) {
                    const data = await safeJson(res);
                    const err = buildError(res, data); throw err;
                }

                const updated = await safeJson(res);
                setUser(updated);
                localStorage.setItem("user", JSON.stringify(updated));
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

    /**
     * changePassword — POST /users/me/change_password/
     */
    const changePassword = useCallback(
        async (oldP, newP, newP2) => {
            setLoading(true);
            setError(null);
            try {
                const res = await fetch(`${API_BASE}/users/me/change_password/`, {
                    method: "POST",
                    credentials: "include",
                    headers: getAuthHeaders({ "Content-Type": "application/json" }),
                    body: JSON.stringify({
                        password: oldP,
                        new_password: newP,
                        new_password2: newP2,
                    }),
                });

                if (res.status === 401) {
                    const ok = await refreshAccessToken();
                    if (!ok) throw new Error("Unauthorized");

                    const res2 = await fetch(`${API_BASE}/users/me/change_password/`, {
                        method: "POST",
                        credentials: "include",
                        headers: getAuthHeaders({ "Content-Type": "application/json" }),
                        body: JSON.stringify({
                            password: oldP,
                            new_password: newP,
                            new_password2: newP2,
                        }),
                    });
                    if (!res2.ok) {
                        const data = await safeJson(res2);
                        const err = buildError(res2, data); throw err;
                    }
                    return true;
                }

                if (!res.ok) {
                    const data = await safeJson(res);
                    const err = buildError(res, data); throw err;
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

    // При старте пытаемся подгрузить профиль (если cookie уже есть — сервер вернёт профиль)
    useEffect(() => {
        (async () => {
            try {
                await fetchUser();
            } catch {
                // ignore
            }
        })();

        // авто-обновление токенов каждые 14 минут (опционально)
        refreshInterval.current = setInterval(async () => {
            try {
                const ok = await refreshAccessToken();
                if (!ok) {
                    await logout();
                }
            } catch (e) {
                await logout();
            }
        }, 14 * 60 * 1000);

        return () => {
            if (refreshInterval.current) clearInterval(refreshInterval.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

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
