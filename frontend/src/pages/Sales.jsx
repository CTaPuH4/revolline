import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import MobileSidebarToggle from "../components/catalog/MobileSidebarToggle.jsx";
import Pagination from "../components/catalog/Pagination.jsx";
import ProductCardMini from "../components/catalog/ProductCardMini.jsx";
import "../css/catalog/Catalog.css";
import "../css/catalog/CatalogSidebar.css";

export default function Sales() {
    const { sectionSlug, categorySlug } = useParams();
    const { pathname } = useLocation();

    const [products, setProducts] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const itemsPerPage = 12; // соответствует настройке бэка

    const fetchProducts = async (page = 1, query = "has_discount=true") => {
        setLoading(true);
        try {
            let url = `http://127.0.0.1:8000/api/products/?page=${page}`;
            if (query) url += `&${query}`;

            const res = await fetch(url, { credentials: "include" });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();

            setProducts(data.results || []);
            setTotalPages(Math.ceil(data.count / itemsPerPage));
        } catch (err) {
            console.error("Ошибка загрузки акций:", err);
            setProducts([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    const fetchSections = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/api/sections/", {
                credentials: "include",
            });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            setSections(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Ошибка загрузки разделов:", err);
            setSections([]);
        }
    };

    useEffect(() => {
        fetchSections();

        const fetchData = async () => {
            try {
                if (categorySlug) {
                    const qs = `categories=${encodeURIComponent(categorySlug)}&has_discount=true`;
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

                    const qs = `categories=${cats.join(",")}&has_discount=true`;
                    await fetchProducts(currentPage, qs);
                    return;
                }

                await fetchProducts(currentPage, "has_discount=true");
            } catch (err) {
                console.error("Ошибка загрузки акций:", err);
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

    const handleToggle = (idx) => {
        setExpanded((prev) => (prev === idx ? null : idx));
    };

    return (
        <main className="catalog-page">
            <Breadcrumbs />

            <div className="catalog-content">
                <div>
                    <div className="catalog-header">
                        <h1>Акции</h1>
                    </div>
                    <MobileSidebarToggle />

                    <aside className="sidebar-catalog">
                        <ul>
                            {sections.map((section, idx) => {
                                const sectionPath = `/sales/${section.slug}`;
                                const isActive =
                                    pathname === sectionPath ||
                                    pathname.startsWith(`${sectionPath}/`);

                                return (
                                    <li
                                        key={section.slug}
                                        className={`category-item ${isActive ? "active" : ""}`}
                                    >
                                        <div className="category-link">
                                            <Link to={sectionPath}>{section.title}</Link>
                                            {section.categories?.length > 0 && (
                                                <div
                                                    className="arrow-container"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleToggle(idx);
                                                    }}
                                                >
                                                    <svg
                                                        className={`arrow ${
                                                            expanded === idx ? "rotated" : ""
                                                        }`}
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
                                            )}
                                        </div>
                                        <div className="divider"></div>
                                        {section.categories?.length > 0 && (
                                            <ul
                                                className={`subcategory-list ${
                                                    expanded === idx ? "open" : ""
                                                }`}
                                            >
                                                {section.categories.map((cat) => (
                                                    <li key={cat.slug}>
                                                        <Link
                                                            to={`/sales/${section.slug}/${cat.slug}`}
                                                        >
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
                </div>

                <div className="products-section">
                    <div className="catalog-scrollable">
                        {loading ? (
                            <div className="loading-indicator">Загрузка акций...</div>
                        ) : products.length === 0 ? (
                            <p className="no-products">Товаров по акции не найдено</p>
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

                        {products.length > 0 && (
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                            />
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
