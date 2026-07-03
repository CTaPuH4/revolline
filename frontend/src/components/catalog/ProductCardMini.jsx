import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../../css/catalog/ProductCardMini.css";
import { useAuth } from "../../context/AuthContext";
import AuthModal from "../../modals/Auth/AuthModal";
import { csrfFetch } from "../../utils/api";

import heart from '../../assets/icons/heart.png'
import heartFilled from '../../assets/icons/heart-filled.png'

const API_BASE = import.meta.env.VITE_API_BASE;

const HeartIcon = ({ filled, onClick }) => (
    <span
        className={`heart-icon ${filled ? "filled" : ""}`}
        onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onClick();
        }}
    >
        <img src={filled ? heartFilled : heart}></img>
    
  </span>
);

export default function ProductCardMini({ product }) {
    const { isAuthenticated } = useAuth();
    const navigate = useNavigate();

    const [isFav, setIsFav] = useState(false);
    const [showAuth, setShowAuth] = useState(false);
    const productType = product.pr_type || product.type || "";

    useEffect(() => {
        setIsFav(product.is_fav || false);
    }, [product.is_fav]);

    const toggleFav = async () => {
        if (!isAuthenticated) {
            setShowAuth(true);
            return;
        }

        const prevFav = isFav;
        setIsFav(!prevFav);

        try {
            if (prevFav) {
                // Удаляем из избранного
                await csrfFetch(`${API_BASE}/favorites/delete/?product=${product.id}`, {
                    method: "DELETE",
                    credentials: "include",
                });
            } else {
                // Добавляем в избранное
                await csrfFetch(`${API_BASE}/favorites/`, {
                    method: "POST",
                    credentials: "include",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ product: product.id }),
                });
            }
        } catch (err) {
            console.error("Ошибка добавления/удаления из избранного:", err);
            setIsFav(prevFav); // откат при ошибке
        }
    };

    return (
        <>
            <div
                className="product-mini-card-link"
                onClick={() => navigate(`/product/${product.id}`)}
            >
                <div className="product-mini-card">
                    <div className="product-mini-image-wrapper">
                        <HeartIcon filled={isFav} onClick={toggleFav} />
                        {product.images?.[0]?.image ? (
                            <img
                                src={product.images[0].image}
                                alt={product.title}
                                className="product-mini-image"
                            />
                        ) : (
                            <div className="no-image">Нет фото</div>
                        )}
                    </div>
                    <div className="product-mini-title">{product.title}</div>
                    {productType && <div className="product-mini-type">{productType}</div>}
                    <div className="product-mini-price">
                        {product.old_price ? (
                            <>
                                <span className="old-price">{product.old_price}₽</span>
                                <span className="new-price">{product.price}₽</span>
                            </>
                        ) : (
                            <span className="new-price">{product.price}₽</span>
                        )}
                    </div>
                </div>
            </div>

            {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
        </>
    );
}
