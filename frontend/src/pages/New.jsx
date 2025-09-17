// src/pages/NewProducts.jsx
import { useEffect, useState } from "react";
import Breadcrumbs from "../components/Breadcrumbs";
import MobileSidebarToggle from "../components/catalog/MobileSidebarToggle.jsx";
import Pagination from "../components/catalog/Pagination.jsx";
import ProductCardMini from "../components/catalog/ProductCardMini.jsx";
import "../css/catalog/Catalog.css";
import "../css/catalog/CatalogSidebar.css";

const API_BASE = import.meta.env.VITE_API_BASE;
const apiUrl = (path = "") =>
    `${String(API_BASE).replace(/\/+$/, "")}/${String(path).replace(/^\/+/, "")}`;

export default function NewProducts() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const itemsPerPage = 12;

    // Получение товаров — только новинки
    const fetchProducts = async (page = 1) => {
        setLoading(true);
        try {
            const base = apiUrl("/products/");
            const url = `${base}?page=${page}&is_new=true`;

            const res = await fetch(url, { credentials: "include" });
            if (!res.ok) throw new Error(`HTTP error ${res.status}`);
            const data = await res.json();

            setProducts(data.results || []);
            setTotalPages(Math.max(1, Math.ceil((data.count ?? 0) / itemsPerPage)));
        } catch (err) {
            console.error("Ошибка загрузки новинок:", err);
            setProducts([]);
            setTotalPages(1);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchProducts(currentPage);
    }, [currentPage]);

    const toggleFav = (id) =>
        setProducts((prev) => prev.map((p) => (p.id === id ? { ...p, is_fav: !p.is_fav } : p)));

    return (
        <main className="catalog-page">
            <Breadcrumbs />

            <div className="catalog-content">
                <div>
                    <MobileSidebarToggle />
                </div>

                <div className="products-section">
                    <div className="catalog-header">
                        <h1>Новинки</h1>
                    </div>
                    <div className="catalog-scrollable">
                        {loading ? (
                            <div className="loading-indicator">Загрузка новинок...</div>
                        ) : products.length === 0 ? (
                            <p className="no-products">Новинок нет</p>
                        ) : (
                            <div className="products">
                                {products.map((product) => (
                                    <ProductCardMini key={product.id} product={product} onToggleFav={toggleFav} />
                                ))}
                            </div>
                        )}

                        {products.length > 0 && (
                            <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                        )}
                    </div>
                </div>
            </div>
        </main>
    );
}
