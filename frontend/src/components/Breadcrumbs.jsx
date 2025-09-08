import { Link, useLocation } from "react-router-dom";
import '../css/Breadcrumbs.css'
import { useEffect, useState } from "react";

export default function Breadcrumbs({ product }) {
  const { pathname } = useLocation();
  const [sections, setSections] = useState([]);

  // Загружаем разделы и категории
  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/sections/")
      .then(res => res.ok ? res.json() : [])
      .then(data => setSections(Array.isArray(data) ? data : []))
      .catch(err => console.error("Ошибка загрузки разделов:", err));
  }, []);

  // Базовые хлебные крошки
  let crumbs = [{ title: "Главная", path: "/" }];

  if (product) {
    // Если есть продукт — ищем его категорию и раздел
    const category = product.categories?.[0]; // берем первую категорию
    if (category) {
      const section = sections.find(sec => sec.categories?.some(cat => cat.slug === category.slug));
      if (section) {
        crumbs.push({ title: section.title, path: `/catalog/${section.slug}` });
      }
      crumbs.push({ 
        title: category.title, 
        path: section ? `/catalog/${section.slug}/${category.slug}` : `/catalog/${category.slug}` 
      });
    }
    // Сам продукт
    crumbs.push({ title: product.title, path: pathname });
  } else {
    // Для страниц каталога, новинок или акций (по URL)
    const pathParts = pathname.split("/").filter(Boolean);
    let basePath = "";
    let baseTitle = "";

    if (pathParts[0] === "catalog") {
      baseTitle = "Каталог";
      basePath = "/catalog";
    } else if (pathParts[0] === "new") {
      baseTitle = "Новинки";
      basePath = "/new";
    } else if (pathParts[0] === "sales") {
      baseTitle = "Акции";
      basePath = "/sales";
    }

    if (baseTitle) crumbs.push({ title: baseTitle, path: basePath });

    // Добавляем раздел и категорию, если они есть в URL
    if (pathParts[1]) {
      const section = sections.find(sec => sec.slug === pathParts[1]);
      if (section) crumbs.push({ title: section.title, path: `${basePath}/${section.slug}` });

      if (pathParts[2] && section) {
        const category = section.categories?.find(cat => cat.slug === pathParts[2]);
        if (category) crumbs.push({ title: category.title, path: `${basePath}/${section.slug}/${category.slug}` });
      }
    }
  }

  return (
    <nav className="breadcrumbs">
      {crumbs.map((c, idx) => (
        <span key={c.path}>
          {idx > 0 && <span> — </span>}
          {idx < crumbs.length - 1 ? (
            <Link to={c.path}>{c.title}</Link>
          ) : (
            <span className="current">{c.title}</span>
          )}
        </span>
      ))}
    </nav>
  );
}

