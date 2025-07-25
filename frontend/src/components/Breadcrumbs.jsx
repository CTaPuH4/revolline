import { Link, useLocation } from "react-router-dom";
import '../css/Breadcrumbs.css'

const PATH_NAMES = {
  "": "Главная",
  "catalog": "Каталог",
  "new": "Новинки",
  "sales": "Акции",
  "about": "О компании",
  "cart": "Корзина",
  "partners": "Партнёрам",
  "favorites": "Избранное",
  "profile": "Профиль",
  "policy": "Политика конфиденциальности",
};

export default function Breadcrumbs() {
  const location = useLocation();
  const pathnames = location.pathname
    .split("/")
    .filter(Boolean); // разбиваем URL

  const breadcrumbs = pathnames.map((segment, index) => {
    const to = "/" + pathnames.slice(0, index + 1).join("/");
    const isLast = index === pathnames.length - 1;
    const label = PATH_NAMES[segment] || segment;

    return isLast ? (
      <span key={to}>{label}</span>
    ) : (
      <span key={to}>
        <Link to={to}>{label}</Link> &nbsp;—&nbsp;
      </span>
    );
  });

  // Добавим "Главная" в начало
  return (
    <nav className="breadcrumbs">
      <Link to="/">Главная</Link>
      {pathnames.length > 0 && <span> &nbsp;—&nbsp; </span>}
      {breadcrumbs}
    </nav>
  );
}