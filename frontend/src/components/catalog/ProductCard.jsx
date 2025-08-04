import "../../css/catalog/ProductCard.css"; // или отдельный CSS, если нужно

const HeartIcon = ({ filled, onClick }) => (
    <span
        className={`heart-icon ${filled ? "filled" : ""}`}
        onClick={onClick}
    >
        {filled ? "♥" : "♡"}
    </span>
);

export default function ProductCard({ product, onToggleFav }) {
    return (
        <div className="product-card">
            <div className="product-image-wrapper">
                <HeartIcon
                    filled={product.is_fav}
                    onClick={() => onToggleFav(product.id)}
                />
                {product.images?.[0]?.image ? (
                    <img
                        src={product.images[0].image}
                        alt={product.title}
                        className="product-image"
                    />
                ) : (
                    <div className="no-image">Нет фото</div>
                )}
            </div>
            <div className="product-title">{product.title}</div>
            <div className="product-type">{product.type}</div>
            <div className="product-price">
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
    );
}