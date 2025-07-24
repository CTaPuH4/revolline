import { useState } from 'react';

import '../css/Footer.css';
import telegramIcon from '../assets/icons/telegram-icon.png';
import whatsappIcon from '../assets/icons/whatsapp-icon.png';

const Footer = () => {
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const copyPhone = () => {
  navigator.clipboard.writeText('8 (495) 156-39-11');
  setCopiedPhone(true);
  setTimeout(() => setCopiedPhone(false), 2000);
  };
  const copyEmail = () => {
    navigator.clipboard.writeText('mail@revonline.ru');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
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
      <div className="click-wrapper" onClick={copyPhone}>
        <p className="foot-text-click">8 (495) 156-39-11</p>
        {copiedPhone && <p className="tooltip">Скопировано</p>}
      </div>
      <br/>
      <div className="click-wrapper" onClick={copyEmail}>
        <p className="foot-text-click">mail@revonline.ru</p>
        {copiedEmail && <p className="tooltip">Скопировано</p>}
      </div>
      <p className='foot-text-bottom'>Москва, Садовническая улица 69</p>
    </div>
    <div>
      <p className='foot-headers'>График работы</p>
      <p className='foot-text'>Пн-Пт 9:00–18:00</p>
      <p className='foot-text-bottom'>Сб-Вс выходной день</p>
    </div>
  </footer>
  );
};

export default Footer;