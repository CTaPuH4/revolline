import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import CatalogSidebar from "../components/catalog/CatalogSidebar.jsx";
import MobileSidebarToggle from "../components/catalog/MobileSidebarToggle.jsx";
import Pagination from "../components/catalog/Pagination.jsx";
import "../css/catalog/Catalog.css";
import "../css/catalog/SortDropdown.css"
import FilterDropdown from "../components/catalog/FilterDropdown.jsx";
import SortDropdown from "../components/catalog/SortDropdown.jsx";
import ProductCardMini from "../components/catalog/ProductCardMini.jsx";

export default function Catalog() {
  const { sectionSlug, categorySlug } = useParams();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const itemsPerPage = 16;

  const [ordering, setOrdering] = useState("");

  const [countries, setCountries] = useState([]);
  const [countryInput, setCountryInput] = useState("");
  const [priceMinInput, setPriceMinInput] = useState("");
  const [priceMaxInput, setPriceMaxInput] = useState("");

  const [appliedFilters, setAppliedFilters] = useState({
    country: "",
    price_min: "",
    price_max: "",
  });

  // Получаем список стран (устойчиво к разным форматам ответа)
  useEffect(() => {
    const fetchCountries = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api/countries/", {
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
      let url = `http://127.0.0.1:8000/api/products/?page=${page}`;
      if (queryString) url += `&${queryString}`;

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const orderingQs = ordering ? `ordering=${encodeURIComponent(ordering)}` : "";

        const parts = [];
        if (appliedFilters.country) parts.push(`country=${encodeURIComponent(appliedFilters.country)}`);
        if (appliedFilters.price_min !== "" && appliedFilters.price_min != null) parts.push(`price_min=${encodeURIComponent(appliedFilters.price_min)}`);
        if (appliedFilters.price_max !== "" && appliedFilters.price_max != null) parts.push(`price_max=${encodeURIComponent(appliedFilters.price_max)}`);
        if (orderingQs) parts.push(orderingQs);

        const commonQs = parts.join("&");

        if (categorySlug) {
          let qs = `categories=${encodeURIComponent(categorySlug)}`;
          if (commonQs) qs += `&${commonQs}`;
          await fetchProducts(currentPage, qs);
          return;
        }

        if (sectionSlug) {
          const res = await fetch(
              `http://127.0.0.1:8000/api/sections/${encodeURIComponent(sectionSlug)}/`,
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
  }, [sectionSlug, categorySlug, currentPage, ordering, appliedFilters]);

  const toggleFav = (id) =>
      setProducts((prev) =>
          prev.map((p) => (p.id === id ? { ...p, is_fav: !p.is_fav } : p))
      );

  const handleSortChange = (apiOrderingValue) => {
    setOrdering(apiOrderingValue || "");
    setCurrentPage(1);
  };

  // helper для безопасной генерации option
  const renderCountryOption = (c, idx) => {
    const isString = typeof c === "string";
    const key = isString ? c : (c.id ?? c.slug ?? c.name ?? idx);
    const val = isString ? c : (c.slug ?? c.id ?? c.name ?? String(c));
    const label = isString ? c : (c.name ?? c.slug ?? String(c.id) ?? String(c));
    return (
        <option key={String(key)} value={val || ""}>
          {label}
        </option>
    );
  };

  return (
      <main className="catalog-page">
        <Breadcrumbs />
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
            </div> {/* <-- ЗАКРЫТИЕ .filters (было пропущено) */}

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
