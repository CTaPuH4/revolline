// src/modals/Register/RegisterModal.js
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import "../../css/modals/AuthRegisterModal.css";

export default function RegisterModal({ onClose, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [success, setSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage("");

    if (password !== repeatPassword) {
      setErrorMessage("Пароли не совпадают");
      return;
    }

    try {
      await register(email, password, repeatPassword);
      setSuccess(true);
    } catch (err) {
      if (err && err.response && typeof err.response === "object") {
        const errors = err.response;
        const messages = Object.values(errors).flatMap((msgs) =>
            Array.isArray(msgs) ? msgs : [msgs]
        );
        setErrorMessage(messages.join("\n"));
      } else {
        setErrorMessage(err.message || "Ошибка регистрации");
      }
    }
  };


  return (
      <div className="auth-overlay" onClick={onClose}>
        <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
          {success ? (
              <>
                <button className="auth-close" onClick={onClose}>
                  ×
                </button>
                <h2 className="auth-title">Регистрация успешна</h2>
                <p className="auth-success-message">
                  Теперь вы можете войти в систему.
                </p>
                <button className="auth-button" onClick={onClose}>
                  OK
                </button>
              </>
          ) : (
              <>
                <button className="auth-back" onClick={onBack}>
                  ←
                </button>
                <button className="auth-close" onClick={onClose}>
                  ×
                </button>
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

                  {errorMessage &&
                      errorMessage.split("\n").map((msg, idx) => (
                          <p key={idx} className="auth-error">{msg}</p>
                      ))}


                  <button type="submit" className="auth-button">
                    Зарегистрироваться
                  </button>
                </form>

                <p className="auth-disclaimer">
                  Продолжая, вы соглашаетесь с{" "}
                  <span className="auth-link-inline">правилами продажи</span> и{" "}
                  <span className="auth-link-inline">
                политикой обработки персональных данных
              </span>
                </p>
              </>
          )}
        </div>
      </div>
  );
}
