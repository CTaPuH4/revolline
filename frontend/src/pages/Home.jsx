import { useEffect } from 'react';
import '../css/Home.css';
import { Swiper, SwiperSlide } from 'swiper/react';
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import banner from '../assets/banners/banner.jpg'
import quality from '../assets/icons/quality-icon.svg'
import work from '../assets/icons/work-icon.svg'
import service from '../assets/icons/service-icon.svg'

import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

export default function Home() {
  useEffect(() => {
    document.title = 'ReVonline — Главная';
  }, []);

  return (
    <main className='page'>
      <section className="banner-slider">
        <Swiper
          modules={[Navigation, Pagination, Autoplay]}
          loop={true}
          autoplay={{ delay: 4000, disableOnInteraction: false }}
          pagination={{ clickable: true }}
          navigation
          slidesPerView={1}
          spaceBetween={0}
        >
          <SwiperSlide>
            <img src={banner} alt="Баннер 1" className="banner-image" />
          </SwiperSlide>
          <SwiperSlide>
            <img src={banner} alt="Баннер 2" className="banner-image" />
          </SwiperSlide>
          <SwiperSlide>
            <img src={banner} alt="Баннер 3" className="banner-image" />
          </SwiperSlide>
        </Swiper>
      </section>
      <section className="advantages">
        <div>
          <img src={quality} alt="Иконка 1" className="icon" />
          <h3>Высший уровень качества</h3>
          <p>Соответствие международным стандартам качества, 
            подтвержденное сертификатами</p>
        </div>
        <div>
          <img src={work} alt="Иконка 1" className="icon" />
          <h3>Десятилетия успешной работы</h3>
          <p>Опыт, проверенный 20+ годами на рынке</p>
        </div>
        <div>
          <img src={service} alt="Иконка 1" className="icon" />
          <h3>Эталонный сервис</h3>
          <p>Цифры говорят сами за себя: 500 тыс. B2C и 120+ B2B-клиентов</p>
        </div>
      </section>
    </main>
  );
}