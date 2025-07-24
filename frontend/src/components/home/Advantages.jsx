import quality from '../../assets/icons/quality-icon.svg'
import work from '../../assets/icons/work-icon.svg'
import service from '../../assets/icons/service-icon.svg'
import '../../css/home/Advantages.css'

const Advantages = () => (
    <section className="advantages">
        <div>
          <img src={quality} alt="Иконка 1" className="icon" />
          <p className='advantages-head'>Высший уровень качества</p>
          <p className='advantages-body'>Соответствие международным стандартам качества, 
            подтвержденное сертификатами</p>
        </div>
        <div>
          <img src={work} alt="Иконка 2" className="icon" />
          <p className='advantages-head'>Десятилетия успешной работы</p>
          <p className='advantages-body'>Опыт, проверенный 20+ годами на рынке</p>
        </div>
        <div>
          <img src={service} alt="Иконка 3" className="icon" />
          <p className='advantages-head'>Эталонный сервис</p>
          <p className='advantages-body'>Цифры говорят сами за себя: 500 тыс. B2C и 120+ B2B-клиентов</p>
        </div>
    </section>
);

export default Advantages;