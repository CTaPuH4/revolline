import React, { useEffect, useState, useRef, useCallback } from 'react';
import '../css/Favorites.css';
import deleteIcon from "../assets/icons/delete-icon.png";
import fallbackImage from "../assets/logo.png";
import { csrfFetch } from "../utils/api";

const API_BASE = import.meta.env.VITE_API_BASE;

function AddToCartButton({ productId, apiFetch }) {
    const [inCart, setInCart] = useState(false);
    const [addingToCart, setAddingToCart] = useState(false);

    useEffect(() => {
        apiFetch('/cart/')
            .then((data) => {
                const item = (data.items || []).find(
                    (i) => i.product_data.id === productId,
                );
                if (item) {
                    setInCart(true);
                }
            })
            .catch((err) => console.error('Ошибка проверки корзины:', err));
    }, [apiFetch, productId]);

    const addToCart = async () => {
        if (inCart) {
            window.location.href = '/cart';
            return;
        }

        setAddingToCart(true);
        try {
            await apiFetch('/cart/', {
                method: 'POST',
                body: JSON.stringify({ product: productId, quantity: 1 }),
            });
            setInCart(true);
        } catch (err) {
            console.error(err);
        } finally {
            setAddingToCart(false);
        }
    };

    return (
        <button
            className="favorites-add-to-cart"
            onClick={addToCart}
            disabled={addingToCart && !inCart}
            title={
                inCart
                    ? 'Товар уже в корзине - перейти в корзину'
                    : 'Добавить в корзину'
            }
        >
            {inCart ? 'В корзине' : addingToCart ? 'Добавлено' : 'В корзину'}
        </button>
    );
}

export default function Favorites() {
    const [items, setItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [error, setError] = useState(null);
    const [currentPage, setCurrentPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const observer = useRef();

    const apiFetch = useCallback(async (path, options = {}) => {
        const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
        const opts = { headers: { 'Content-Type': 'application/json' }, credentials: 'include', ...options };
        const res = await csrfFetch(url, opts);
        if (!res.ok) {
            const text = await res.text();
            const err = new Error(`HTTP ${res.status}: ${text}`);
            err.status = res.status;
            throw err;
        }
        if (res.status === 204) return null;
        try {
            return await res.json();
        } catch {
            return null;
        }
    }, []);

    const transformFav = useCallback((favItem) => {
        const prod = favItem.product_data || favItem.product || {};
        const firstImage = Array.isArray(prod.images) && prod.images.length ? prod.images[0] : null;
        const image = (firstImage && (firstImage.image || firstImage.url)) || prod.image || fallbackImage;

        return {
            favId: favItem.id,
            productId: prod.id,
            title: prod.title || prod.name || 'Без названия',
            type: prod.type || '',
            price: prod.price ?? 0,
            old_price: prod.old_price ?? null,
            image,
        };
    }, []);

    const fetchFavorites = useCallback(async (page = 1) => {
        if (page === 1) {
            setIsLoading(true);
        } else {
            setIsLoadingMore(true);
        }

        setError(null);

        try {
            const data = await apiFetch(`/favorites/?page=${page}`);
            const newList = (data.results || []).map(transformFav);
            setItems(prevItems => page === 1 ? newList : [...prevItems, ...newList]);
            setHasMore(!!data.next);
            setCurrentPage(page);
        } catch (err) {
            console.error('fetchFavorites error', err);
            setError('Не удалось загрузить избранное');
        } finally {
            if (page === 1) {
                setIsLoading(false);
            } else {
                setIsLoadingMore(false);
            }
        }
    }, [apiFetch, transformFav]);

    const lastItemElementRef = useCallback(node => {
        if (isLoadingMore) return;
        if (observer.current) observer.current.disconnect();
        observer.current = new IntersectionObserver(entries => {
            if (entries[0].isIntersecting && hasMore) {
                fetchFavorites(currentPage + 1);
            }
        });
        if (node) observer.current.observe(node);
    }, [fetchFavorites, isLoadingMore, hasMore, currentPage]);

    useEffect(() => {
        fetchFavorites();
    }, [fetchFavorites]);

    const removeFavorite = async (favId) => {
        const prev = items;
        setItems(prevItems => prevItems.filter(i => i.favId !== favId));

        try {
            await apiFetch(`/favorites/${favId}/`, { method: 'DELETE' });
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
            await Promise.all(prev.map(i => apiFetch(`/favorites/${i.favId}/`, { method: 'DELETE' })));
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
                    {error && <p className="orders-error">{error}</p>}
                    {!isLoading && items.length === 0 && <p className="empty-cart">Список избранного пуст</p>}

                    {!isLoading && items.map((item, index) => {
                        const isLastElement = items.length === index + 1;

                        return (
                            <div
                                key={item.favId}
                                ref={isLastElement ? lastItemElementRef : null}
                                className="favorites-item fade-in"
                            >
                                <a href={`/product/${item.productId}`}>
                                    <img src={item.image} alt={item.title} className="favorites-item-img" />
                                </a>

                                <div className="favorites-item-info">
                                    <h3 className="favorites-item-title">
                                        <a href={`/product/${item.productId}`}>{item.title}</a>
                                    </h3>
                                    <p className="favorites-item-type">{item.type}</p>
                                    <div className="favorites-item-prices">
                                        <span className="favorites-item-price">{item.price} ₽</span>
                                        {item.old_price && (
                                            <span className="favorites-item-oldprice">{item.old_price} ₽</span>
                                        )}
                                    </div>
                                    <AddToCartButton productId={item.productId} apiFetch={apiFetch} />
                                </div>

                                <button
                                    className="favorites-item-remove"
                                    onClick={() => removeFavorite(item.favId)}
                                    title="Удалить"
                                >
                                    ×
                                </button>
                            </div>
                        );
                    })}

                    {isLoadingMore && hasMore && (
                        <div className="loader-container">
                            <div className="loader"></div>
                            <p className="orders-info">Загрузка дополнительных товаров...</p>
                        </div>
                    )}
                </div>
            </div>
        </main>
    );
}
