import { Link } from "react-router-dom";
import CdekWidgetReact from "../components/CdekWidgetReact.jsx";

export default function Home() {
    const YANDEX_KEY = import.meta.env.VITE_YANDEX_API_KEY;
    const SERVICE_PHP = import.meta.env.VITE_CDEK_SERVICE_PATH;
    return (
        <>
            {/* Простой блок-информер — только если чего-то не хватает */}
            {(!YANDEX_KEY || !SERVICE_PHP) && (
                <div
                    style={{
                        margin: "16px 0",
                        padding: 12,
                        borderRadius: 10,
                        background: "#fff7f7",
                        border: "1px solid rgba(220,20,60,0.08)",
                        color: "#b00020",
                        fontFamily: "CarismaClassic, sans-serif",
                    }}
                >
                    <strong>Внимание:</strong>{" "}
                    {!YANDEX_KEY && (
                        <>
                            Не указан Yandex API key. Получите ключ в кабинете разработчика Яндекса и
                            добавьте в <code>REACT_APP_YANDEX_API_KEY</code>.
                            <br/>
                        </>
                    )}
                    {!SERVICE_PHP && (
                        <>
                            Не указан адрес <code>service.php</code>. Разместите файл service.php на PHP-сервере
                            (не используйте raw GitHub URL) и добавьте его URL
                            в <code>REACT_APP_CDEK_SERVICE_PATH</code>.
                            <br/>
                        </>
                    )}
                    После добавления перезапустите сборку/сервер разработки.
                </div>
            )}

            {/* CDEK widget — передаём apiKey и servicePath. Если пустые — компонент логгирует ошибку сам. */}
            <CdekWidgetReact
                apiKey={YANDEX_KEY}
                servicePath={SERVICE_PHP}
                defaultLocation="Москва"
                onShippingSelect={(payload) => {
                    // payload: структура зависит от виджета — обычно есть price, tariff, pvz и т.д.
                    console.log("Selected shipping payload:", payload);

                    // Пример обработки (вставьте в ваш state/контекст):
                    // if (payload?.price) setShippingPrice(payload.price);
                    // setSelectedShipping(payload);
                }}
            />

            {/* Доп. ссылки/инструкция для тестирования (опционально) */}
            <div style={{marginTop: 12, fontFamily: "CarismaClassic, sans-serif", color: "#666"}}>
                <p style={{margin: "6px 0"}}>
                    Быстрая проверка:
                </p>
                <ul style={{margin: "6px 0 12px 20px"}}>
                    <li>service.php должен быть доступен по HTTPS и возвращать JSON (не исходник PHP).</li>
                    <li>Yandex API key должен быть активен и иметь правильный HTTP referrer (ваш домен).</li>
                </ul>

                <p style={{margin: "6px 0"}}>
                    Если хотите — подставлю сюда пример тестового файла .env или помогу диагностировать ответ
                    service.php.
                </p>
            </div>
        </>
    );
}
const CartItem = () => {
    <></>
}
