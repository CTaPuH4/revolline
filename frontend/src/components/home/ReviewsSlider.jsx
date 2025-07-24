import '../../css/home/ReviewsSlider.css'; // подключаем стили отдельно
import { Swiper, SwiperSlide } from 'swiper/react';
import {Pagination} from 'swiper/modules';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const ReviewsSlider = () => {
    return (
    <section className="reviews-slider">
      <Swiper
        modules={[Pagination]}
        loop={true}
        pagination={{ clickable: true }}
        slidesPerView={1}
        spaceBetween={0}
        style={{ height: '300px' }}
      >
        <SwiperSlide>
          <div className="reviews-slide-content">
             <p className='reviews-slider-text'>
                В работе встала задача развития: задачи, которые делал и делал успешно, 
                стали простыми и сильно привычными. Не ощущал прогресса, работал 
                на автопилоте. В компании вариантов роста или смены профиля не предлагали, 
                стал смотреть на внешний рынок. Пришел к коучу с запросом понять свои цели на 
                ближайшее будущее. Сначала хотел просто разобраться, насколько мне зайдет именно 
                коучинг. Хотел понять, чем я хочу дальше заниматься и какие мои сильные стороны 
                для этого. Сомневался, нужно ли мне менять работодателя, или нужно искать 
                варианты на текущем месте.Что получил от коучингового сопровождения? 
                Во-первых, понял, что хочу оставить сферу деятельности и кардинально 
                изменить масштаб своих задач. Во-вторых, полностью изменил подход к выбору 
                компаний, с которыми хотелось сотрудничать тот момент. В-третьих, описал свои 
                компетенции как успешный рабочий кейс. Как результат, сменил работу и переехал, 
                сейчас управляю проектами стоимостью более 100 млрд ₽
            </p>
            <p className='reviews-slider-author'>Богуш Николай, CEO девелоперской компании</p>
          </div>
        </SwiperSlide>

        <SwiperSlide>
          <div className="reviews-slide-content">
             <p className='reviews-slider-text'>блеск супер</p>
          </div>
        </SwiperSlide>

        <SwiperSlide>
          <div className="reviews-slide-content">
            <p className='reviews-slider-text'>очень хороший сайт</p>
          </div>
        </SwiperSlide>
      </Swiper>
    </section>
  );
};

export default ReviewsSlider;