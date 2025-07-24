import banner from '../../assets/banners/banner.jpg'
import '../../css/home/BannerSlider.css'
import { Navigation, Pagination, Autoplay } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import 'swiper/css/pagination';

const BannerSlider = () => (
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
);

export default BannerSlider;