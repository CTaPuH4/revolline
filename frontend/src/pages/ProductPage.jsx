import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import ProductCard from "../components/ProductCard";
import RecommendedSection from "../components/RecommendedSection";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function ProductPage() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${API_BASE}/products/${id}/`, {
            withCredentials: true,
        })
            .then((res) => setProduct(res.data))
            .catch((err) => console.error("Ошибка загрузки продукта:", err))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="product-loading">Загрузка...</div>;
    if (!product) return <div className="product-error">Товар не найден</div>;

    return (
        <div className="product-page-container">
            <ProductCard product={product} />

            <RecommendedSection
                // Передаем slug категории, а не id
                categorySlug={product.categories?.[0]?.slug}
                currentProductId={product.id}
            />
        </div>
    );
}