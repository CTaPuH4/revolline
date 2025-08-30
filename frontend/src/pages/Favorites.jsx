import React, { useEffect, useState } from 'react';
import '../css/Favorites.css';
import deleteIcon from "../assets/icons/delete-icon.png";
import example1 from "../assets/example1.jpg"; // запасное изображение

const API_BASE = 'http://127.0.0.1:8000';

export default function Favorites() {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const apiFetch = async (path, options = {}) => {
        const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
        const opts = { headers: { 'Content-Type': 'application/json' }, credentials: 'include', ...options };
        const res = await fetch(url, opts);
        if (!res.ok) {
            const text = await res.text();
            const err = new Error(`HTTP ${res.status}: ${text}`);
            err.status = res.status;
            throw err;
        }
        if (res.status === 204) return null;
        try { return await res.json(); } catch (e) { return null; }
    };

    const transformFav = (favItem) => {
        const prod = favItem.product_data || favItem.product || {};
        const firstImage = Array.isArray(prod.images) && prod.images.length ? prod.images[0] : null;
        const image = (firstImage && (firstImage.image || firstImage.url)) || prod.image || example1;
        return {
            favId: favItem.id,
            productId: prod.id,
            title: prod.title || prod.name || 'Без названия',
            type: prod.type || '',
            price: prod.price ?? 0,
            discount_price: prod.discount_price ?? prod.price ?? 0,
            image,
        };
    };

    // Кнопка "В корзину" с логикой
    function AddToCartButton({ productId }) {
        const [inCart, setInCart] = useState(false);
        const [setCartItemId] = useState(null);
        const [addingToCart, setAddingToCart] = useState(false);

        useEffect(() => {
            fetch(`${API_BASE}/api/cart/`, { credentials: "include" })
                .then((res) => res.json())
                .then((data) => {
                    const item = data.results.find((i) => i.product.id === productId);
                    if (item) {
                        setInCart(true);
                        setCartItemId(item.id);
                    }
                })
                .catch((err) => console.error("Ошибка проверки корзины:", err));
        }, [productId]);

        const addToCart = async () => {
            if (inCart) {
                window.location.href = "/cart";
                return;
            }
            setAddingToCart(true);
            try {
                const res = await fetch(`${API_BASE}/api/cart/`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ product: productId, quantity: 1 }),
                });
                if (!res.ok) throw new Error("Ошибка добавления в корзину");
                const data = await res.json();
                setInCart(true);
                setCartItemId(data.id);
                setTimeout(() => setAddingToCart(false), 1000000000);
            } catch (err) {
                console.error(err);
                setAddingToCart(false);
            }
        };

        return (
            <button
                className="favorites-add-to-cart"
                onClick={addToCart}
                disabled={addingToCart && !inCart}
                title={inCart ? "Товар уже в корзине — перейти в корзину" : "Добавить в корзину"}
            >
                {inCart ? "В корзине" : addingToCart ? "Добавлено" : "В корзину"}
            </button>
        );
    }

    const fetchFavorites = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const data = await apiFetch('/api/favorites/');
            const list = Array.isArray(data) ? data : data.results || [];
            const transformed = list.map(transformFav);
            setItems(transformed);
        } catch (err) {
            console.error('fetchFavorites error', err);
            setError('Не удалось загрузить избранное');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => { fetchFavorites(); }, []);

    const removeFavorite = async (favId) => {
        const prev = items;
        setItems(prevItems => prevItems.filter(i => i.favId !== favId));
        try {
            await apiFetch(`/api/favorites/${favId}/`, { method: 'DELETE' });
        } catch (err) {
            console.error('removeFavorite failed', err);
            setError('Не удалось удалить из избранного');
            setItems(prev);
        }
    };

    const clearFavorites = async () => {
        if (!items.length) return;
        const prev = items;
        setItems([]);
        try {
            await Promise.all(prev.map(i => apiFetch(`/api/favorites/${i.favId}/`, { method: 'DELETE' })));
        } catch (err) {
            console.error('clearFavorites failed', err);
            setError('Не удалось очистить избранное');
            setItems(prev);
        }
    };

    return (
        <main className='favorites-page'>
            <div className='favorites-products favorites-box'>
                <div className="favorites-header-row">
                    <h2 className='favorites-header'>
                        Избранное
                        <sup className="favorites-items-count">{items.length}</sup>
                    </h2>
                    <button className="favorites-clear-btn" onClick={clearFavorites} title="Очистить избранное">
                        <img src={deleteIcon} alt="Очистить" />
                    </button>
                </div>

                <div className="favorites-items">
                    {isLoading && <p>Загрузка...</p>}
                    {!isLoading && items.length === 0 && <p className="empty-cart">Список избранного пуст</p>}

                    {!isLoading && items.map(item => (
                        <div key={item.favId} className="favorites-item">
                            <a href={`/product/${item.productId}`}>
                                <img src={item.image} alt={item.title} className="favorites-item-img" />
                            </a>

                            <div className="favorites-item-info">
                                <h3 className="favorites-item-title">
                                    <a href={`/product/${item.productId}`}>{item.title}</a>
                                </h3>
                                <p className="favorites-item-type">{item.type}</p>

                                <div className="favorites-item-prices">
                                    <span className="favorites-item-price">{item.discount_price} ₽</span>
                                    {item.price !== item.discount_price && (
                                        <span className="favorites-item-oldprice">{item.price} ₽</span>
                                    )}
                                </div>

                                <AddToCartButton productId={item.productId} />
                            </div>

                            <button className="favorites-item-remove" onClick={() => removeFavorite(item.favId)}
                                    title="Удалить">×
                            </button>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}
