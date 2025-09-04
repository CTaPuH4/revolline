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
      // Приводим телефон к формату "+7" + digits after leading 7/8 (если есть)
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
        // если номер начинается не с 7/8 — просто возьмём все цифры
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
    if (name === "phone") {
      // телефон обрабатывается специальным обработчиком
      return;
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Специальная логика для телефона:
  const handlePhoneChange = (e) => {
    const raw = e.target.value || "";
    // Удаляем всё, кроме цифр из введённого
    const digits = raw.replace(/\D/g, "");

    let rest = digits;
    // Если пользователь вставил или ввёл полный номер с ведущей 7/8, убираем её — мы добавим +7 сами
    if (digits.startsWith("8") || digits.startsWith("7")) {
      rest = digits.slice(1);
    }

    // Собираем окончательное значение
    const newVal = PREFIX + rest;
    setFormData((prev) => ({ ...prev, phone: newVal }));
  };

  // Запрет на удаление префикса +7 (Backspace/Delete), если курсор в префиксе
  const handlePhoneKeyDown = (e) => {
    const selStart = e.target.selectionStart ?? 0;
    const selEnd = e.target.selectionEnd ?? 0;

    // Если пытаются удалить символы в префиксе — блокируем
    if (
        (e.key === "Backspace" && selStart <= PREFIX.length) ||
        (e.key === "Delete" && selStart < PREFIX.length)
    ) {
      // Разрешаем, если выделен диапазон, закрывающий часть вне префикса
      if (selEnd > PREFIX.length) {
        // allow (user is deleting a selection that includes beyond prefix)
      } else {
        e.preventDefault();
      }
    }
  };

  // При фокусе/клике не даём поставить курсор в префикс
  const ensureCaretAfterPrefix = () => {
    requestAnimationFrame(() => {
      const input = phoneInputRef.current;
      if (!input) return;
      const start = input.selectionStart ?? 0;
      if (start < PREFIX.length) {
        input.setSelectionRange(PREFIX.length, PREFIX.length);
      }
    });
  };

  // Очистка вставки: оставляем только цифры, затем формируем +7...
  const handlePhonePaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text") || "";
    const digits = pasted.replace(/\D/g, "");
    let rest = digits;
    if (digits.startsWith("8") || digits.startsWith("7")) rest = digits.slice(1);
    const newVal = PREFIX + rest;
    setFormData((prev) => ({ ...prev, phone: newVal }));

    // поставить каретку в конец
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
      // Передаём и имя, и фамилию, и телефон (phone уже в формате "+7...")
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
