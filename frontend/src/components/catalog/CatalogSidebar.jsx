import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../css/catalog/CatalogDropdown.css";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function CatalogDropdown() {
    const [sections, setSections] = useState([]);
    const [selectedCategory, setSelectedCategory] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchSections = async () => {
            try {
                const response = await fetch(`${API_BASE}/sections/`);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();

                if (Array.isArray(data)) {
                    setSections(data);
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

    if (isLoading) {
        return <div className="dropdown">Загрузка каталога...</div>;
    }

    if (error) {
        return <div className="dropdown">Ошибка: {error}</div>;
    }

    if (sections.length === 0) {
        return <div className="dropdown">Нет доступных разделов</div>;
    }

    const activeSection = sections.find(section => section.slug === selectedCategory) || sections[0];

    const onSectionClick = (section) => {
        // Перейти на страницу раздела
        navigate(`/catalog/${encodeURIComponent(section.slug)}`);
        // Можно также установить превью категории для UX перед переходом
        setSelectedCategory(section.slug);
    };

    return (
        <div className="dropdown">
            <div className="dropdown-left">
                <ul>
                    {sections.map((section) => (
                        <li
                            key={section.slug}
                            className={section.slug === activeSection.slug ? "active" : ""}
                            onMouseEnter={() => setSelectedCategory(section.slug)} // превью по hover
                            onClick={() => onSectionClick(section)} // переход по клику
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSectionClick(section); }}
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

                    {activeSection.categories?.length === 0 && (
                        <li>Нет доступных категорий</li>
                    )}
                </ul>
            </div>
        </div>
    );
}
