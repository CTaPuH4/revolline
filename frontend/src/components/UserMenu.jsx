import { useState } from "react";
import { Link } from "react-router-dom";
import AuthModal from "../modals/Auth/AuthModal";
import RegisterModal from "../modals/Register/RegisterModal";
import userIcon from "../assets/icons/profile-icon.svg";
import '../css/UserMenu.css'

const UserMenu = () => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  const handleMouseEnter = () => {
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    setShowDropdown(false);
  };

  const handleClick = () => {
     setShowAuth(true);
  };

  return (
    <div
      className="user-menu-container"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div
        className="icon-button"
        data-tooltip="Профиль"
        onClick={handleClick}
      >
        <img src={userIcon} alt="User Icon" />
      </div>

      { showDropdown && (
        <div className="user-dropdown">
          <p className="user-email">your_email@gmail.com</p>
          <Link to="/orders">Мои заказы</Link>
          <Link to="/settings">Настройки</Link>
          <button className="logout-btn">
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
          }} />
      )}
    </div>
  );
};

export default UserMenu;