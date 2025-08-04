import React, { useState, useRef } from "react";
import { CSSTransition, SwitchTransition } from "react-transition-group";
import { FaHeart, FaHeartBroken, FaShareAlt } from "react-icons/fa";
import "../css/ProductCard.css";
export default function ProductCard({ product }) {
    const [activeTab, setActiveTab] = useState("Описание");
    const [selectedIdx, setSelectedIdx] = useState(0);
    const tabContentRef = useRef(null);

    const tabs = ["Описание", "Характеристики", "Применение", "Состав"];
    const firstCategory = product.categories[0] || { slug: "", title: "" };

    // Короткое описание для превью
    const shortDesc =
        product.description.length > 200
            ? product.description.slice(0, 200) + "…"
            : product.description;

    return (
        <div className="product-card-wrapper">
            {/* Breadcrumbs */}
            <nav className="breadcrumbs">
                <a href="/">Главная</a>
                <span>—</span>
                <a href="/catalog">Каталог</a>
                {firstCategory.slug && (
                    <>
                        <span>—</span>
                        <a href={`/catalog?categories=${firstCategory.slug}`}>
                            {firstCategory.title}
                        </a>
                    </>
                )}
                <span>—</span>
                <span className="current">{product.title}</span>
            </nav>

            <div className="product-card">
                {/* Колонка изображений */}
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
                    <img
                        className="main-image"
                        src={product.images[selectedIdx]?.image}
                        alt={product.title}
                    />
                </div>

                {/* Информация о продукте */}
                <div className="product-info">
                    <h1 className="product-title">{product.title}</h1>
                    <p className="product-type">{product.type}</p>
                    <p className="product-description">{shortDesc}</p>

                    <div className="product-price">
                          <span className="price">
              {product.discount_price || product.price}₽
            </span>
                        {product.discount_price && (
                        <span className="old-price">{product.price}₽</span>
                    )}

                    </div>

                    <div className="actions">
                    <button className="add-to-cart">В корзину</button>
                        <div className="icons">
                            {product.is_fav ? (
                                <FaHeart className="icon heart active" />
                            ) : (
                                <FaHeartBroken className="icon heart" />
                            )}
                            <FaShareAlt className="icon share" />
                        </div>
                    </div>

                    {/* Таб–панели с анимацией */}
                    <div className="product-tabs">
                        <ul className="tabs-nav">
                            {tabs.map((tab) => (
                                <li
                                    key={tab}
                                    className={`tab${tab === activeTab ? " active" : ""}`}
                                    onClick={() => setActiveTab(tab)}
                                >
                                    {tab}
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
                                    {activeTab === "Описание" && <p>{product.description}</p>}
                                    {activeTab === "Характеристики" && (
                                        <ul>
                                            <li>
                                                <strong>Размер:</strong> {product.size}
                                            </li>
                                            <li>
                                                <strong>Вес продукта:</strong> {product.product_weight} г
                                            </li>
                                            <li>
                                                <strong>Общий вес:</strong> {product.full_weight} г
                                            </li>
                                            <li>
                                                <strong>Страна:</strong> {product.country}
                                            </li>
                                            {product.color && (
                                                <li>
                                                    <strong>Цвет:</strong> {product.color}
                                                </li>
                                            )}
                                            {product.collection && (
                                                <li>
                                                    <strong>Коллекция:</strong> {product.collection}
                                                </li>
                                            )}
                                        </ul>
                                    )}
                                    {activeTab === "Применение" && <p>{product.effect || "—"}</p>}
                                    {activeTab === "Состав" && <p>{product.ingredients || "—"}</p>}
                                </div>
                            </CSSTransition>
                        </SwitchTransition>
                    </div>
                </div>
            </div>
        </div>
    );
}
