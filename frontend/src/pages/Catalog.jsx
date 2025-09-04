import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import CatalogSidebar from "../components/catalog/CatalogSidebar.jsx";
import MobileSidebarToggle from "../components/catalog/MobileSidebarToggle.jsx";
import Pagination from "../components/catalog/Pagination.jsx";
import "../css/catalog/Catalog.css";

import filterIcon from "../assets/icons/filter-icon.png";
import SortDropdown from "../components/catalog/SortDropdown.jsx";
import ProductCardMini from "../components/catalog/ProductCardMini.jsx";

export default function Catalog() {
  const { sectionSlug, categorySlug } = useParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const itemsPerPage = 16; // бэк уже отдаёт по 16, просто для расчёта страниц

  const fetchProducts = async (page = 1, queryString = "") => {
    setLoading(true);
    try {
      let url = `http://127.0.0.1:8000/api/products/?page=${page}`;
      if (queryString) url += `&${queryString}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      setProducts(data.results || []);
      setTotalPages(Math.ceil(data.count / itemsPerPage));
    } catch (err) {
      console.error("Ошибка загрузки продуктов:", err);
      setProducts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (categorySlug) {
          const qs = `categories=${encodeURIComponent(categorySlug)}`;
          await fetchProducts(currentPage, qs);
          return;
        }

        if (sectionSlug) {
          const res = await fetch(
              `http://127.0.0.1:8000/api/sections/${encodeURIComponent(
                  sectionSlug
              )}/`,
              { credentials: "include" }
          );
          if (!res.ok) throw new Error("Раздел не найден");
          const section = await res.json();

          const cats = Array.isArray(section.categories)
              ? section.categories.map((c) => c.slug).filter(Boolean)
              : [];

          if (cats.length === 0) {
            setProducts([]);
            setTotalPages(1);
            return;
          }

          const qs = "categories=" + cats.join(",");
          await fetchProducts(currentPage, qs);
          return;
        }

        await fetchProducts(currentPage);
      } catch (err) {
        console.error("Ошибка загрузки раздела:", err);
        setProducts([]);
        setTotalPages(1);
      }
    };

    fetchData();
  }, [sectionSlug, categorySlug, currentPage]);

  const toggleFav = (id) =>
      setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_fav: !p.is_fav } : p))
      );

  return (
      <main className="catalog-page">
        <div className="breadcrumbs">
          <Breadcrumbs />
        </div>

        <div className="catalog-content">
          <div>
            <div className="catalog-header">
              <h1>Каталог</h1>
            </div>
            <MobileSidebarToggle />
            <div className="sidebar-wrapper">
              <CatalogSidebar />
            </div>
          </div>

          <div className="products-section">
            <div className="filters">
              <SortDropdown />
              <div className="sort">
                <img src={filterIcon} alt="filter" />
                <p>Фильтры</p>
                <svg
                    width="20"
                    height="10"
                    viewBox="0 0 10 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                      d="M1 1L5 5L9 1"
                      stroke="#626161"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                  />
                </svg>
              </div>
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

              <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
              />
            </div>
          </div>
        </div>
      </main>
  );
}
