import "../../css/home/ReviewsSlider.css";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";

const reviews = [
    {
        text: "Красивые рабочие оттенки, приятные текстуры и аккуратная упаковка. Хорошо продаются как в наборах, так и поштучно.",
        author: "Марина, розничный покупатель",
    },
    {
        text: "Быстро согласовали поставку, получили понятные материалы по ассортименту и спокойно ввели товары в продажу.",
        author: "Екатерина, менеджер по закупкам",
    },
    {
        text: "Понравилось, что описания и оттенки совпадают с ожиданием. Продукты удобно брать на подарок и для повседневной косметички.",
        author: "Ольга, постоянный клиент",
    },
];

const ReviewsSlider = () => {
    return (
        <section className="reviews-slider">
            <Swiper
                modules={[Pagination]}
                loop
                pagination={{ clickable: true }}
                slidesPerView={1}
                spaceBetween={0}
            >
                {reviews.map((review) => (
                    <SwiperSlide key={review.author}>
                        <div className="reviews-slide-content">
                            <p className="reviews-slider-text">{review.text}</p>
                            <p className="reviews-slider-author">{review.author}</p>
                        </div>
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    );
};

export default ReviewsSlider;
