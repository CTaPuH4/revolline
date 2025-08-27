// src/pages/NewProducts.jsx
import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import MobileSidebarToggle from "../components/catalog/MobileSidebarToggle.jsx";
import Pagination from "../components/catalog/Pagination.jsx";
import SortDropdown from "../components/catalog/SortDropdown.jsx";
import ProductCardMini from "../components/catalog/ProductCardMini.jsx";
import "../css/catalog/Catalog.css";
import "../css/catalog/CatalogSidebar.css";
import filterIcon from "../assets/icons/filter-icon.png";

export default function NewProducts() {
    const { sectionSlug, categorySlug } = useParams();
    const { pathname } = useLocation();

    const [products, setProducts] = useState([]);
    const [sections, setSections] = useState([]);
    const [loading, setLoading] = useState(true);
    const [expanded, setExpanded] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 16;

    // Получение товаров
    const fetchProducts = async (query = "") => {
        setLoading(true);
        try {
            let allProducts = [];
            let url = `http://127.0.0.1:8000/api/products/${query ? `?${query}` : "?is_new=true"}`;

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
            setCurrentPage(1);
        } catch (err) {
            console.error("Ошибка загрузки новинок:", err);
            setProducts([]);
        } finally {
            setLoading(false);
        }
    };

    // Получение разделов для сайдбара
    const fetchSections = async () => {
        try {
            const res = await fetch("http://127.0.0.1:8000/api/sections/", { credentials: "include" });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();
            setSections(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Ошибка загрузки разделов:", err);
        }
    };

    useEffect(() => {
        fetchSections();

        const fetchData = async () => {
            setLoading(true);
            try {
                if (categorySlug) {
                    // конкретная категория
                    const qs = `categories=${encodeURIComponent(categorySlug)}&is_new=true`;
                    await fetchProducts(qs);
                    return;
                }

                if (sectionSlug) {
                    // раздел
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

                    const qs = `categories=${cats.join(",")}&is_new=true`;
                    await fetchProducts(qs);
                    return;
                }

                // все новинки
                await fetchProducts("is_new=true");
            } catch (err) {
                console.error("Ошибка загрузки новинок:", err);
                setProducts([]);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [sectionSlug, categorySlug]);

    const toggleFav = (id) =>
        setProducts(prev => prev.map(p => (p.id === id ? { ...p, is_fav: !p.is_fav } : p)));

    const handleToggle = (idx) => {
        setExpanded(prev => (prev === idx ? null : idx));
    };

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
                        <h1>Новинки</h1>
                    </div>
                    <MobileSidebarToggle />

                    {/* Сайдбар */}
                    <aside className="sidebar-catalog">
                        <ul>
                            {sections.map((section, idx) => {
                                const sectionPath = `/new/${section.slug}`;
                                const isActive = pathname === sectionPath || pathname.startsWith(`${sectionPath}/`);

                                return (
                                    <li key={section.slug} className={`category-item ${isActive ? 'active' : ''}`}>
                                        <div className="category-link">
                                            <Link to={sectionPath}>{section.title}</Link>
                                            {section.categories?.length > 0 && (
                                                <div className="arrow-container" onClick={(e) => { e.stopPropagation(); handleToggle(idx); }}>
                                                    <svg className={`arrow ${expanded === idx ? "rotated" : ""}`} width="20" height="10" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                        <path d="M1 1L5 5L9 1" stroke="#626161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                        <div className="divider"></div>
                                        {section.categories?.length > 0 && (
                                            <ul className={`subcategory-list ${expanded === idx ? "open" : ""}`}>
                                                {section.categories.map(cat => (
                                                    <li key={cat.slug}>
                                                        <Link to={`/new/${section.slug}/${cat.slug}`}>{cat.title}</Link>
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
                    <div className="filters">
                        <SortDropdown />
                        <div className="sort">
                            <img src={filterIcon} alt="filter" />
                            <p>Фильтры</p>
                            <svg width="20" height="10" viewBox="0 0 10 6" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M1 1L5 5L9 1" stroke="#626161" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                        </div>
                    </div>

                    <div className="catalog-scrollable">
                        {loading ? (
                            <div className="loading-indicator">Загрузка новинок...</div>
                        ) : currentProducts.length === 0 ? (
                            <p className="no-products">Новинок нет</p>
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

                        {currentProducts.length > 0 && (
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
