// pages/ProductPage.jsx
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import ProductCard from "../components/ProductCard";

export default function ProductPage() {
    const { id } = useParams();
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get(`http://127.0.0.1:8000/api/products/${id}/`)
            .then((res) => setProduct(res.data))
            .catch((err) => console.error("Ошибка загрузки продукта:", err))
            .finally(() => setLoading(false));
    }, [id]);

    if (loading) return <div className="product-loading">Загрузка...</div>;
    if (!product) return <div className="product-error">Товар не найден</div>;

    return <ProductCard product={product} />;
}
