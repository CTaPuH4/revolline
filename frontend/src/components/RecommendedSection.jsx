import { useEffect, useState } from "react";
import axios from "axios";
import ProductCardMini from "../components/catalog/ProductCardMini";
import Pagination from "../components/catalog/Pagination";
import "../css/catalog/Catalog.css";

const API_BASE = import.meta.env.VITE_API_BASE;
const itemsPerPage = 1;

export default function RecommendedSection({ categorySlug}) {
    const [recommended, setRecommended] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        if (!categorySlug) {
            setLoading(false);
            return;
        }

        const fetchRecommended = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get(`${API_BASE}/products/`, {
                    params: {
                        // Используем slug для фильтрации
                        categories: categorySlug,
                        // exclude не поддерживается, так что уберем
                        page: currentPage,
                    },
                    withCredentials: true,
                });

                // Обработка данных
                setRecommended(res.data.results || []);
                setTotalPages(Math.max(1, Math.ceil((res.data.count || 0) / itemsPerPage)));
            } catch (err) {
                console.error("Ошибка загрузки рекомендованных товаров:", err);
                setError("Не удалось загрузить рекомендованные товары.");
            } finally {
                setLoading(false);
            }
        };

        fetchRecommended();
    }, [categorySlug, currentPage]); // Зависим только от slug и страницы

    if (loading) {
        return <div className="loading-indicator">Загрузка рекомендуемых товаров...</div>;
    }

    if (error) {
        return <p className="error-message">{error}</p>;
    }

    if (recommended.length === 0 && currentPage === 1) {
        return null;
    }

    return (
        <div className="catalog-page">
            <h2>Рекомендуем также</h2>
            <div className="products">
                {recommended.map((product) => (
                    <ProductCardMini key={product.id} product={product} />
                ))}
            </div>

            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
            />
        </div>
    );
}