import { Link } from "react-router-dom";
import { useState } from "react";
import "../../css/catalog/CatalogDropdown.css";

const categories = {
  "Волосы": [
    { name: "Шампунь", path: "/catalog/hair/shampoo" },
    { name: "Бальзам", path: "/catalog/hair/balm" },
    { name: "Маски", path: "/catalog/hair/masks" },
  ],
  "Лицо": [
    { name: "Кремы", path: "/catalog/face/creams" },
    { name: "Скрабы", path: "/catalog/face/scrubs" },
    { name: "Маски", path: "/catalog/face/masks" },
  ],
};

export default function CatalogDropdown() {
  const [selectedCategory, setSelectedCategory] = useState(Object.keys(categories)[0]);

  return (
    <div className="dropdown">
      <div className="dropdown-left">
        <ul>
          {Object.keys(categories).map((cat) => (
            <li
              key={cat}
              className={cat === selectedCategory ? "active" : ""}
              onMouseEnter={() => setSelectedCategory(cat)}
            >
              {cat}
            </li>
          ))}
        </ul>
      </div>

      <div className="dropdown-right">
        <ul>
          {categories[selectedCategory].map(({ name, path }) => (
            <li key={name}>
              <Link to={path}>{name}</Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}