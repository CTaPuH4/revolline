import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../modals/Auth/AuthModal";
import Breadcrumbs from "./Breadcrumbs";
import "../css/ProductCard.css";
import heart from "../assets/icons/heart-card.png";
import heartFilled from "../assets/icons/heart-filled-card.png";
import share from "../assets/icons/share.png";

const DESCRIPTION_PREVIEW_LIMIT = 420;
const THUMBNAIL_SCROLL_STEP = 140;

export default function ProductCard({ product }) {
    const { isAuthenticated, authFetch } = useAuth();
    const [activeTab, setActiveTab] = useState("");
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [isFav, setIsFav] = useState(Boolean(product.is_fav));
    const [inCart, setInCart] = useState(false);
    const [addingToCart, setAddingToCart] = useState(false);
    const [error, setError] = useState(null);
    const [showAuth, setShowAuth] = useState(false);
    const [showFullDescription, setShowFullDescription] = useState(false);
    const [isImageFullscreen, setIsImageFullscreen] = useState(false);
    const tabContentRef = useRef(null);
    const thumbnailListRef = useRef(null);

    const apiFetch = useCallback((path, options = {}) => authFetch(path, options), [authFetch]);

    const fetchCart = useCallback(async () => {
        if (!isAuthenticated) {
            setInCart(false);
            return;
        }

        try {
            const data = await apiFetch("/cart/");
            const list = data.items || [];
            const found = list.find(
                (item) =>
                    (item.product_data && item.product_data.id === product.id) ||
                    (item.product && item.product.id === product.id),
            );
            setInCart(Boolean(found));
        } catch (err) {
            console.warn("fetchCart failed", err);
        }
    }, [apiFetch, isAuthenticated, product.id]);

    useEffect(() => {
        setIsFav(Boolean(product.is_fav));
        fetchCart();
    }, [fetchCart, product.is_fav]);

    useEffect(() => {
        setShowFullDescription(false);
        setSelectedIdx(0);
        setIsImageFullscreen(false);
    }, [product.id]);

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
            const data = await apiFetch("/cart/", {
                method: "POST",
                body: JSON.stringify({ product: product.id, quantity: 1 }),
            });

            if (data) {
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
                await apiFetch(`/favorites/delete/?product=${product.id}`, {
                    method: "DELETE",
                });
            } else {
                await apiFetch("/favorites/", {
                    method: "POST",
                    body: JSON.stringify({ product: product.id }),
                });
            }
        } catch (err) {
            console.error("toggleFavorite failed", err);
            setError(
                prev
                    ? "Не удалось убрать из избранного"
                    : "Не удалось добавить в избранное",
            );
            setIsFav(prev);
        }
    };

    const hasSize = Boolean(product.size);
    const hasProductWeight = product.product_weight != null && product.product_weight !== "";
    const hasFullWeight = product.full_weight != null && product.full_weight !== "";
    const hasCountry = Boolean(product.country);
    const hasColor = Boolean(product.color);
    const hasCollection = Boolean(product.collection);
    const hasEffect = Boolean(product.effect);
    const hasAnyCharacteristics =
        hasSize ||
        hasProductWeight ||
        hasFullWeight ||
        hasCountry ||
        hasColor ||
        hasCollection ||
        hasEffect;

    const images = Array.isArray(product.images) ? product.images : [];
    const currentImage = images[selectedIdx]?.image || "";

    const availableTabs = [];
    if (product.description) availableTabs.push("Описание");
    if (hasAnyCharacteristics) availableTabs.push("Характеристики");
    if (product.ingredients) availableTabs.push("Состав");

    useEffect(() => {
        if (availableTabs.length === 0) {
            setActiveTab("");
            return;
        }
        setActiveTab((prev) => (availableTabs.includes(prev) ? prev : availableTabs[0]));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [product.id]);

    useEffect(() => {
        if (selectedIdx >= images.length) {
            setSelectedIdx(0);
        }
    }, [images.length, selectedIdx]);

    useEffect(() => {
        if (!isImageFullscreen) {
            return undefined;
        }

        const handleKeyDown = (event) => {
            if (event.key === "Escape") {
                setIsImageFullscreen(false);
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isImageFullscreen]);

    const descriptionText = product.description || "";
    const isDescriptionLong = descriptionText.length > DESCRIPTION_PREVIEW_LIMIT;
    const visibleDescription = useMemo(() => {
        if (!isDescriptionLong || showFullDescription) {
            return descriptionText;
        }
        return `${descriptionText.slice(0, DESCRIPTION_PREVIEW_LIMIT).trim()}...`;
    }, [descriptionText, isDescriptionLong, showFullDescription]);

    const handleShare = async () => {
        if (!navigator.share) {
            return;
        }
        try {
            await navigator.share({
                title: product.title,
                url: window.location.href,
            });
        } catch (err) {
            if (err?.name !== "AbortError") {
                console.warn("share failed", err);
            }
        }
    };

    const scrollThumbnails = (direction) => {
        if (!thumbnailListRef.current) {
            return;
        }

        thumbnailListRef.current.scrollBy({
            top: direction * THUMBNAIL_SCROLL_STEP,
            behavior: "smooth",
        });
    };

    return (
        <main className="product-card-wrapper">
            <Breadcrumbs product={product} />

            <div className="product-card">
                <div className="product-gallery">
                    {images.length > 0 && (
                        <div className="thumbnail-rail">
                            {images.length > 4 && (
                                <button
                                    type="button"
                                    className="thumb-nav-button up"
                                    onClick={() => scrollThumbnails(-1)}
                                    aria-label="Прокрутить фото вверх"
                                >
                                    <span aria-hidden="true" />
                                </button>
                            )}

                            <div ref={thumbnailListRef} className="thumbnail-list">
                                {images.map((img, idx) => (
                                    <button
                                        type="button"
                                        key={idx}
                                        className={`thumbnail-button${idx === selectedIdx ? " selected" : ""}`}
                                        onClick={() => setSelectedIdx(idx)}
                                        aria-label={`Показать фото ${idx + 1}`}
                                    >
                                        <img
                                            src={img.image}
                                            alt={`preview-${idx + 1}`}
                                            className="thumbnail"
                                        />
                                    </button>
                                ))}
                            </div>

                            {images.length > 4 && (
                                <button
                                    type="button"
                                    className="thumb-nav-button down"
                                    onClick={() => scrollThumbnails(1)}
                                    aria-label="Прокрутить фото вниз"
                                >
                                    <span aria-hidden="true" />
                                </button>
                            )}
                        </div>
                    )}

                    <div className="main-image-stage">
                        {currentImage ? (
                            <button
                                type="button"
                                className="main-image-button"
                                onClick={() => setIsImageFullscreen(true)}
                                aria-label="Открыть фото на весь экран"
                            >
                                <img
                                    className="main-image"
                                    src={currentImage}
                                    alt={product.title || "product image"}
                                />
                            </button>
                        ) : (
                            <div className="main-image-empty">Нет фото</div>
                        )}
                    </div>
                </div>

                <div className="product-info">
                    {product.pr_type && <p className="product-type">{product.pr_type}</p>}
                    <h1 className="product-title">{product.title}</h1>

                    <div className="product-purchase-row">
                        <div className="product-price">
                            <span className="price">{product.price}₽</span>
                            {product.old_price && (
                                <span className="old-price">{product.old_price}₽</span>
                            )}
                        </div>

                        <button
                            className="add-to-cart"
                            onClick={addToCart}
                            disabled={addingToCart}
                            title={
                                inCart
                                    ? "Товар уже в корзине — перейти в корзину"
                                    : "Добавить в корзину"
                            }
                        >
                            {inCart ? "В корзине" : addingToCart ? "Добавлено" : "В корзину"}
                        </button>

                        <div className="icons">
                            <button
                                type="button"
                                aria-label={
                                    isFav ? "Убрать из избранного" : "Добавить в избранное"
                                }
                                onClick={toggleFavorite}
                                className="icon"
                            >
                                <img src={isFav ? heartFilled : heart} alt="fav" />
                            </button>

                            <button
                                type="button"
                                className="icon"
                                onClick={handleShare}
                                disabled={!navigator.share}
                                aria-label="Поделиться товаром"
                            >
                                <img src={share} alt="share" />
                            </button>
                        </div>
                    </div>

                    {availableTabs.length > 0 && (
                        <div className="product-tabs">
                            <ul className="tabs-nav">
                                {availableTabs.map((tab) => (
                                    <li key={tab}>
                                        <button
                                            type="button"
                                            className={`tab${tab === activeTab ? " active" : ""}`}
                                            onClick={() => setActiveTab(tab)}
                                        >
                                            {tab}
                                        </button>
                                    </li>
                                ))}
                            </ul>

                            <SwitchTransition mode="out-in">
                                <CSSTransition
                                    key={activeTab}
                                    nodeRef={tabContentRef}
                                    timeout={300}
                                    classNames="fade"
                                    unmountOnExit
                                >
                                    <div ref={tabContentRef} className="tab-content">
                                        {activeTab === "Описание" && (
                                            <div className="tab-text-block">
                                                <p>{visibleDescription || "—"}</p>
                                                {isDescriptionLong && (
                                                    <button
                                                        type="button"
                                                        className="description-toggle"
                                                        onClick={() =>
                                                            setShowFullDescription((prev) => !prev)
                                                        }
                                                    >
                                                        {showFullDescription
                                                            ? "Свернуть"
                                                            : "Развернуть"}
                                                    </button>
                                                )}
                                            </div>
                                        )}

                                        {activeTab === "Характеристики" && hasAnyCharacteristics && (
                                            <ul className="characteristics-list">
                                                {hasSize && (
                                                    <li>
                                                        <strong>Размер:</strong> {product.size}
                                                    </li>
                                                )}
                                                {hasProductWeight && (
                                                    <li>
                                                        <strong>Вес продукта:</strong>{" "}
                                                        {product.product_weight} г
                                                    </li>
                                                )}
                                                {hasFullWeight && (
                                                    <li>
                                                        <strong>Общий вес:</strong>{" "}
                                                        {product.full_weight} г
                                                    </li>
                                                )}
                                                {hasCountry && (
                                                    <li>
                                                        <strong>Страна:</strong> {product.country}
                                                    </li>
                                                )}
                                                {hasColor && (
                                                    <li>
                                                        <strong>Цвет:</strong> {product.color}
                                                    </li>
                                                )}
                                                {hasCollection && (
                                                    <li>
                                                        <strong>Коллекция:</strong>{" "}
                                                        {product.collection}
                                                    </li>
                                                )}
                                                {hasEffect && (
                                                    <li>
                                                        <strong>Эффект:</strong> {product.effect}
                                                    </li>
                                                )}
                                            </ul>
                                        )}

                                        {activeTab === "Состав" && (
                                            <p>{product.ingredients || "—"}</p>
                                        )}
                                    </div>
                                </CSSTransition>
                            </SwitchTransition>
                        </div>
                    )}

                    {error && <p className="error">{error}</p>}
                </div>
            </div>

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}

            {isImageFullscreen && currentImage && (
                <div
                    className="image-lightbox"
                    onClick={() => setIsImageFullscreen(false)}
                    role="presentation"
                >
                    <button
                        type="button"
                        className="image-lightbox-close"
                        onClick={() => setIsImageFullscreen(false)}
                        aria-label="Закрыть полноэкранный просмотр"
                    >
                        ×
                    </button>
                    <div
                        className="image-lightbox-content"
                        onClick={(event) => event.stopPropagation()}
                        role="presentation"
                    >
                        <img
                            className="image-lightbox-image"
                            src={currentImage}
                            alt={product.title || "product image"}
                        />
                    </div>
                </div>
            )}
        </main>
    );
}
