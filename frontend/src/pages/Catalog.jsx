import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Breadcrumbs from "../components/Breadcrumbs";
import CatalogSidebar from "../components/catalog/CatalogSidebar.jsx";
import MobileSidebarToggle from "../components/catalog/MobileSidebarToggle.jsx";
import "../css/catalog/Catalog.css";

import ProductCardMini from "../components/catalog/ProductCardMini.jsx";

const HeartIcon = ({ filled, onClick }) => (
    <span
        className={`heart-icon ${filled ? "filled" : ""}`}
        onClick={onClick}
    >
        {filled ? "♥" : "♡"}
    </span>
);

export default function Catalog() {
    const { sectionSlug, categorySlug } = useParams();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProducts = (queryString = "") => {
            setLoading(true);
            const url = `http://127.0.0.1:8000/api/products/${queryString ? `?${queryString}` : ""}`;
            fetch(url)
                .then((res) => res.json())
                .then((data) => {
                    setProducts(data.results || []);
                    setLoading(false);
                })
                .catch((err) => {
                    console.error("Ошибка загрузки продуктов:", err);
                    setProducts([]);
                    setLoading(false);
                });
        };

        if (categorySlug) {
            fetchProducts(new URLSearchParams({ categories: categorySlug }).toString());
        } else if (sectionSlug) {
            fetch(`http://127.0.0.1:8000/api/sections/${sectionSlug}/`)
                .then((res) => {
                    if (!res.ok) throw new Error("Раздел не найден");
                    return res.json();
                })
                .then((section) => {
                    const slugs = section.categories.map((c) => c.slug).join(",");
                    if (slugs) {
                        fetchProducts(new URLSearchParams({ categories: slugs }).toString());
                    } else {
                        setProducts([]);
                        setLoading(false);
                    }
                })
                .catch((err) => {
                    console.error("Ошибка загрузки раздела:", err);
                    setProducts([]);
                    setLoading(false);
                });
        } else {
            fetchProducts();
        }
    }, [sectionSlug, categorySlug]);

    const toggleFav = (id) =>
        setProducts((prev) =>
            prev.map((p) => (p.id === id ? { ...p, is_fav: !p.is_fav } : p))
        );

    return (
        <main className="catalog-page">
            <div className="catalog-header">
                <h1>Каталог</h1>
                <Breadcrumbs />
            </div>

            <div className="catalog-container">
                {/* Бургер-кнопка для мобильных устройств */}
                <MobileSidebarToggle />

                {/* Обычный сайдбар (будет скрыт через CSS на мобильных) */}
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
