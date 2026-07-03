import { Link } from "react-router-dom";
import mainGirl from "../../assets/mainGirl.png";
import "../../css/home/Offer.css";

const Offer = () => (
    <section className="offer">
        <div className="offer-photo">
            <img src={mainGirl} alt="ReVolline" />
        </div>

        <div className="offer-textblock">
            <p className="offer-title">О компании</p>
            <p className="offer-text">
                ReVolline помогает собрать понятный ассортимент декоративной косметики
                и продуктов для ухода: от повседневных позиций до товаров, которые
                хорошо работают в подарочных и сезонных подборках.
            </p>
            <Link to="/info/about" className="offer-link">
                Подробнее о бренде
            </Link>

            <p className="offer-title offer-title-secondary">Партнёрам и ритейлу</p>
            <p className="offer-text">
                Для розничных сетей и партнёров мы готовим коммерческие предложения,
                тестовые образцы и материалы для запуска продаж, чтобы вход в
                ассортимент был быстрым и предсказуемым.
            </p>
            <Link to="/info/partners" className="offer-link">
                Условия сотрудничества
            </Link>
        </div>
    </section>
);

export default Offer;
