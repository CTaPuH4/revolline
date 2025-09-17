// pages/ProductPage.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import ProductCard from "../components/ProductCard";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function ProductPage() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`${API_BASE}/products/${id}/`, {
            withCredentials: true, // <-- добавлено
        })
            .then((res) => setProduct(res.data))
            .catch((err) => console.error("Ошибка загрузки продукта:", err))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="product-loading">Загрузка...</div>;
    if (!product) return <div className="product-error">Товар не найден</div>;

    return <ProductCard product={product} />;
}
