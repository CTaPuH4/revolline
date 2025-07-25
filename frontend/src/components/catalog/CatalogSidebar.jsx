import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import '../../css/catalog/CatalogSidebar.css';

const categories = [
  {
    name: 'Волосы',
    path: '/catalog/hair',
    subcategories: [
      { name: 'Шампуни', path: '/catalog/hair/shampoo' },
      { name: 'Бальзамы', path: '/catalog/hair/balm' },
    ],
  },
  {
    name: 'Лицо',
    path: '/catalog/face',
    subcategories: [
      { name: 'Очищение', path: '/catalog/face/clean' },
      { name: 'Крема', path: '/catalog/face/cream' },
    ],
  },
  {
    name: 'Тело',
    path: '/catalog/body',
    subcategories: [],
  },
];

export default function SidebarCatalog() {
  const { pathname } = useLocation();
  const [hovered, setHovered] = useState(null);

  return (
    <aside className="sidebar-catalog">
      <ul>
        {categories.map((cat, idx) => (
          <li
            key={cat.path}
            className={`category-item ${pathname === cat.path ? 'active' : ''}`}
            onMouseEnter={() => setHovered(idx)}
            onMouseLeave={() => setHovered(null)}
          >
            <div className="category-link">
              <Link to={cat.path}>{cat.name}</Link>
              {cat.subcategories?.length > 0 && (
                <span className="arrow">▼</span>
              )}
            </div>

            {hovered === idx && cat.subcategories?.length > 0 && (
              <ul className="subcategory-list">
                {cat.subcategories.map((sub) => (
                  <li key={sub.path}>
                    <Link to={sub.path}>{sub.name}</Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
    </aside>
  );
}