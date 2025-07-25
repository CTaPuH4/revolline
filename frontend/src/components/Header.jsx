import { Link } from 'react-router-dom';
import { useState, useRef, forwardRef } from "react";
import '../css/Header.css'
import logo from '../assets/logo.png';
import searchIcon from '../assets/icons/search-icon.svg';
import userIcon from '../assets/icons/profile-icon.svg';
import heartIcon from '../assets/icons/favorites-icon.svg';
import cartIcon from '../assets/icons/cart-icon.svg';

import CatalogDropdown from './catalog/CatalogDropdown';

const Header = forwardRef((props, ref) => {
  const [showDropdown, setShowDropdown] = useState(true);
  const timeoutRef = useRef(null);

  const handleMouseEnter = () => {
    clearTimeout(timeoutRef.current);
    setShowDropdown(true);
  };

  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => setShowDropdown(false), 150);
  };

  return (
  <header ref={ref} className="header">
    <Link to="/" className="logo">
      <img src={logo} alt="ReVolline cosmetics logo" />
    </Link>
    <nav className="nav">
      <div
        className="catalog-wrapper"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Link to="/catalog" className='nav-link'><span>Каталог</span></Link>
        {showDropdown && <CatalogDropdown />}
      </div>
      <Link to="/new" className='nav-link'><span>Новинки</span></Link>
      <Link to="/sales" className='nav-link'><span>Акции</span></Link>
      <Link to="/about" className='nav-link'><span>О компании</span></Link>
      <Link to="/partners" className='nav-link'><span>Партнерам</span></Link>
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
});

export default Header;