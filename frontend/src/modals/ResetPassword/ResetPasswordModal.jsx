// src/modals/ResetPassword/ResetPasswordModal.js
import { useState } from "react";
import '../../css/modals/AuthRegisterModal.css';
import SalesPolicy from "../SalesPolicy";

const API_BASE = "http://127.0.0.1:8000";

export default function ResetPasswordModal({ onClose}) {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [status, setStatus] = useState(null); // 'ok' | 'error' | null
    const [message, setMessage] = useState("");
    const [showSalesPolicy, setShowSalesPolicy] = useState(false);

    const openSalesPolicy = () => setShowSalesPolicy(true);
    const closeSalesPolicy = () => setShowSalesPolicy(false);

    const openPrivacyPolicy = () => {
        window.open("/privacy-policy", "_blank");
    };

    const handleSubmit = async () => {
        setStatus(null);
        setMessage("");
        if (!email || !email.includes("@")) {
            setStatus("error");
            setMessage("Введите корректный email");
            return;
        }

        setLoading(true);
        try {
            const res = await fetch(`${API_BASE}/api/reset/request/`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            const data = await res.json().catch(() => null);

            if (!res.ok) {
                const text = data?.message || data?.detail || data || `Ошибка ${res.status}`;
                setStatus("error");
                setMessage(typeof text === "string" ? text : JSON.stringify(text));
            } else {
                setStatus("ok");
                setMessage(data?.message || "Письмо восстановления отправлено. Проверьте почту.");
            }
        } catch (err) {
            console.error("reset request error", err);
            setStatus("error");
            setMessage("Сетевая ошибка. Попробуйте ещё раз.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                <button className="auth-close" onClick={() => onClose && onClose()}>
                    &times;
                </button>
                <h2 className="auth-title">Восстановление пароля</h2>
                <div className="auth-field">
                    <div className="auth-input-wrapper">
                        <span className="auth-placeholder">Укажите ваш email:</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="email@example.com"
                            autoFocus
                        />
                    </div>
                </div>

                <button
                    className="auth-button"
                    onClick={handleSubmit}
                    disabled={loading}
                >
                    {loading ? "Отправка..." : "Отправить письмо"}
                </button>

                {status === "ok" && (
                    <div style={{ marginTop: 12, color: "green", textAlign: "center" }}>{message}</div>
                )}
                {status === "error" && (
                    <div style={{ marginTop: 12, color: "crimson", textAlign: "center" }}>{message}</div>
                )}

                <p className="auth-disclaimer" style={{ marginTop: 16 }}>
                    Продолжая, вы соглашаетесь с{" "}
                    <span className="auth-link-inline" onClick={openSalesPolicy} style={{ cursor: "pointer" }}>
            правилами продажи
          </span>{" "}
                    и{" "}
                    <span className="auth-link-inline" onClick={openPrivacyPolicy} style={{ cursor: "pointer" }}>
            политикой обработки персональных данных
          </span>
                </p>

                {showSalesPolicy && <SalesPolicy onClose={closeSalesPolicy} />}
            </div>
        </div>
    );
}
