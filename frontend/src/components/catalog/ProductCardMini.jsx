import "../../css/catalog/ProductCardMini.css";
import { Link } from "react-router-dom"; // <-- добавь импорт

const HeartIcon = ({ filled, onClick }) => (
    <span
        className={`heart-icon ${filled ? "filled" : ""}`}
        onClick={(e) => {
            e.stopPropagation(); // предотвращает переход при нажатии на сердце
            onClick();
        }}
    >
        {filled ? "♥" : "♡"}
    </span>
);

export default function ProductCardMini({ product, onToggleFav }) {
    return (
        <Link to={`/product/${product.id}`} className="product-mini-card-link">
            <div className="product-mini-card">
                <div className="product-mini-image-wrapper">
                    <HeartIcon
                        filled={product.is_fav}
                        onClick={() => onToggleFav(product.id)}
                    />
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
                <div className="product-mini-type">{product.type}</div>
                <div className="product-mini-price">
                    {product.discount_price ? (
                        <>
                            <span className="old-price">{product.price}₽</span>
                            <span className="new-price">{product.discount_price}₽</span>
                        </>
                    ) : (
                        <span className="new-price">{product.price}₽</span>
                    )}
                </div>
            </div>
        </Link>
    );
}
