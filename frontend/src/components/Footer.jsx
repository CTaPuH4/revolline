import { useState } from 'react';

import '../css/Footer.css';


const Footer = () => {
  const [copiedEmail, setCopiedEmail] = useState(false);

  const copyEmail = () => {
    navigator.clipboard.writeText('mail@revonline.ru');
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  return (
  <footer className="footer">
    <div className='footer-content'>
      <div>
        <p className='revolline'>ReVolline</p>
        <p className='foot-text'>Политика конфиденциальности</p>
      </div>
      <div>
        <p className='foot-headers'>Контакты</p>
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
    </div>
  </footer>
  );
};

export default Footer;