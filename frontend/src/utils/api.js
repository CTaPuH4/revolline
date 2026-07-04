const API_BASE = import.meta.env.VITE_API_BASE || "/api";
const CSRF_COOKIE_NAME = "csrftoken";
const AUTH_STATE_COOKIE_NAME = "auth_state";
const CSRF_HEADER_NAME = "X-CSRFToken";
const UNSAFE_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let csrfToken = null;
let csrfRequest = null;

export const apiUrl = (path = "") => {
    const rawPath = String(path);
    if (rawPath.startsWith("http")) return rawPath;

    const base = String(API_BASE).replace(/\/+$/, "");
    const normalizedPath = rawPath.replace(/^\/+/, "");
    const normalizedBase = base.replace(/^\/+/, "");

    if (
        !base.startsWith("http")
        && (normalizedPath === normalizedBase || normalizedPath.startsWith(`${normalizedBase}/`))
    ) {
        return `/${normalizedPath}`;
    }

    return `${base}/${normalizedPath}`;
};

export const getCookie = (name) => {
    if (typeof document === "undefined") return null;
    const prefix = `${name}=`;
    return document.cookie
        .split(";")
        .map((value) => value.trim())
        .find((value) => value.startsWith(prefix))
        ?.slice(prefix.length) || null;
};

export const getCsrfToken = () => csrfToken || getCookie(CSRF_COOKIE_NAME);
export const hasAuthState = () => getCookie(AUTH_STATE_COOKIE_NAME) === "1";

export const clearAuthState = () => {
    if (typeof document === "undefined") return;
    document.cookie = `${AUTH_STATE_COOKIE_NAME}=; Max-Age=0; path=/; SameSite=Lax`;
};

export const ensureCsrfToken = async () => {
    const existing = getCsrfToken();
    if (existing) return existing;

    if (!csrfRequest) {
        csrfRequest = fetch(apiUrl("/csrf/"), {
            method: "GET",
            credentials: "include",
            headers: { Accept: "application/json" },
        })
            .then(async (res) => {
                if (!res.ok) return null;
                try {
                    const data = await res.json();
                    csrfToken = data?.csrfToken || getCookie(CSRF_COOKIE_NAME);
                    return csrfToken;
                } catch {
                    csrfToken = getCookie(CSRF_COOKIE_NAME);
                    return csrfToken;
                }
            })
            .finally(() => {
                csrfRequest = null;
            });
    }

    return csrfRequest;
};

export const csrfFetch = async (path, options = {}) => {
    const method = String(options.method || "GET").toUpperCase();
    const headers = { ...(options.headers || {}) };

    if (UNSAFE_METHODS.has(method)) {
        const token = await ensureCsrfToken();
        if (token) headers[CSRF_HEADER_NAME] = token;
    }

    return fetch(apiUrl(path), {
        credentials: "include",
        ...options,
        method,
        headers,
    });
};
