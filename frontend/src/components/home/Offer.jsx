import mainGirl from '../../assets/mainGirl.png'
import '../../css/home/Offer.css'

const Offer = () => (
    <div className="offer">
        <div className='offer-photo'>
            <img src={mainGirl} alt="фото девушки" style={{margin: 0}}></img>
        </div>
        <div className='offer-textblock'>
            <p className='offer-title'>ReVolline</p>
            <p className='offer-text'>
                интернет сайт производителя косметологической 
                продукции с возможностью купить продукцию
            </p>
            <p className='offer-link'>подробнее</p>
            <p className='offer-title'>Попробовать продукцию</p>
            <p className='offer-text'>
                Розничным сетям мы предоставляем бесплатные тестовые 
                образцы для пробы, вместе с нашей промо продукцией, 
                такой как буклеты, проспекты и пробники.
            </p>
            <p className='offer-link'>подробнее</p>
        </div>
    </div>
);

export default Offer;