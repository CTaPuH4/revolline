import { useState, useEffect } from "react";
import filterIcon from "../../assets/icons/filter-icon.png";
import '../../css/catalog/SortDropdown.css'; // reuse same css file

export default function FilterDropdown({
                                           countries = [],            // массив стран (может быть ["france"] или [{id,slug,name}, ...])
                                           onApply,                   // fn({ country, price_min, price_max })
                                           onReset,                   // optional fn() при сбросе
                                           initial = { country: "", price_min: "", price_max: "" }, // опциональные нач. значения
                                       }) {
    const [open, setOpen] = useState(false);

    const [country, setCountry] = useState(initial.country ?? "");
    const [priceMin, setPriceMin] = useState(initial.price_min ?? "");
    const [priceMax, setPriceMax] = useState(initial.price_max ?? "");

    // Если initial изменится извне — синхронизируем
    useEffect(() => {
        setCountry(initial.country ?? "");
        setPriceMin(initial.price_min ?? "");
        setPriceMax(initial.price_max ?? "");
    }, [initial]);

    const handleApply = () => {
        if (onApply) {
            onApply({
                country: country || "",
                price_min: priceMin === "" ? "" : priceMin,
                price_max: priceMax === "" ? "" : priceMax,
            });
        }
        setOpen(false);
    };

    const handleReset = () => {
        setCountry("");
        setPriceMin("");
        setPriceMax("");
        if (onReset) onReset();
        if (onApply) onApply({ country: "", price_min: "", price_max: "" });
        setOpen(false);
    };

    // helper — безопасно рендерим опции
    const renderCountryOption = (c, idx) => {
        const isString = typeof c === "string";
        const key = isString ? c : (c.id ?? c.slug ?? c.name ?? idx);
        const val = isString ? c : (c.slug ?? c.id ?? c.name ?? String(c));
        const label = isString ? c : (c.name ?? c.slug ?? String(c.id) ?? String(c));
        return (
            <option key={String(key)} value={val || ""}>
                {label}
            </option>
        );
    };

    return (
        <div className="sort-container">
            <div
                className="sort"
                onClick={() => setOpen((s) => !s)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setOpen((s) => !s); }}
                aria-expanded={open}
            >
                <img src={filterIcon} alt="filter" />
                <p>Фильтры</p>
                <svg
                    className={`arrow ${open ? "open" : ""}`}
                    width="20"
                    height="10"
                    viewBox="0 0 10 6"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                >
                    <path
                        d="M1 1L5 5L9 1"
                        stroke="#626161"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                </svg>
            </div>

            {open && (
                <div className="sort-dropdown" style={{ minWidth: 260 }}>
                    <div className="filter-row">
                        <label className="filter-label">Страна</label>
                        <select value={country} onChange={(e) => setCountry(e.target.value)}>
                            <option value="">Все страны</option>
                            {countries.map((c, i) => renderCountryOption(c, i))}
                        </select>
                    </div>

                    <div className="filter-row price-row">
                        <label className="filter-label">Цена</label>
                        <input
                            type="number"
                            min="0"
                            placeholder="Мин"
                            value={priceMin}
                            onChange={(e) => setPriceMin(e.target.value)}
                        />
                        <input
                            type="number"
                            min="0"
                            placeholder="Макс"
                            value={priceMax}
                            onChange={(e) => setPriceMax(e.target.value)}
                        />
                    </div>

                    <div className="filter-actions" style={{ marginTop: 8 }}>
                        <button className="btn btn-reset" onClick={handleReset} type="button">
                            Сбросить
                        </button>
                        <button className="btn btn-apply" onClick={handleApply} type="button">
                            Применить
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
