import { useState } from "react";
import '../../css/modals/AuthRegisterModal.css'

export default function RegisterModal({ onClose, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== repeatPassword) {
      alert("Пароли не совпадают");
      return;
    }
    console.log("Регистрация:", email, password);
  };

  return (
    <div className="auth-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="auth-back" onClick={onBack}>←</button>
        <button className="auth-close" onClick={onClose}>×</button>
        <h2 className="auth-title">Зарегистрироваться</h2>
        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <div className="auth-input-wrapper">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <span className="auth-placeholder">Ваша почта:</span>
            </div>
          </div>
          <div className="auth-field">
            <div className="auth-input-wrapper">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <span className="auth-placeholder">Ваш пароль:</span>
            </div>
          </div>
          <div className="auth-field">
            <div className="auth-input-wrapper">
              <input
                type="password"
                value={repeatPassword}
                onChange={(e) => setRepeatPassword(e.target.value)}
                required
              />
              <span className="auth-placeholder">Повторите пароль:</span>
            </div>
          </div>
          <button type="submit" className="auth-button">Зарегистрироваться</button>
        </form>
        <p className="auth-disclaimer">
          Продолжая, вы соглашаетесь с{" "}
          <span className="auth-link-inline">правилами продажи</span> и{" "}
          <span className="auth-link-inline">политикой обработки персональных данных</span>
        </p>
      </div>
    </div>
  );
}