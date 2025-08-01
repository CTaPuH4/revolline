import { Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import '../../css/catalog/CatalogSidebar.css';

export default function SidebarCatalog() {
  const { pathname } = useLocation();
  const [hovered, setHovered] = useState(null);
  const [sections, setSections] = useState([]);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/api/sections/")
        .then((res) => res.json())
        .then((data) => setSections(data))
        .catch((err) => console.error("Ошибка загрузки разделов:", err));
  }, []);

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
                    onMouseEnter={() => setHovered(idx)}
                    onMouseLeave={() => setHovered(null)}
                >
                  <div className="category-link">
                    <Link to={sectionPath}>{section.title}</Link>
                    {section.categories?.length > 0 && (
                        <div className="arrow-container">
                          <svg className="arrow" width="10" height="6" viewBox="0 0 10 6" fill="none">
                            <path d="M1 1L5 5L9 1" stroke="#626161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                        </div>
                    )}
                  </div>

                  {/* Тонкая линия под разделом */}
                  <div className="divider"></div>

                  {hovered === idx && section.categories?.length > 0 && (
                      <ul className="subcategory-list">
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