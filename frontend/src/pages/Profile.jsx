import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../css/UserProfile.css";

export default function UserProfile() {
  const {
    user,
    isAuthenticated,
    logout,
    updateProfile,
    changePassword,
    loading,
    error,
  } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    patronymic: "",
    phone: "+7",
  });
  const [passwordData, setPasswordData] = useState({
    password: "",
    new_password: "",
    new_password2: "",
  });
  const [message, setMessage] = useState("");

  const phoneInputRef = useRef(null);
  const PREFIX = "+7";

  // Если не авторизованы — редиректим
  useEffect(() => {
    if (!isAuthenticated) {
      logout();
      navigate("/login");
    }
  }, [isAuthenticated, logout, navigate]);

  // Когда подтянулся контекстный user — заполняем поля
  useEffect(() => {
    if (user) {
      const rawPhone = user.phone ?? "";
      const digits = String(rawPhone).replace(/\D/g, "");
      let rest = "";
      if (digits.length === 0) {
        rest = "";
      } else if (digits.startsWith("8")) {
        rest = digits.slice(1);
      } else if (digits.startsWith("7")) {
        rest = digits.slice(1);
      } else {
        rest = digits;
      }

      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        patronymic: user.patronymic || "",
        phone: PREFIX + rest,
      });
    }
  }, [user]);

  // общий обработчик для полей кроме телефона
  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "phone") return;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Телефон
  const handlePhoneChange = (e) => {
    const raw = e.target.value || "";
    const digits = raw.replace(/\D/g, "");
    let rest = digits;
    if (digits.startsWith("8") || digits.startsWith("7")) rest = digits.slice(1);
    const newVal = PREFIX + rest;
    setFormData((prev) => ({ ...prev, phone: newVal }));
  };
  const handlePhoneKeyDown = (e) => {
    const selStart = e.target.selectionStart ?? 0;
    const selEnd = e.target.selectionEnd ?? 0;
    if (
        (e.key === "Backspace" && selStart <= PREFIX.length) ||
        (e.key === "Delete" && selStart < PREFIX.length)
    ) {
      if (selEnd > PREFIX.length) {
        // allow
      } else {
        e.preventDefault();
      }
    }
  };
  const ensureCaretAfterPrefix = () => {
    requestAnimationFrame(() => {
      const input = phoneInputRef.current;
      if (!input) return;
      const start = input.selectionStart ?? 0;
      if (start < PREFIX.length) input.setSelectionRange(PREFIX.length, PREFIX.length);
    });
  };
  const handlePhonePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text") || "";
    const digits = pasted.replace(/\D/g, "");
    let rest = digits;
    if (digits.startsWith("8") || digits.startsWith("7")) rest = digits.slice(1);
    const newVal = PREFIX + rest;
    setFormData((prev) => ({ ...prev, phone: newVal }));
    requestAnimationFrame(() => {
      const input = phoneInputRef.current;
      if (input) {
        const pos = newVal.length;
        input.setSelectionRange(pos, pos);
      }
    });
  };

  const handlePasswordChange = (e) =>
      setPasswordData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const formatError = (err) => {
    if (!err) return "Ошибка";
    const payload = err.response ?? err?.data ?? null;
    if (payload) {
      if (typeof payload === "string") return payload;
      if (payload.detail) return Array.isArray(payload.detail) ? payload.detail.join(" ") : String(payload.detail);
      const collected = [];
      const collect = (v) => {
        if (v == null) return;
        if (Array.isArray(v)) return v.forEach(collect);
        if (typeof v === "object") return Object.values(v).forEach(collect);
        collected.push(String(v));
      };
      collect(payload);
      if (collected.length) return collected.join(" ");
    }
    if (err.message) return err.message;
    return "Неизвестная ошибка";
  };

  const handleSave = async () => {
    setMessage("");
    try {
      await updateProfile(formData);
      setMessage("Данные успешно обновлены.");
    } catch (err) {
      setMessage(formatError(err));
    }
  };

  const handleChangePassword = async () => {
    setMessage("");
    try {
      await changePassword(
          passwordData.password,
          passwordData.new_password,
          passwordData.new_password2
      );
      setPasswordData({ password: "", new_password: "", new_password2: "" });
      setMessage("Пароль успешно изменён.");
      setTimeout(() => {
        logout()
            .then(() => navigate("/"))
            .catch((e) => console.error("Ошибка при выходе:", e));
      }, 2000);
    } catch (err) {
      setMessage(formatError(err));
    }
  };

  if ((loading && !user) || !user) {
    return <div className="loading-indicator">Загрузка...</div>;
  }

  return (
      <div className="user-profile-container">
        <div className="profile-card">
          <div className="user-profile-header">
            <div className="header-left">
              <h1>Профиль</h1>
              <p>{user.email}</p>
            </div>
          </div>

          {message && (
              <div
                  className={
                    message.toLowerCase().includes("успешно") ? "success-message" : "error-message"
                  }
                  role="status"
                  aria-live="polite"
              >
                {message}
              </div>
          )}
          {!message && error && <div className="error-message">{error}</div>}

          <div className="profile-grid">
            {/* left */}
            <div className="left-col">
              <div className="card-inner">
                <div className="info-card">
                  {/* Заголовок внутри info-card: тот же стиль, что и у "Смена пароля" */}
                  <h2 className="change-password-title">Данные пользователя</h2>

                  <div className="user-info-group">
                    <div className="user-info-field">
                      <label>Имя</label>
                      <input
                          type="text"
                          name="first_name"
                          value={formData.first_name}
                          onChange={handleChange}
                      />
                    </div>
                    <div className="user-info-field">
                      <label>Фамилия</label>
                      <input
                          type="text"
                          name="last_name"
                          value={formData.last_name}
                          onChange={handleChange}
                      />
                    </div>
                    <div className="user-info-field">
                      <label>Отчество</label>
                      <input
                          type="text"
                          name="patronymic"
                          value={formData.patronymic}
                          onChange={handleChange}
                      />
                    </div>
                    <div className="user-info-field">
                      <label>Телефон</label>
                      <input
                          ref={phoneInputRef}
                          type="tel"
                          name="phone"
                          value={formData.phone}
                          onChange={handlePhoneChange}
                          onKeyDown={handlePhoneKeyDown}
                          onFocus={ensureCaretAfterPrefix}
                          onClick={ensureCaretAfterPrefix}
                          onPaste={handlePhonePaste}
                      />
                    </div>
                  </div>
                </div>

                <div className="left-actions">
                  <button className="save-button" onClick={handleSave}>
                    Сохранить
                  </button>
                </div>
              </div>
            </div>

            {/* right */}
            <aside className="right-col">
              <div className="card-inner">
                <div className="change-password-section">
                  <h2 className="change-password-title">Смена пароля</h2>

                  <div className="password-group">
                    <label className="field-label">
                      Старый пароль
                      <input
                          type="password"
                          name="password"
                          value={passwordData.password}
                          onChange={handlePasswordChange}
                      />
                    </label>

                    <label className="field-label">
                      Новый пароль
                      <input
                          type="password"
                          name="new_password"
                          value={passwordData.new_password}
                          onChange={handlePasswordChange}
                      />
                    </label>

                    <label className="field-label">
                      Повторите новый пароль
                      <input
                          type="password"
                          name="new_password2"
                          value={passwordData.new_password2}
                          onChange={handlePasswordChange}
                      />
                    </label>
                  </div>
                </div>

                <div className="password-actions">
                  <button className="change-password-button" onClick={handleChangePassword}>
                    Изменить пароль
                  </button>
                </div>
              </div>
            </aside>
          </div>

          <div className="user-actions" aria-hidden={false}>
            <button
                className="logout-button"
                onClick={() =>
                    logout()
                        .then(() => navigate("/"))
                        .catch((e) => console.error("Ошибка при выходе:", e))
                }
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
  );
}
