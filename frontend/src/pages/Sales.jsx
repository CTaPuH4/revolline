import { Link } from 'react-router-dom';

export default function Home() {

  return (
    <>
        <h1>Добро пожаловать в наш магазин!</h1>
        <nav className="navigation">
          <Link to="/catalog">Каталог</Link>
          <Link to="/new">Новинки</Link>
          <Link to="/promotions">Акции</Link>
          <Link to="/cart">Корзина</Link>
        </nav>
      
    </>
  );
};