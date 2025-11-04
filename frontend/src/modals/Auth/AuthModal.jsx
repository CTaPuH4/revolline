// src/modals/Auth/AuthModal.js
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import '../../css/modals/AuthRegisterModal.css';
import SalesPolicy from "../SalesPolicy";
import ResetPasswordModal from "../ResetPassword/ResetPasswordModal";

const AuthModal = ({ onClose, onRegisterClick }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { login } = useAuth();

    const [showSalesPolicy, setShowSalesPolicy] = useState(false);
    const [showReset, setShowReset] = useState(false);

    const [errorMessage, setErrorMessage] = useState("");

    const openSalesPolicy = () => setShowSalesPolicy(true);
    const closeSalesPolicy = () => setShowSalesPolicy(false);

    const openPrivacyPolicy = () => {
        window.open("/privacy-policy", "_blank");
    };

    const handleLogin = async () => {
        setErrorMessage("");

        try {
            const resp = await login(email, password);

            // Если login вернул объект с ошибкой
            // Попробуем извлечь текст ошибки из нескольких возможных мест
            const respDetail =
                resp?.data?.detail ||
                resp?.detail ||
                (typeof resp === "string" ? resp : null);

            if (respDetail) {
                setErrorMessage(respDetail);
                return;
            }

            // Если вернулся статус и он не 200 — выводим detail или общую ошибку
            if (resp && typeof resp === "object" && "status" in resp && resp.status !== 200) {
                setErrorMessage(resp.data?.detail || "Ошибка входа");
                return;
            }

            // Если ничего из вышеперечисленного — считаем, что вход успешен
            onClose && onClose();
        } catch (err) {
            // Ошибка из axios/fetch — обычно err.response.data.detail
            const catchDetail =
                err?.response?.data?.detail ||
                // иногда backend возвращает ошибку в err.response.data целиком
                (typeof err?.response?.data === "string" ? err.response.data : null) ||
                err?.message ||
                "Ошибка при входе";

            setErrorMessage(typeof catchDetail === "string" ? catchDetail : JSON.stringify(catchDetail));
        }
    };

    if (showReset) {
        return (
            <ResetPasswordModal
                onClose={() => setShowReset(false)}
                onShowLogin={() => setShowReset(false)}
            />
        );
    }

    return (
        <div className="auth-overlay" onClick={onClose}>
            <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
                <button className="auth-close" onClick={onClose}>&times;</button>

                <h2 className="auth-title">Войти</h2>

                <div className="auth-field">
                    <div className="auth-input-wrapper">
                        <span className="auth-placeholder">Ваша почта:</span>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                        />
                    </div>
                </div>

                <div className="auth-field">
                    <div className="auth-input-wrapper">
                        <span className="auth-placeholder">Ваш пароль:</span>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                        />
                    </div>
                </div>

                {errorMessage && (
                    <p className="auth-error">{errorMessage}</p>
                )}

                <button className="auth-button" onClick={handleLogin}>Войти</button>

                <div className="auth-links">
          <span className="auth-link" onClick={() => setShowReset(true)} style={{ cursor: "pointer" }}>
            Я забыл пароль
          </span>
                    <span className="auth-link" onClick={onRegisterClick} style={{ cursor: "pointer" }}>
            Зарегистрироваться
          </span>
                </div>

                <p className="auth-disclaimer">
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
};

export default AuthModal;
