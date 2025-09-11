import { useEffect, useState, useRef } from "react";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../modals/Auth/AuthModal";
import Breadcrumbs from "./Breadcrumbs";
import "../css/ProductCard.css";

import heart from '../assets/icons/heart-card.png'
import heartFilled from '../assets/icons/heart-filled-card.png'
import share from '../assets/icons/share.png'

const API_BASE = "http://127.0.0.1:8000";

export default function ProductCard({ product }) {
    const { isAuthenticated } = useAuth();

    const [activeTab, setActiveTab] = useState("");
    const [selectedIdx, setSelectedIdx] = useState(0);
    const tabContentRef = useRef(null);
    const [isFav, setIsFav] = useState(Boolean(product.is_fav));
    const [inCart, setInCart] = useState(false);
    const [addingToCart, setAddingToCart] = useState(false);
    const [error, setError] = useState(null);
    const [showAuth, setShowAuth] = useState(false);

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

    // Проверки наличия полей для характеристики
    const hasSize = Boolean(product.size);
    const hasProductWeight = product.product_weight != null && product.product_weight !== "";
    const hasFullWeight = product.full_weight != null && product.full_weight !== "";
    const hasCountry = Boolean(product.country);
    const hasColor = Boolean(product.color);
    const hasCollection = Boolean(product.collection);

    const hasAnyCharacteristics =
        hasSize || hasProductWeight || hasFullWeight || hasCountry || hasColor || hasCollection;

    const images = Array.isArray(product.images) ? product.images : [];

    // Динамические вкладки: только те, где есть данные
    const availableTabs = [];
    if (product.description) availableTabs.push("Описание");
    if (hasAnyCharacteristics) availableTabs.push("Характеристики");
    if (product.effect) availableTabs.push("Применение");
    if (product.ingredients) availableTabs.push("Состав");

    // Устанавливаем активную вкладку — первая доступная, если текущая недоступна
    useEffect(() => {
        if (availableTabs.length === 0) {
            setActiveTab("");
            return;
        }
        setActiveTab((prev) => (availableTabs.includes(prev) ? prev : availableTabs[0]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product.id]);

    // Если массив изображений поменялся — корректируем выбранный индекс
    useEffect(() => {
        if (selectedIdx >= images.length) setSelectedIdx(0);
    }, [images.length, selectedIdx]);

    return (
        <main className="product-card-wrapper">
            <Breadcrumbs product={product} />

            <div className="product-card">
                <div className="product-images">
                    <div className="thumbnail-list">
                        {images.map((img, idx) => (
                            <img
                                key={idx}
                                src={img.image}
                                alt={`preview-${idx}`}
                                className={`thumbnail${idx === selectedIdx ? " selected" : ""}`}
                                onClick={() => setSelectedIdx(idx)}
                            />
                        ))}
                    </div>
                    <img
                        className="main-image"
                        src={images[selectedIdx]?.image || ""}
                        alt={product.title || "product image"}
                    />
                </div>

                <div className="product-info">
                    <h1 className="product-title">{product.title}</h1>
                    {product.type && <p className="product-type">{product.type}</p>}
                    {shortDesc && <p className="product-description">{shortDesc}</p>}

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
                                className="icon"
                            >
                                <img src={isFav ? heartFilled : heart} alt="fav" />
                            </button>
                            <button
                                className="icon"
                                onClick={() => navigator.share && navigator.share({ title: product.title, url: window.location.href })}
                            >
                                <img src={share} alt="share" />
                            </button>
                        </div>
                    </div>

                    {availableTabs.length > 0 && (
                        <div className="product-tabs">
                            <ul className="tabs-nav">
                                {availableTabs.map((tab) => (
                                    <li key={tab} className={`tab${tab === activeTab ? " active" : ""}`} onClick={() => setActiveTab(tab)}>
                                        {tab}
                                    </li>
                                ))}
                            </ul>

                            <SwitchTransition mode="out-in">
                                <CSSTransition key={activeTab} nodeRef={tabContentRef} timeout={300} classNames="fade" unmountOnExit>
                                    <div ref={tabContentRef} className="tab-content">
                                        {activeTab === "Описание" && <p>{product.description || "—"}</p>}
                                        {activeTab === "Характеристики" && hasAnyCharacteristics && (
                                            <ul>
                                                {hasSize && <li><strong>Размер:</strong> {product.size}</li>}
                                                {hasProductWeight && <li><strong>Вес продукта:</strong> {product.product_weight} г</li>}
                                                {hasFullWeight && <li><strong>Общий вес:</strong> {product.full_weight} г</li>}
                                                {hasCountry && <li><strong>Страна:</strong> {product.country}</li>}
                                                {hasColor && <li><strong>Цвет:</strong> {product.color}</li>}
                                                {hasCollection && <li><strong>Коллекция:</strong> {product.collection}</li>}
                                            </ul>
                                        )}
                                        {activeTab === "Применение" && <p>{product.effect || "—"}</p>}
                                        {activeTab === "Состав" && <p>{product.ingredients || "—"}</p>}
                                    </div>
                                </CSSTransition>
                            </SwitchTransition>
                        </div>
                    )}

                    {error && <p className="error">{error}</p>}
                </div>
            </div>

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </main>
    );
}
