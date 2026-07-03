import "../../css/home/BannerSlider.css";
import { Navigation, Pagination, Autoplay } from "swiper/modules";
import { Swiper, SwiperSlide } from "swiper/react";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/pagination";

const bannerModules = import.meta.glob("../../assets/banners/*.{jpg,jpeg,png,webp,avif}", {
    eager: true,
    import: "default",
});

const slides = Object.entries(bannerModules)
    .sort(([leftPath], [rightPath]) =>
        leftPath.localeCompare(rightPath, undefined, { numeric: true, sensitivity: "base" }),
    )
    .map(([path, image], index) => ({
        image,
        alt: `Баннер ${index + 1}`,
        key: path,
    }));

const BannerSlider = () => {
    if (slides.length === 0) {
        return null;
    }

    return (
        <section className="banner-slider">
            <Swiper
                modules={[Navigation, Pagination, Autoplay]}
                loop={slides.length > 1}
                autoplay={slides.length > 1 ? { delay: 4000, disableOnInteraction: false } : false}
                pagination={{ clickable: true }}
                navigation={slides.length > 1}
                slidesPerView={1}
                spaceBetween={0}
            >
                {slides.map((slide) => (
                    <SwiperSlide key={slide.key}>
                        <img src={slide.image} alt={slide.alt} className="banner-image" />
                    </SwiperSlide>
                ))}
            </Swiper>
        </section>
    );
};

export default BannerSlider;
