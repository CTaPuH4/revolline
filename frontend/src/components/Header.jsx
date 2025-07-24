import { Link } from 'react-router-dom';
import '../css/Header.css'
import logo from '../assets/logo.png';
import searchIcon from '../assets/icons/search-icon.svg';
import userIcon from '../assets/icons/profile-icon.svg';
import heartIcon from '../assets/icons/favorites-icon.svg';
import cartIcon from '../assets/icons/cart-icon.svg';

const Header = () => (
  <header className="header">
    <Link to="/" className="logo">
      <img src={logo} alt="ReVolline cosmetics logo" />
    </Link>
    <nav className="nav">
      <a href="/catalog">Каталог</a>
      <a href="/new">Новинки</a>
      <a href="/sales">Акции</a>
      <a href="/about">О компании</a>
      <a href="/partners">Партнерам</a>
    </nav>
    <div className="icons">
      <Link to="/catalog?search=1" className="icon-button" data-tooltip="Поиск">
        <img src={searchIcon} alt="" />
      </Link>
      <Link to="/profile" className="icon-button" data-tooltip="Профиль">
        <img src={userIcon} alt="" />
      </Link>
      <Link to="/favorites" className="icon-button" data-tooltip="Избранное">
        <img src={heartIcon} alt="" />
      </Link>
      <Link to="/cart" className="icon-button" data-tooltip="Корзина">
        <img src={cartIcon} alt="" />
      </Link>
    </div>
  </header>
);

export default Header;