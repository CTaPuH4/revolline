import { useState } from "react";
import '../../css/modals/AuthRegisterModal.css'

import SalesPolicy from "../SalesPolicy";

const AuthModal = ({ onClose, onRegisterClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = () => {
    onClose();
  };

  const [showSalesPolicy, setShowSalesPolicy] = useState(false);

  const openSalesPolicy = () => setShowSalesPolicy(true);
  const closeSalesPolicy = () => setShowSalesPolicy(false);

  const openPrivacyPolicy = () => {
    window.open('/privacy-policy', '_blank'); // вставь свою ссылку
  };

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
          <span className="auth-link">Я забыл пароль</span>
          <span className="auth-link" onClick={onRegisterClick}>Зарегистрироваться</span>
        </div>

        <p className="auth-disclaimer">
            Продолжая, вы соглашаетесь с{' '}
            <span className="auth-link-inline" onClick={openSalesPolicy}>
                правилами продажи
            </span>{' '}
            и{' '}
            <span className="auth-link-inline" onClick={openPrivacyPolicy}>
                политикой обработки персональных данных
            </span>
        </p>
        {showSalesPolicy && <SalesPolicy onClose={closeSalesPolicy} />}
      </div>
    </div>
  );
};

export default AuthModal;