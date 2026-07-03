import quality from "../../assets/icons/quality-icon.svg";
import work from "../../assets/icons/work-icon.svg";
import service from "../../assets/icons/service-icon.svg";
import "../../css/home/Advantages.css";

const Advantages = () => (
    <section className="advantages">
        <div>
            <img src={quality} alt="Качество" className="icon" />
            <p className="advantages-head">Продуманный ассортимент</p>
            <p className="advantages-body">
                Подбираем позиции, которые удобно сочетать между собой и приятно
                использовать каждый день.
            </p>
        </div>
        <div>
            <img src={work} alt="Выбор" className="icon" />
            <p className="advantages-head">Понятный выбор</p>
            <p className="advantages-body">
                Чистые карточки товаров, актуальные характеристики и удобная
                навигация по разделам без лишнего шума.
            </p>
        </div>
        <div>
            <img src={service} alt="Сервис" className="icon" />
            <p className="advantages-head">Удобный сервис</p>
            <p className="advantages-body">
                Быстрое оформление заказа, прозрачные условия покупки и поддержка на
                каждом этапе.
            </p>
        </div>
    </section>
);

export default Advantages;
