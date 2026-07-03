import { useEffect } from "react";
import "../css/home/Home.css";
import ReviewsSlider from "../components/home/ReviewsSlider";
import Advantages from "../components/home/Advantages";
import BannerSlider from "../components/home/BannerSlider";
import Offer from "../components/home/Offer";
import Shops from "../components/home/Shops";

export default function Home() {
    useEffect(() => {
        document.title = "ReVolline — Главная";
    }, []);

    return (
        <main>
            <BannerSlider />
            <Advantages />
            <Shops />
            <section className="reviews">
                <p className="reviews-title">Отзывы клиентов и партнёров</p>
                <ReviewsSlider />
            </section>
            <Offer />
        </main>
    );
}
