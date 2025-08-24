import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import CatalogSidebar from "../components/catalog/CatalogSidebar.jsx";
import MobileSidebarToggle from "../components/catalog/MobileSidebarToggle.jsx";
import "../css/catalog/Catalog.css";

import ProductCardMini from "../components/catalog/ProductCardMini.jsx";

export default function Catalog() {
  const { sectionSlug, categorySlug } = useParams();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // fetchProducts принимает queryString без начального "?"
  // Например: "categories=slug1&slug2&slug3" или "categories=single"
  const fetchProducts = async (queryString = "") => {
    setLoading(true);
    try {
      const all = [];
      let url = `http://127.0.0.1:8000/api/products/${queryString ? `?${queryString}` : ""}`;

      while (url) {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(`HTTP error ${res.status}`);
        }
        const data = await res.json();

        if (data && Array.isArray(data.results)) {
          all.push(...data.results);
          url = data.next;
        } else if (Array.isArray(data)) {
          all.push(...data);
          url = null;
        } else {
          console.warn("Unexpected products response format", data);
          url = null;
        }
      }

      setProducts(all);
    } catch (err) {
      console.error("Ошибка загрузки продуктов:", err);
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // 1) Если есть categorySlug — запрашиваем по одной категории
    if (categorySlug) {
      const qs = `categories=${encodeURIComponent(categorySlug)}`;
      fetchProducts(qs);
      return;
    }

    // 2) Если есть sectionSlug — формируем query через & для всех категорий
    if (sectionSlug) {
      setLoading(true);
      fetch(`http://127.0.0.1:8000/api/sections/${encodeURIComponent(sectionSlug)}/`)
        .then((res) => {
          if (!res.ok) throw new Error("Раздел не найден");
          return res.json();
        })
        .then((section) => {
          const cats = Array.isArray(section.categories)
            ? section.categories.map(c => c.slug).filter(Boolean)
            : [];

          if (cats.length === 0) {
            setProducts([]);
            setLoading(false);
            return;
          }

          // Формируем строку: categories=slug1&slug2&slug3
          const encodedSlugs = cats.map(s => encodeURIComponent(s));
          const qs = "categories=" + encodedSlugs.join(",");

          fetchProducts(qs);
        })
        .catch((err) => {
          console.error("Ошибка загрузки раздела:", err);
          setProducts([]);
          setLoading(false);
        });

      return;
    }

    // 3) Ни sectionSlug, ни categorySlug — загружаем все товары
    fetchProducts();
  }, [sectionSlug, categorySlug]);

  const toggleFav = (id) =>
    setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_fav: !p.is_fav } : p)));

  return (
    <main className="catalog-page">
      <div className="catalog-header">
        <h1>Каталог</h1>
        <Breadcrumbs />
      </div>

      <div className="catalog-container">
        <MobileSidebarToggle />

        <div className="sidebar-wrapper">
          <CatalogSidebar />
        </div>

        <div className="catalog-scrollable">
          {loading ? (
            <div className="loading-indicator">Загрузка товаров...</div>
          ) : products.length === 0 ? (
            <p className="no-products">Товаров не найдено</p>
          ) : (
            <div className="products">
              {products.map((product) => (
                <ProductCardMini
                  key={product.id}
                  product={product}
                  onToggleFav={toggleFav}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
