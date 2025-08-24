// src/components/catalog/CatalogSidebar.jsx
import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import '../../css/catalog/CatalogSidebar.css';

export default function SidebarCatalog() {
  const { pathname } = useLocation();
  const [expanded, setExpanded] = useState(null); // индекс открытoго подменю
  const [sections, setSections] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/sections/")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        return res.json();
      })
      .then((data) => setSections(Array.isArray(data) ? data : []))
      .catch((err) => console.error("Ошибка загрузки разделов:", err));
  }, []);

  const handleToggle = (idx) => {
    setExpanded(prev => (prev === idx ? null : idx));
  };

  return (
    <aside className="sidebar-catalog">
      <ul>
        {Array.isArray(sections) && sections.map((section, idx) => {
          const sectionPath = `/catalog/${section.slug}`;
          const isActive = pathname === sectionPath || pathname.startsWith(`${sectionPath}/`);

          return (
            <li
              key={section.slug}
              className={`category-item ${isActive ? 'active' : ''}`}
            >
              <div className="category-link">
                {/* Название раздела — Link (переход на /catalog/:sectionSlug) */}
                <Link to={sectionPath}>{section.title}</Link>

                {section.categories?.length > 0 && (
                  <div
                    className="arrow-container"
                    onClick={(e) => {
                      e.stopPropagation(); // чтобы клик по стрелке не срабатывал на Link
                      handleToggle(idx);
                    }}
                  >
                    <svg
                      className={`arrow ${expanded === idx ? "rotated" : ""}`}
                      width="20"
                      height="10"
                      viewBox="0 0 10 6"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M1 1L5 5L9 1" stroke="#626161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                )}
              </div>

              <div className="divider"></div>

              {/* подменю: показываем в зависимости от expanded */}
              {section.categories?.length > 0 && (
                <ul className={`subcategory-list ${expanded === idx ? "open" : ""}`}>
                  {section.categories.map((cat) => (
                    <li key={cat.slug}>
                      <Link to={`${sectionPath}/${cat.slug}`}>
                        {cat.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </aside>
  );
}
