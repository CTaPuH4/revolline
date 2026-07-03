import "../../css/home/Shops.css";
import wb from "../../assets/wb.png";
import ozon from "../../assets/ozon.png";

const wbUrl = import.meta.env.VITE_WB_URL || "https://www.wildberries.ru/seller/43738";
const ozonUrl =
    import.meta.env.VITE_OZON_URL || "https://www.ozon.ru/seller/rivollayn-kosmetik/";

const Shops = () => (
    <section className="shops">
        <div>
            <a href={wbUrl} target="_blank" rel="noopener noreferrer">
                <img src={wb} alt="Wildberries" className="wb" />
            </a>
            <p>Наш магазин на Wildberries</p>
        </div>

        <div>
            <a href={ozonUrl} target="_blank" rel="noopener noreferrer">
                <img src={ozon} alt="Ozon" className="ozon" />
            </a>
            <p>Наш магазин на Ozon</p>
        </div>
    </section>
);

export default Shops;
