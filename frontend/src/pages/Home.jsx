import { useEffect } from 'react';
import '../css/home/Home.css';
import ReviewsSlider from '../components/home/ReviewsSlider';
import Advantages from '../components/home/Advantages';
import BannerSlider from '../components/home/BannerSlider';
import Offer from '../components/home/Offer';
import Shops from '../components/home/Shops';

export default function Home() {
  useEffect(() => {
    document.title = 'ReVolline — Главная';
  }, []);

  return (
    <main>
      <BannerSlider/> {/* Блок баннеров */}
      <Advantages/> {/* Блок с достижениями */}
      <Shops/> {/* Ссылки на магазины */}
      <section className='reviews'> {/* Блок отзывов */}
        <p className='reviews-title'>Отзывы</p>
        <ReviewsSlider/>
      </section>
      <Offer/>
      
    </main>
  );
}