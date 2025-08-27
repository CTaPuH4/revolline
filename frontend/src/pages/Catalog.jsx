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
  const itemsPerPage = 16; // 16 товаров на странице

  const fetchProducts = async (queryString = "") => {
    setLoading(true);
    try {
      let allProducts = [];
      let url = `http://127.0.0.1:8000/api/products/${queryString ? `?${queryString}` : ""}`;

      while (url) {
        const res = await fetch(url, { credentials: "include" });
        if (!res.ok) throw new Error(`HTTP error ${res.status}`);
        const data = await res.json();

        if (data && Array.isArray(data.results)) {
          allProducts.push(...data.results);
          url = data.next;
        } else if (Array.isArray(data)) {
          allProducts.push(...data);
          url = null;
        } else {
          console.warn("Unexpected products response format", data);
          url = null;
        }
      }

      setProducts(allProducts);
    } catch (err) {
      console.error("Ошибка загрузки продуктов:", err);
      setProducts([]);
    } finally {
      setLoading(false);
      setCurrentPage(1); // сброс на первую страницу при новой загрузке
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        if (categorySlug) {
          const qs = `categories=${encodeURIComponent(categorySlug)}`;
          await fetchProducts(qs);
          return;
        }

        if (sectionSlug) {
          const res = await fetch(`http://127.0.0.1:8000/api/sections/${encodeURIComponent(sectionSlug)}/`, {
            credentials: "include",
          });
          if (!res.ok) throw new Error("Раздел не найден");
          const section = await res.json();

          const cats = Array.isArray(section.categories)
              ? section.categories.map(c => c.slug).filter(Boolean)
              : [];

          if (cats.length === 0) {
            setProducts([]);
            return;
          }

          const qs = "categories=" + cats.join(",");
          await fetchProducts(qs);
          return;
        }

        await fetchProducts();
      } catch (err) {
        console.error("Ошибка загрузки раздела:", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [sectionSlug, categorySlug]);

  const toggleFav = (id) =>
      setProducts(prev => prev.map(p => (p.id === id ? { ...p, is_fav: !p.is_fav } : p)));

  // пагинация
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentProducts = products.slice(indexOfFirst, indexOfLast);
  const totalPages = Math.ceil(products.length / itemsPerPage);

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
              ) : currentProducts.length === 0 ? (
                  <p className="no-products">Товаров не найдено</p>
              ) : (
                  <div className="products">
                    {currentProducts.map(product => (
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
