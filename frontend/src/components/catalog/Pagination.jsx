// Pagination.jsx
import '../../css/catalog/Pagination.css'

export default function Pagination({ currentPage, totalPages, onPageChange }) {
  const pages = [];

  // Добавляем первую страницу
  if (currentPage > 3) {
    pages.push(1);
    if (currentPage > 4) {
      pages.push("...");
    }
  }

  // Соседние страницы
  for (let i = currentPage - 1; i <= currentPage + 1; i++) {
    if (i > 0 && i <= totalPages) {
      pages.push(i);
    }
  }

  // Добавляем последнюю страницу
  if (currentPage < totalPages - 2) {
    if (currentPage < totalPages - 3) {
      pages.push("...");
    }
    pages.push(totalPages);
  }

  const handleClick = (page) => {
    if (page !== "..." && page !== currentPage) {
      onPageChange(page);
    }
  };

  return (
    <div className="pagination">
      <button
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
      >
        &lt;&lt; Назад
      </button>

      {pages.map((page, idx) =>
        page === "..." ? (
          <span key={idx} className="dots">
            ...
          </span>
        ) : (
          <button
            key={idx}
            className={page === currentPage ? "active" : ""}
            onClick={() => handleClick(page)}
          >
            {page}
          </button>
        )
      )}

      <button
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
      >
        Вперед &gt;&gt;
      </button>
    </div>
  );
}
