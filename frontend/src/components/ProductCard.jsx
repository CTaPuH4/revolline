import React, { useEffect, useState, useRef } from "react";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { FaHeart, FaHeartBroken, FaShareAlt } from "react-icons/fa";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../modals/Auth/AuthModal";
import "../css/ProductCard.css";

const API_BASE = "http://127.0.0.1:8000";

export default function ProductCard({ product }) {
    const { isAuthenticated } = useAuth();

    const [activeTab, setActiveTab] = useState("Описание");
    const [selectedIdx, setSelectedIdx] = useState(0);
    const tabContentRef = useRef(null);
    const [isFav, setIsFav] = useState(Boolean(product.is_fav));
    const [inCart, setInCart] = useState(false);
    const [addingToCart, setAddingToCart] = useState(false);
    const [error, setError] = useState(null);
    const [showAuth, setShowAuth] = useState(false);

    const tabs = ["Описание", "Характеристики", "Применение", "Состав"];
    const firstCategory = (product.categories && product.categories[0]) || { slug: "", title: "" };

    const shortDesc =
        product.description && product.description.length > 200
            ? product.description.slice(0, 200) + "…"
            : product.description;

    const apiFetch = async (path, options = {}) => {
        const url = path.startsWith("http") ? path : `${API_BASE}${path.startsWith("/") ? path : "/" + path}`;
        const opts = {
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            ...options,
        };
        const res = await fetch(url, opts);
        if (!res.ok) {
            const text = await res.text();
            const err = new Error(`HTTP ${res.status}: ${text}`);
            err.status = res.status;
            throw err;
        }
        if (res.status === 204) return null;
        try { return await res.json(); } catch { return null; }
    };

    // Проверяем корзину на сервере
    const fetchCart = async () => {
        try {
            const data = await apiFetch("/api/cart/");
            const list = Array.isArray(data) ? data : data.results || [];
            const found = list.find(
                (c) => (c.product_data && c.product_data.id === product.id) || (c.product && c.product.id === product.id)
            );
            setInCart(Boolean(found));
        } catch (err) {
            console.warn("fetchCart failed", err);
        }
    };

    useEffect(() => {
        setIsFav(Boolean(product.is_fav));
        fetchCart();
    }, [product.id, product.is_fav]);

    const addToCart = async () => {
        setError(null);

        if (!isAuthenticated) {
            setShowAuth(true);
            return;
        }

        if (inCart) {
            window.location.href = "/cart";
            return;
        }

        setAddingToCart(true);
        try {
            const data = await apiFetch("/api/cart/", {
                method: "POST",
                body: JSON.stringify({ product: product.id, quantity: 1 }),
            });
            if (data && data.id) {
                setInCart(true);
            } else {
                await fetchCart();
            }
            setTimeout(() => setAddingToCart(false), 700);
        } catch (err) {
            console.error("addToCart failed", err);
            setError("Не удалось добавить в корзину");
            setAddingToCart(false);
        }
    };

    const toggleFavorite = async () => {
        if (!isAuthenticated) {
            setShowAuth(true);
            return;
        }

        const prev = isFav;
        setIsFav(!prev);

        try {
            if (prev) {
                // Удаляем из избранного по product.id
                await fetch(`${API_BASE}/api/favorites/delete/?product=${product.id}`, {
                    method: "DELETE",
                    credentials: "include",
                });
            } else {
                // Добавляем в избранное
                await apiFetch("/api/favorites/", {
                    method: "POST",
                    body: JSON.stringify({ product: product.id }),
                    credentials: "include",
                });
            }
        } catch (err) {
            console.error("toggleFavorite failed", err);
            setError(prev ? "Не удалось убрать из избранного" : "Не удалось добавить в избранное");
            setIsFav(prev);
        }
    };

    return (
        <>
            <div className="product-card-wrapper">
                <nav className="breadcrumbs">
                    <a href="/">Главная</a>
                    <span>—</span>
                    <a href="/catalog">Каталог</a>
                    {firstCategory.slug && (
                        <>
                            <span>—</span>
                            <a href={`/catalog?categories=${firstCategory.slug}`}>{firstCategory.title}</a>
                        </>
                    )}
                    <span>—</span>
                    <span className="current">{product.title}</span>
                </nav>

                <div className="product-card">
                    <div className="product-images">
                        <div className="thumbnail-list">
                            {product.images.map((img, idx) => (
                                <img
                                    key={idx}
                                    src={img.image}
                                    alt={`preview-${idx}`}
                                    className={`thumbnail${idx === selectedIdx ? " selected" : ""}`}
                                    onClick={() => setSelectedIdx(idx)}
                                />
                            ))}
                        </div>
                        <img className="main-image" src={product.images[selectedIdx]?.image} alt={product.title} />
                    </div>

                    <div className="product-info">
                        <h1 className="product-title">{product.title}</h1>
                        <p className="product-type">{product.type}</p>
                        <p className="product-description">{shortDesc}</p>

                        <div className="product-price">
                            <span className="price">{product.discount_price || product.price}₽</span>
                            {product.discount_price && <span className="old-price">{product.price}₽</span>}
                        </div>

                        <div className="actions">
                            <button
                                className="add-to-cart"
                                onClick={addToCart}
                                disabled={addingToCart}
                                title={inCart ? "Товар уже в корзине — перейти в корзину" : "Добавить в корзину"}
                            >
                                {inCart ? "В корзине" : addingToCart ? "Добавлено" : "В корзину"}
                            </button>

                            <div className="icons">
                                <button
                                    aria-label={isFav ? "Убрать из избранного" : "В избранное"}
                                    onClick={toggleFavorite}
                                    className="icon-btn"
                                >
                                    {isFav ? <FaHeart className="icon heart active" /> : <FaHeartBroken className="icon heart" />}
                                </button>
                                <button
                                    className="icon-btn"
                                    onClick={() => navigator.share && navigator.share({ title: product.title, url: window.location.href })}
                                >
                                    <FaShareAlt className="icon share" />
                                </button>
                            </div>
                        </div>

                        <div className="product-tabs">
                            <ul className="tabs-nav">
                                {tabs.map((tab) => (
                                    <li key={tab} className={`tab${tab === activeTab ? " active" : ""}`} onClick={() => setActiveTab(tab)}>
                                        {tab}
                                    </li>
                                ))}
                            </ul>

                            <SwitchTransition mode="out-in">
                                <CSSTransition key={activeTab} nodeRef={tabContentRef} timeout={300} classNames="fade" unmountOnExit>
                                    <div ref={tabContentRef} className="tab-content">
                                        {activeTab === "Описание" && <p>{product.description}</p>}
                                        {activeTab === "Характеристики" && (
                                            <ul>
                                                <li><strong>Размер:</strong> {product.size}</li>
                                                <li><strong>Вес продукта:</strong> {product.product_weight} г</li>
                                                <li><strong>Общий вес:</strong> {product.full_weight} г</li>
                                                <li><strong>Страна:</strong> {product.country}</li>
                                                {product.color && <li><strong>Цвет:</strong> {product.color}</li>}
                                                {product.collection && <li><strong>Коллекция:</strong> {product.collection}</li>}
                                            </ul>
                                        )}
                                        {activeTab === "Применение" && <p>{product.effect || "—"}</p>}
                                        {activeTab === "Состав" && <p>{product.ingredients || "—"}</p>}
                                    </div>
                                </CSSTransition>
                            </SwitchTransition>
                        </div>

                        {error && <p className="error">{error}</p>}
                    </div>
                </div>
            </div>

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </>
    );
}
