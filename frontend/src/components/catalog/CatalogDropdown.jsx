import React, { forwardRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../../css/catalog/CatalogDropdown.css";

const API_BASE = import.meta.env.VITE_API_BASE;

const CatalogDropdown = forwardRef((props, ref) => {
    const [sections, setSections] = React.useState([]);
    const [selectedCategory, setSelectedCategory] = React.useState(null);
    const [isTransitioning, setIsTransitioning] = React.useState(false);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState(null);
    const navigate = useNavigate();

    React.useEffect(() => {
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
        return <div ref={ref} className="dropdown">Загрузка каталога...</div>;
    }

    if (error) {
        return <div ref={ref} className="dropdown">Ошибка: {error}</div>;
    }

    if (sections.length === 0) {
        return <div ref={ref} className="dropdown">Нет доступных разделов</div>;
    }

    const activeSection = sections.find(section => section.slug === selectedCategory) || sections[0];

    const onSectionClick = (section) => {
        // Перейти на страницу раздела
        navigate(`/catalog/${encodeURIComponent(section.slug)}`);
        // Можно также установить превью категории для UX перед переходом
        setSelectedCategory(section.slug);
    };

    const onSectionHover = (section) => {
        if (selectedCategory === section.slug) return;
        setIsTransitioning(true);
        setTimeout(() => {
            setSelectedCategory(section.slug);
            setIsTransitioning(false);
        }, 300); // Длительность анимации fade out
    };

    return (
        <div ref={ref} className="dropdown">
            <div className="dropdown-left">
                <ul>
                    {sections.map((section) => (
                        <li
                            key={section.slug}
                            className={section.slug === activeSection.slug ? "active" : ""}
                            onMouseEnter={() => onSectionHover(section)} // анимация превью по hover
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

            <div className={`dropdown-right ${isTransitioning ? "transitioning" : ""}`}>
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
});

export default CatalogDropdown;