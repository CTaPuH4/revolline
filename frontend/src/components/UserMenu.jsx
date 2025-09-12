import { useState, useEffect, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import AuthModal from "../modals/Auth/AuthModal";
import RegisterModal from "../modals/Register/RegisterModal";
import userIcon from "../assets/icons/profile-icon.svg";
import { useAuth } from "../context/AuthContext";
import "../css/UserMenu.css";

const UserMenu = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const navigate = useNavigate();

  const { user, logout, isAuthenticated } = useAuth();

  // автозакрытие при логауте
  useEffect(() => {
    if (!isAuthenticated) setShowDropdown(false);
  }, [isAuthenticated]);

  // клик вне — закрываем
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
          showDropdown &&
          !e.target.closest(".user-menu-container")
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
        document.removeEventListener("mousedown", handleClickOutside);
  }, [showDropdown]);

  const handleIconClick = useCallback(() => {
    if (!isAuthenticated) {
      setShowAuth(true);
    } else {
      setShowDropdown((p) => !p);
    }
  }, [isAuthenticated]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
      navigate("");
    } catch (e) {
      console.error("Ошибка при выходе:", e);
    }
  }, [logout, navigate]);

  // После логина/регистрации — скрываем модалки
  useEffect(() => {
    if (isAuthenticated) {
      setShowAuth(false);
      setShowRegister(false);
    }
  }, [isAuthenticated]);

  return (
      <div
          className="user-menu-container"
          aria-haspopup="true"
          aria-expanded={showDropdown}
      >
        <button
            className="icon-button"
            data-tooltip="Профиль"
            onClick={handleIconClick}
            aria-label={
              isAuthenticated ? "Открыть меню профиля" : "Войти в систему"
            }
        >
          <img
              src={userIcon}
              alt={isAuthenticated ? user?.email : "Войти"}
          />
        </button>

        {showDropdown && isAuthenticated && user && (
            <div className="user-dropdown" role="menu">
              <p className="user-email">{user.email}</p>
              <button
                  className="dropdown-link"
                  onClick={() => navigate("/orders")}
              >
                Мои заказы
              </button>
              <button
                  className="dropdown-link"
                  onClick={() => navigate("/profile")}
              >
                Настройки
              </button>
              <button
                  className="logout-btn"
                  onClick={handleLogout}
              >
                Выйти
              </button>
            </div>
        )}

        {showAuth && (
            <AuthModal
                onClose={() => setShowAuth(false)}
                onRegisterClick={() => {
                  setShowAuth(false);
                  setShowRegister(true);
                }}
            />
        )}

        {showRegister && (
            <RegisterModal
                onClose={() => setShowRegister(false)}
                onBack={() => {
                  setShowRegister(false);
                  setShowAuth(true);
                }}
            />
        )}
      </div>
  );
};

export default UserMenu;

