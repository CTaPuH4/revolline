// src/modals/Auth/AuthModal.js
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import '../../css/modals/AuthRegisterModal.css';
import SalesPolicy from "../SalesPolicy";
import ResetPasswordModal from "../ResetPassword/ResetPasswordModal"; // <-- импорт восстановл. пароля

const AuthModal = ({ onClose, onRegisterClick }) => {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const { login } = useAuth();

    const [showSalesPolicy, setShowSalesPolicy] = useState(false);
    const [showReset, setShowReset] = useState(false); // состояние для открытия ResetPasswordModal

    const openSalesPolicy = () => setShowSalesPolicy(true);
    const closeSalesPolicy = () => setShowSalesPolicy(false);

    const openPrivacyPolicy = () => {
        window.open("/privacy-policy", "_blank");
    };

    const handleLogin = async () => {
        try {
            await login(email, password);
            onClose && onClose();
        } catch (error) {
            alert(error.message || "Ошибка при входе");
        }
    };

    // если открыта модалка восстановления — рендерим её вместо формы входа
    if (showReset) {
        return (
            <ResetPasswordModal
                onClose={() => setShowReset(false)}
                onShowLogin={() => setShowReset(false)} // вернуться к форме входа
            />
        );
    }

    return (
        <div className="auth-overlay">
            <div className="auth-modal">
                <button className="auth-close" onClick={onClose}>
                    &times;
                </button>

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

                <button className="auth-button" onClick={handleLogin}>
                    Войти
                </button>

                <div className="auth-links">
                    {/* теперь открываем ResetPasswordModal */}
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
