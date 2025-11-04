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

            // если login вернул статус != 200
            if (resp && typeof resp === "object" && "status" in resp && resp.status !== 200) {
                setErrorMessage(resp.data?.detail || resp.data?.non_field_errors?.[0] || resp.data?.error || "Пользователь с такими данными не найден");
                return;
            }

            onClose && onClose();
        } catch (err) {
            if (err && err.response) {
                setErrorMessage(err.response.data?.detail || err.response.data?.non_field_errors?.[0] || err.response.data?.error || "Пользователь с такими данными не найден");
                return;
            }

            setErrorMessage(err?.message || "Ошибка при входе");
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

                {errorMessage &&
                    errorMessage.split("\n").map((msg, idx) => (
                        <p key={idx} className="auth-error">{msg}</p>
                    ))
                }

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