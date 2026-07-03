import { useEffect, useState } from "react";
import axios from "axios";
import ProductCardMini from "../components/catalog/ProductCardMini";
import "../css/catalog/Catalog.css";

const API_BASE = import.meta.env.VITE_API_BASE;
const RECOMMENDED_LIMIT = 6;

export default function RecommendedSection({ categorySlug, currentProductId }) {
    const [recommended, setRecommended] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!categorySlug) {
            setRecommended([]);
            setLoading(false);
            return;
        }

        const fetchRecommended = async () => {
            setLoading(true);
            setError(null);

            try {
                const res = await axios.get(`${API_BASE}/products/`, {
                    params: {
                        categories: categorySlug,
                        page_size: RECOMMENDED_LIMIT + 1,
                    },
                    withCredentials: true,
                });

                const items = Array.isArray(res.data?.results) ? res.data.results : [];
                const filtered = items
                    .filter((product) => product.id !== currentProductId)
                    .slice(0, RECOMMENDED_LIMIT);

                setRecommended(filtered);
            } catch (err) {
                console.error("Ошибка загрузки рекомендуемых товаров:", err);
                setError("Не удалось загрузить рекомендуемые товары.");
            } finally {
                setLoading(false);
            }
        };

        fetchRecommended();
    }, [categorySlug, currentProductId]);

    if (loading) {
        return <div className="loading-indicator">Загрузка рекомендуемых товаров...</div>;
    }

    if (error) {
        return <p className="error-message">{error}</p>;
    }

    if (recommended.length === 0) {
        return null;
    }

    return (
        <section className="recommended-section">
            <h2 className="recommended-title">Рекомендуем также</h2>
            <div className="products recommended-products">
                {recommended.map((product) => (
                    <ProductCardMini key={product.id} product={product} />
                ))}
            </div>
        </section>
    );
}
