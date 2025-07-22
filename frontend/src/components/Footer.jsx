import React from 'react';
import '../css/Footer.css';
import telegramIcon from '../assets/icons/telegram-icon.png';
import whatsappIcon from '../assets/icons/whatsapp-icon.png';

const Footer = () => (
  <footer className="footer">
    <div>
      <p className='revolline'>ReVolline</p>
      <p className='foot-text'>Политика конфиденциальности</p>
      <div className="social-icons">
        <img src={telegramIcon} alt="Telegram" />
        <img src={whatsappIcon} alt="WhatsApp" />
      </div>
    </div>
    <div>
      <p className='foot-headers'>Контакты</p>
      <p className='foot-text'>8 (495) 156-39-11</p>
      <p className='foot-text'>mail@revonline.ru</p>
      <p className='foot-text'>Москва, Садовническая улица 69</p>
    </div>
    <div>
      <p className='foot-headers'>График работы</p>
      <p className='foot-text'>Пн-Пт 9:00–18:00</p>
      <p className='foot-text'>Сб-Вс выходной день</p>
    </div>
  </footer>
);

export default Footer;