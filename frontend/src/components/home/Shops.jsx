import '../../css/home/Shops.css'
import wb from '../../assets/wb.png'
import ozon from '../../assets/ozon.png'

const Shops = () => (
    <section className='shops'> {/* Блок с ссылками на вб и озон */}
            <div>
              <a
                href="https://www.wildberries.ru/seller/43738"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={wb} alt="Wildberries" className='wb'></img>
              </a>
              <p>Наш магазин на Wildberries</p>
            </div>
             <div>
              <a
                href="https://www.wildberries.ru/seller/43738"
                target="_blank"
                rel="noopener noreferrer"
              >
                <img src={ozon} alt="OZON" className='ozon'></img>
              </a>
              <p>Наш магазин на OZON</p>
            </div>
          </section>
);

export default Shops;