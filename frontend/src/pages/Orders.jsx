import React, { useEffect, useState, useRef, useCallback } from 'react';
import '../css/Orders.css';

const API_BASE = import.meta.env.VITE_API_BASE;

// Словарь для перевода буквенного кода статуса в текстовое описание
const statusMap = {
  'N': 'Создан',
  'P': 'Оплачен',
  'S': 'Отправлен',
  'C': 'Отменён'
};

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [nextPage, setNextPage] = useState(null);
  const [hasMore, setHasMore] = useState(true);

  // track which orders are expanded (by id)
  const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());

  const observer = useRef();

  const lastOrderElementRef = useCallback(node => {
    if (isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchOrders(currentPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [isLoadingMore, hasMore, currentPage]);

  const apiFetch = async (path, options = {}) => {
    const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
    const opts = {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...options,
    };
    const res = await fetch(url, opts);
    if (!res.ok) {
      const text = await res.text();
      const err = new Error(`HTTP ${res.status}: ${text}`);
      err.status = res.status;
      throw err;
    }
    if (res.status === 204) return null;
    try {
      return await res.json();
    } catch (e) {
      return null;
    }
  };

  const fetchOrders = async (page = 1) => {
    if (page === 1) {
      setIsLoading(true);
    } else {
      setIsLoadingMore(true);
    }
    setError(null);
    try {
      const data = await apiFetch(`/orders/?page=${page}`);
      const newOrders = data.results || [];
      setOrders(prevOrders => page === 1 ? newOrders : [...prevOrders, ...newOrders]);
      setNextPage(data.next);
      setHasMore(!!data.next);
      setCurrentPage(page);
    } catch (err) {
      console.error('fetchOrders error', err);
      setError('Не удалось загрузить заказы');
    } finally {
      if (page === 1) {
        setIsLoading(false);
      } else {
        setIsLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const toggleOrder = (orderId) => {
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  return (
      <main className="orders-container">
        <h2 className="orders-header">Мои заказы</h2>

        {isLoading && <p className="orders-info">Загрузка...</p>}
        {error && <p className="orders-error">{error}</p>}
        {!isLoading && !error && orders.length === 0 && (
            <div className="orders-empty-placeholder">
              <p className="orders-empty">Пока нет заказов</p>
              <p className="orders-suggestion">Давайте пойдём за покупками!</p>
              <a href="/catalog" className="order-toggle-btn placeholder-btn">
                Перейти в каталог
              </a>
            </div>
        )}

        <div className="orders-list">
          {orders.map((order, index) => {
            const items = Array.isArray(order.items) ? order.items : [];
            const isOpen = expandedOrderIds.has(order.id);

            // Определяем текстовое представление статуса
            const statusText = statusMap[order.status] || order.status || '—';

            const isLastElement = orders.length === index + 1;

            return (
                <article
                    ref={isLastElement ? lastOrderElementRef : null}
                    key={order.id}
                    className="order-card"
                    aria-labelledby={`order-${order.id}-title`}
                >
                  {/* Header: left = order id, right = status + date */}
                  <div className="order-card-header">
                    <div className="order-left">
                      <div id={`order-${order.id}-title`} className="order-id">
                        Заказ #{order.id}
                      </div>
                    </div>

                    <div className="order-right">
                      <div><strong>Дата:</strong> {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}</div>
                      <div><strong>Статус:</strong> {statusText}</div>
                    </div>
                  </div>

                  {/* Body: address, promo, tracking_number, collapsible items */}
                  <div className="order-body">
                    <div className="order-address">
                      {order.shipping_address && (
                          <div><strong>Адрес доставки:</strong> {order.shipping_address}</div>
                      )}
                      {order.promo && (
                          <div><strong>Промокод:</strong> {order.promo}</div>
                      )}
                      {order.tracking_number && (
                          <div><strong>Трек-номер:</strong> {order.tracking_number}</div>
                      )}
                    </div>

                    <div
                        id={`order-items-${order.id}`}
                        className={`order-items-collapse ${isOpen ? 'open' : ''}`}
                    >
                      {items.length === 0 && <p className="orders-info">В этом заказе нет товаров.</p>}

                      {items.map((it, idx) => {
                        const product = it.product || {};
                        const img = product.image || '/no-image.png';
                        return (
                            <div key={idx} className="order-item-card">
                              <div className="order-item-img-wrap">
                                <img src={img} alt={product.title || 'Товар'} className="order-item-img" />
                              </div>

                              <div className="order-item-body">
                                <a href={`/product/${product.id}`} className="order-item-title">{product.title || 'Без названия'}</a>
                                <div className="order-item-sub">
                                  <span>•</span>
                                  <span>Кол-во: {it.quantity}</span>
                                </div>
                              </div>
                            </div>
                        );
                      })}
                    </div>

                    <div className="order-footer">
                      <div className="order-total"><strong>Сумма:</strong> {order.total_price ?? '—'} ₽</div>
                      {order.status === 'N' && order.payment_link && (
                          <a href={order.payment_link} className="order-toggle-btn" target="_blank" rel="noopener noreferrer">
                            Оплатить
                          </a>
                      )}
                      <button
                          type="button"
                          className="order-toggle-btn"
                          onClick={() => toggleOrder(order.id)}
                          aria-expanded={isOpen}
                          aria-controls={`order-items-${order.id}`}
                          title={isOpen ? 'Свернуть товары' : 'Показать товары'}
                      >
                        <span>{isOpen ? 'Скрыть товары' : `Товаров: ${items.length}`}</span>
                        <span className={`chev ${isOpen ? 'open' : ''}`} aria-hidden="true">▾</span>
                      </button>
                    </div>
                  </div>
                </article>
            );
          })}
          {isLoadingMore && hasMore && (
              <div className="loader-container">
                <div className="loader"></div>
                <p className="orders-info">Загрузка дополнительных заказов...</p>
              </div>
          )}
        </div>
      </main>
  );
}