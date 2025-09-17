// src/pages/Catalog.jsx
import { useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import CatalogSidebar from "../components/catalog/CatalogSidebar.jsx";
import MobileSidebarToggle from "../components/catalog/MobileSidebarToggle.jsx";
import Pagination from "../components/catalog/Pagination.jsx";
import "../css/catalog/Catalog.css";
import "../css/catalog/SortDropdown.css";
import FilterDropdown from "../components/catalog/FilterDropdown.jsx";
import SortDropdown from "../components/catalog/SortDropdown.jsx";
import ProductCardMini from "../components/catalog/ProductCardMini.jsx";

const API_BASE = import.meta.env.VITE_API_BASE;
const apiUrl = (path = "") =>
    `${String(API_BASE).replace(/\/+$/, "")}/${String(path).replace(/^\/+/, "")}`;

export default function Catalog() {
  const { sectionSlug, categorySlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const itemsPerPage = 16;

  const [ordering, setOrdering] = useState("");

  const [countries, setCountries] = useState([]);

  const [appliedFilters, setAppliedFilters] = useState({
    country: "",
    price_min: "",
    price_max: "",
  });

  // Получаем список стран (устойчиво к разным форматам ответа)
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch(apiUrl("/countries/"), {
          credentials: "include",
        });
        if (!res.ok) throw new Error("Не удалось загрузить список стран");
        const data = await res.json();
        const arr = Array.isArray(data)
            ? data
            : Array.isArray(data?.results)
                ? data.results
                : [];
        setCountries(arr);
      } catch (err) {
        console.error("Ошибка загрузки стран:", err);
        setCountries([]);
      }
    };
    fetchCountries();
  }, []);

  const fetchProducts = async (page = 1, queryString = "") => {
    setLoading(true);
    try {
      const base = apiUrl("/products/");
      const url = queryString
          ? `${base}?page=${page}&${queryString}`
          : `${base}?page=${page}`;

      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();

      setProducts(data.results || []);
      setTotalPages(Math.max(1, Math.ceil((data.count || 0) / itemsPerPage)));
    } catch (err) {
      console.error("Ошибка загрузки продуктов:", err);
      setProducts([]);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };

  // Удалить параметр search из URL и сбросить страницу
  const clearSearch = () => {
    const sp = new URLSearchParams(searchParams);
    sp.delete("search");
    setSearchParams(sp);
    setCurrentPage(1);
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Если есть поисковый параметр и мы не на странице 1 — сначала сбросим страницу на 1,
        // чтобы результаты поиска всегда открывались с первой страницы.
        if (searchQuery && currentPage !== 1) {
          setCurrentPage(1);
          return; // следующий запуск эффекта произойдёт с currentPage=1
        }

        const orderingQs = ordering ? `ordering=${encodeURIComponent(ordering)}` : "";

        const parts = [];
        if (appliedFilters.country) parts.push(`country=${encodeURIComponent(appliedFilters.country)}`);
        if (appliedFilters.price_min !== "" && appliedFilters.price_min != null) parts.push(`price_min=${encodeURIComponent(appliedFilters.price_min)}`);
        if (appliedFilters.price_max !== "" && appliedFilters.price_max != null) parts.push(`price_max=${encodeURIComponent(appliedFilters.price_max)}`);
        if (orderingQs) parts.push(orderingQs);

        const commonQs = parts.join("&");

        // Если в URL есть search — приоритет у поиска (ищем по всем полям, можно комбинировать с фильтрами/сортировкой)
        if (searchQuery) {
          let qs = `search=${encodeURIComponent(searchQuery)}`;
          if (commonQs) qs += `&${commonQs}`;
          await fetchProducts(currentPage, qs);
          return;
        }

        // Иначе — ведём себя как раньше: сначала по категории, затем по разделу
        if (categorySlug) {
          let qs = `categories=${encodeURIComponent(categorySlug)}`;
          if (commonQs) qs += `&${commonQs}`;
          await fetchProducts(currentPage, qs);
          return;
        }

        if (sectionSlug) {
          const res = await fetch(
              apiUrl(`/sections/${encodeURIComponent(sectionSlug)}/`),
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

          let qs = "categories=" + cats.join(",");
          if (commonQs) qs += `&${commonQs}`;
          await fetchProducts(currentPage, qs);
          return;
        }

        const qs = commonQs ? commonQs : "";
        await fetchProducts(currentPage, qs);
      } catch (err) {
        console.error("Ошибка загрузки раздела:", err);
        setProducts([]);
        setTotalPages(1);
      }
    };

    fetchData();
  }, [sectionSlug, categorySlug, currentPage, ordering, appliedFilters, searchQuery]);

  const toggleFav = (id) =>
      setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_fav: !p.is_fav } : p))
      );

  const handleSortChange = (apiOrderingValue) => {
    setOrdering(apiOrderingValue || "");
    setCurrentPage(1);
  };

  return (
      <main className="catalog-page">
        <Breadcrumbs />
        <div className="catalog-content">
          <div>
            <div className="catalog-header">
              {!searchQuery && <h1>Каталог</h1>}
            </div>

            {/* Мобильный переключатель показываем только если нет поиска */}
            {!searchQuery && <MobileSidebarToggle />}

            {/* Показываем сайдбар только если каталог не открыт через поиск */}
            {!searchQuery && (
                <div className="sidebar-wrapper">
                  <CatalogSidebar />
                </div>
            )}
          </div>

          <div className="products-section">
            {searchQuery && (
                <div className="search-results-header">
                  <h1>Результаты поиска: «{searchQuery}»</h1>
                </div>
            )}
            <div className="filters">
              <SortDropdown onChange={handleSortChange} />
              <FilterDropdown
                  countries={countries}
                  initial={appliedFilters}
                  onApply={(filters) => {
                    setAppliedFilters(filters);
                    setCurrentPage(1);
                  }}
                  onReset={() => {
                    setAppliedFilters({ country: "", price_min: "", price_max: "" });
                    setCurrentPage(1);
                  }}
              />

              {/* Кнопка очистки поиска — видна только если открыт поиск через параметр */}
              {searchQuery && (
                  <button className="clear-search-button" onClick={clearSearch}>
                    Очистить поиск
                  </button>
              )}
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
