import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, forwardRef } from "react";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../modals/Auth/AuthModal";
import RegisterModal from "../modals/Register/RegisterModal";
import "../css/Header.css";

import logo from "../assets/logo.png";
import searchIcon from "../assets/icons/search-icon.svg";
import closeIcon from "../assets/icons/close-icon.svg";
import heartIcon from "../assets/icons/favorites-icon.svg";
import cartIcon from "../assets/icons/cart-icon.svg";

import UserMenu from "./UserMenu";
import CatalogDropdown from "./catalog/CatalogDropdown";

const Header = forwardRef((props, ref) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [showDropdown, setShowDropdown] = useState(false);
    const timeoutRef = useRef(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);

    const [showAuth, setShowAuth] = useState(false);
    const [showRegister, setShowRegister] = useState(false);

    const handleMouseEnter = () => {
        clearTimeout(timeoutRef.current);
        setShowDropdown(true);
    };
    const handleMouseLeave = () => {
        timeoutRef.current = setTimeout(() => setShowDropdown(false), 70);
    };

    const doSearch = () => {
        if (searchQuery.trim()) {
            navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
            setSearchOpen(false);
        }
    };

    const onKeyPress = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            doSearch();
        }
    };

    return (
        <>
            <header ref={ref} className="header">
                {/* Логотип */}
                <Link to="/" className="logo">
                    <img src={logo} alt="ReVolline cosmetics logo" />
                </Link>

                {/* Навигация */}
                <nav className={!searchOpen ? "nav" : "nav nav--hidden"}>
                    <div
                        className="catalog-wrapper"
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        <Link to="/catalog" className="nav-link">
                            Каталог
                        </Link>
                        {showDropdown && <CatalogDropdown/>}
                    </div>
                    <Link to="/new" className="nav-link">
                        Новинки
                    </Link>
                    <Link to="/sales" className="nav-link">
                        Акции
                    </Link>
                    <Link to="/about" className="nav-link">
                        О компании
                    </Link>
                    <Link to="/partners" className="nav-link">
                        Партнерам
                    </Link>
                </nav>

                {/* Поисковый блок */}
                <div className="search-wrapper">
                    {/* эта кнопка всегда видна и открывает/закрывает поиск */}
                    <button
                        className="search-toggle"
                        onClick={() => setSearchOpen((o) => !o)}
                        aria-label={searchOpen ? "Закрыть поиск" : "Открыть поиск"}
                    >
                        <img src={searchOpen ? closeIcon : searchIcon} alt="" />
                    </button>

                    {/* само поле с анимацией */}
                    <div className={`search-container ${searchOpen ? "open" : "closed"}`}>
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Поиск"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyPress={onKeyPress}
                            autoFocus={searchOpen}
                        />
                        <button
                            className="search-button"
                            onClick={doSearch}
                            aria-label="Найти"
                        >
                            <img src={searchIcon} alt="" />
                        </button>
                    </div>
                </div>

                {/* Иконки или кнопка «Войти» */}
                <div className="icons">
                    {user ? (
                        <>
                            <Link
                                to="/favorites"
                                className="icon-button"
                                data-tooltip="Избранное"
                            >
                                <img src={heartIcon} alt="Избранное" />
                            </Link>
                            <Link to="/cart" className="icon-button" data-tooltip="Корзина">
                                <img src={cartIcon} alt="Корзина" />
                            </Link>
                            <UserMenu />
                        </>
                    ) : (
                        <button className="login-button" onClick={() => setShowAuth(true)}>
                            Войти
                        </button>
                    )}
                </div>
            </header>

            {/* Модалки */}
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
        </>
    );
});

export default Header;
