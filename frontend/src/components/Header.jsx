import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect, forwardRef } from "react";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../modals/Auth/AuthModal";
import RegisterModal from "../modals/Register/RegisterModal";
import "../css/Header.css";
import logo from "../assets/logo.png";
import searchIcon from "../assets/icons/search-icon.svg";
import heartIcon from "../assets/icons/favorites-icon.svg";
import cartIcon from "../assets/icons/cart-icon.svg";
import UserMenu from "./UserMenu";
import CatalogDropdown from "./catalog/CatalogDropdown";

const API_BASE = "http://127.0.0.1:8000/api";

const Header = forwardRef((props, ref) => {
    const { user } = useAuth();
    const navigate = useNavigate();

    const [showDropdown, setShowDropdown] = useState(false);
    const timeoutRef = useRef(null);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchOpen, setSearchOpen] = useState(false);

    const [showAuth, setShowAuth] = useState(false);
    const [showRegister, setShowRegister] = useState(false);

    // --- Новое: подсказки и загрузка ---
    const [suggestions, setSuggestions] = useState([]);
    const [loadingSuggestions, setLoadingSuggestions] = useState(false);
    const debounceRef = useRef(null);

    const handleMouseEnter = () => {
        if (window.innerWidth > 768) {  // только для десктопа
            clearTimeout(timeoutRef.current);
            setShowDropdown(true);
        }
    };

    const handleMouseLeave = () => {
        if (window.innerWidth > 768) {  // только для десктопа
            timeoutRef.current = setTimeout(() => setShowDropdown(false), 70);
        }
    };

    const doSearch = () => {
        if (searchQuery.trim()) {
            navigate(`/catalog?search=${encodeURIComponent(searchQuery.trim())}`);
            setSearchOpen(false);
            setSuggestions([]);
        }
    };

    const onKeyPress = (e) => {
        if (e.key === "Enter") {
            e.preventDefault();
            doSearch();
        }
    };

    // --- Новое: запрос подсказок с debounce ---
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSuggestions([]);
            return;
        }

        if (debounceRef.current) {
            clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(async () => {
            try {
                setLoadingSuggestions(true);
                const res = await fetch(`${API_BASE}/products/?search=${encodeURIComponent(searchQuery)}&page_size=5`);
                const data = await res.json();
                setSuggestions(data.results || data); // зависит от API
            } catch (err) {
                console.error("Ошибка загрузки подсказок", err);
            } finally {
                setLoadingSuggestions(false);
            }
        }, 1000);
    }, [searchQuery]);

    return (
        <>
            <header ref={ref} className="header">
                <div className="header-content">
                    <Link to="/" className="logo">
                        <img src={logo} alt="ReVolline cosmetics logo"/>
                    </Link>

                    <nav className={!searchOpen ? "nav" : "nav nav--hidden"}>
                        <div
                            className="catalog-wrapper"
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                        >
                            <Link to="/catalog" className="nav-link">Каталог</Link>
                            {showDropdown && <CatalogDropdown/>}
                        </div>
                        <Link to="/new" className="nav-link">Новинки</Link>
                        <Link to="/sales" className="nav-link">Акции</Link>
                        <Link to="/about" className="nav-link">О компании</Link>
                        <Link to="/partners" className="nav-link">Партнерам</Link>
                    </nav>

                    {/* Поиск */}
                    <div className={`search-wrapper ${searchOpen ? "open" : "closed"}`}>
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
                            <button className="search-button" onClick={doSearch}>
                                <img src={searchIcon} alt="Найти"/>
                            </button>
                        </div>

                        {/* Подсказки */}
                        {searchOpen && searchQuery.trim() !== "" && (
                            <ul className="search-suggestions">
                                {loadingSuggestions && <li>Загрузка...</li>}

                                {!loadingSuggestions && suggestions.length === 0 ? (
                                    <li>Совпадения не найдены</li>
                                ) : (
                                    suggestions.map((p) => (
                                        <li key={p.id} onClick={() => navigate(`/product/${p.id}`)}>
                                            {p.title}
                                        </li>
                                    ))
                                )}
                            </ul>
                        )}

                        <button
                            className="search-close-button"
                            onClick={() => setSearchOpen(false)}
                        >
                            <svg
                                width="18"
                                height="18"
                                viewBox="0 0 16 16"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <line x1="1" y1="1" x2="15" y2="15" stroke="#181818ff" strokeWidth="2" strokeLinecap="round"/>
                                <line x1="15" y1="1" x2="1" y2="15" stroke="#181818ff" strokeWidth="2" strokeLinecap="round"/>
                            </svg>

                        </button>
                    </div>

                    {/* Иконки */}
                    <div className="icons">
                        {!searchOpen && (
                            <button
                                className="search-toggle  icon-button"
                                onClick={() => setSearchOpen(true)}
                                aria-label="Открыть поиск"
                                data-tooltip="Поиск"
                            >
                                <img src={searchIcon} alt="Открыть поиск"/>
                            </button>
                        )}
                        {user ? (
                            <>
                                <Link to="/favorites" className="icon-button" data-tooltip="Избранное">
                                    <img src={heartIcon} alt="Избранное"/>
                                </Link>
                                <Link to="/cart" className="icon-button" data-tooltip="Корзина">
                                    <img src={cartIcon} alt="Корзина"/>
                                </Link>
                                <UserMenu/>
                            </>
                        ) : (
                            <button className="login-button" onClick={() => setShowAuth(true)}>
                                Войти
                            </button>
                        )}
                    </div>
                </div>
            </header>

            {/* Модалки */}
            {showAuth && <AuthModal onClose={() => setShowAuth(false)} onRegisterClick={() => {
                setShowAuth(false);
                setShowRegister(true);
            }}/>}
            {showRegister && <RegisterModal onClose={() => setShowRegister(false)} onBack={() => {
                setShowRegister(false);
                setShowAuth(true);
            }}/>}
        </>
    );
});

export default Header;
