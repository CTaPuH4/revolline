import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import "../../css/catalog/CatalogDropdown.css";

export default function CatalogDropdown() {
    const [sections, setSections] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchSections = async () => {
            try {
                const response = await fetch("http://127.0.0.1:8000/api/sections/");
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                // Гарантируем, что данные - массив
                if (Array.isArray(data)) {
                    setSections(data);
                    // Устанавливаем первый раздел при наличии данных
                    if (data.length > 0) {
                        setSelectedCategory(data[0].slug);
                    }
                } else {
                    throw new Error("Invalid API response: expected array");
                }
            } catch (err) {
                console.error("Ошибка загрузки разделов:", err);
                setError(err.message);
                setSections([]);
            } finally {
                setIsLoading(false);
            }
        };

        fetchSections();
    }, []);

    // Обработка состояний загрузки и ошибок
    if (isLoading) {
        return <div className="dropdown">Загрузка каталога...</div>;
    }

    if (error) {
        return <div className="dropdown">Ошибка: {error}</div>;
    }

    // Если нет разделов
    if (sections.length === 0) {
        return <div className="dropdown">Нет доступных разделов</div>;
    }

    // Находим активный раздел
    const activeSection = sections.find(section => section.slug === selectedCategory) || sections[0];

    return (
        <div className="dropdown">
            <div className="dropdown-left">
                <ul>
                    {sections.map((section) => (
                        <li
                            key={section.slug}
                            className={section.slug === activeSection.slug ? "active" : ""}
                            onClick={() => setSelectedCategory(section.slug)} // клик вместо hover
                        >
                            {section.title}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="dropdown-right">
                <ul>
                    {activeSection.categories?.map((cat) => (
                        <li key={cat.slug}>
                            <Link to={`/catalog/${activeSection.slug}/${cat.slug}`}>
                                {cat.title}
                            </Link>
                        </li>
                    ))}

                    {/* Запасной вариант при отсутствии категорий */}
                    {activeSection.categories?.length === 0 && (
                        <li>Нет доступных категорий</li>
                    )}
                </ul>
            </div>
        </div>
    );
}