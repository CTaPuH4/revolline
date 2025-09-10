import { useState } from "react";
import sortIcon from "../../assets/icons/sort-icon.png"
import '../../css/catalog/SortDropdown.css'

export default function SortDropdown({ onChange }) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState("none"); // по умолчанию нет сортировки

  const options = [
    { label: "Нет", value: "none", apiValue: "" },
    { label: "По цене (убывание)", value: "price_desc", apiValue: "-price" },
    { label: "По цене (возрастание)", value: "price_asc", apiValue: "price" },
  ];

  const handleSelect = (option) => {
    setSelected(option.value);
    setOpen(false);
    if (onChange) onChange(option.apiValue); // передаем значение для API
  };

  return (
      <div className="sort-container">
        <div className="sort" onClick={() => setOpen(!open)}>
          <img src={sortIcon} alt="sort" />
          <p>
            {selected === "none"
                ? "Сортировка"
                : options.find((opt) => opt.value === selected)?.label}
          </p>
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
            <ul className="sort-dropdown">
              {options.map((opt) => (
                  <li
                      key={opt.value}
                      className={opt.value === selected ? "active" : ""}
                      onClick={() => handleSelect(opt)}
                  >
                    {opt.label}
                  </li>
              ))}
            </ul>
        )}
      </div>
  );
}
