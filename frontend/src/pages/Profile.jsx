import { useEffect, useState } from "react";
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
    phone: "",
  });
  const [passwordData, setPasswordData] = useState({
    password: "",
    new_password: "",
    new_password2: "",
  });
  const [message, setMessage] = useState("");

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
      setFormData({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        phone: user.phone || "",
      });
    }
  }, [user]);

  const handleChange = (e) =>
      setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handlePasswordChange = (e) =>
      setPasswordData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  // format backend error to readable string
  const formatError = (err) => {
    if (!err) return "Ошибка";
    // If our AuthContext throws an error with .response (payload) - prefer it
    const payload = err.response ?? err?.data ?? null;

    if (payload) {
      if (typeof payload === "string") return payload;
      if (payload.detail) {
        return Array.isArray(payload.detail)
            ? payload.detail.join(" ")
            : String(payload.detail);
      }
      // collect any nested values (arrays / objects -> strings)
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

    // fallback to message
    if (err.message) return err.message;
    return "Неизвестная ошибка";
  };

  const handleSave = async () => {
    setMessage("");
    try {
      // Передаём и имя, и фамилию, и телефон
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
    } catch (err) {
      setMessage(formatError(err));
    }
  };

  if ((loading && !user) || !user) {
    return <div className="loading-indicator">Загрузка...</div>;
  }

  return (
      <div className="user-profile-container">
        <div className="user-profile-header">
          <h1>Профиль</h1>
          <p>{user.email}</p>
        </div>

        {message && (
            <div
                className={
                  message.toLowerCase().includes("успешно")
                      ? "success-message"
                      : "error-message"
                }
            >
              {message}
            </div>
        )}

        {/* keep context error (if any) but prefer message */}
        {!message && error && <div className="error-message">{error}</div>}

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
            <label>Телефон</label>
            <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
            />
          </div>
        </div>

        <button className="save-button" onClick={handleSave}>
          Сохранить
        </button>

        <div className="change-password-section">
          <h2 className="change-password-title">Смена пароля</h2>

          <div className="password-group">
            <input
                type="password"
                name="password"
                placeholder="Старый пароль"
                value={passwordData.password}
                onChange={handlePasswordChange}
            />
            <input
                type="password"
                name="new_password"
                placeholder="Новый пароль"
                value={passwordData.new_password}
                onChange={handlePasswordChange}
            />
            <input
                type="password"
                name="new_password2"
                placeholder="Повторите новый пароль"
                value={passwordData.new_password2}
                onChange={handlePasswordChange}
            />
          </div>

          <button
              className="change-password-button"
              onClick={handleChangePassword}
          >
            Изменить пароль
          </button>
        </div>
      </div>
  );
}
