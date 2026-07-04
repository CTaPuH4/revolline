import React, { useEffect, useState, useRef, useCallback } from 'react';
import '../css/Orders.css';
import { useAuth } from '../context/AuthContext';

// Словарь для перевода буквенного кода статуса в текстовое описание
const statusMap = {
  'N': 'Создан',
  'P': 'Оплачен',
  'S': 'Отправлен',
  'C': 'Отменён'
};

const paymentStatusMap = {
  pending: 'платёж создаётся',
  link_created: 'ссылка на оплату создана',
  paid: 'оплачен',
  expired: 'истёк',
  failed: 'ошибка оплаты',
  unknown: 'требует сверки',
  refunding: 'возврат выполняется',
  refunded: 'возвращён',
};

const retryablePaymentStatuses = new Set(['expired', 'failed']);

const createIdempotencyKey = () => {
  if (window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const value = Math.floor(Math.random() * 16);
    const result = char === 'x' ? value : (value & 0x3) | 0x8;
    return result.toString(16);
  });
};

export default function Orders() {
  const { authFetch, isAuthenticated } = useAuth();
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [retryingOrderId, setRetryingOrderId] = useState(null);
  const [retryErrors, setRetryErrors] = useState({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  // track which orders are expanded (by id)
  const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());

  const observer = useRef();

  const apiFetch = useCallback(async (path, options = {}) => {
    return authFetch(path, options);
  }, [authFetch]);

  const fetchOrders = useCallback(async (page = 1) => {
    if (!isAuthenticated) {
      setOrders([]);
      setHasMore(false);
      setCurrentPage(1);
      setIsLoading(false);
      setIsLoadingMore(false);
      return;
    }

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
  }, [apiFetch, isAuthenticated]);

  const lastOrderElementRef = useCallback(node => {
    if (isLoadingMore) return;
    if (observer.current) observer.current.disconnect();
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        fetchOrders(currentPage + 1);
      }
    });
    if (node) observer.current.observe(node);
  }, [fetchOrders, isLoadingMore, hasMore, currentPage]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const toggleOrder = (orderId) => {
    setExpandedOrderIds(prev => {
      const next = new Set(prev);
      if (next.has(orderId)) next.delete(orderId);
      else next.add(orderId);
      return next;
    });
  };

  const handleRetryPayment = async (order) => {
    if (!order?.id || retryingOrderId) return;

    setRetryingOrderId(order.id);
    setRetryErrors(prev => ({ ...prev, [order.id]: null }));

    try {
      const data = await apiFetch(`/orders/${order.id}/retry-payment/`, {
        method: 'POST',
        headers: {
          'Idempotency-Key': createIdempotencyKey(),
        },
      });

      setOrders(prevOrders => prevOrders.map(prevOrder => (
        prevOrder.id === order.id
          ? {
              ...prevOrder,
              payment_status: data?.payment_status ?? prevOrder.payment_status,
              payment_link: data?.payment_link ?? prevOrder.payment_link,
            }
          : prevOrder
      )));

      if (data?.payment_link) {
        window.location.href = data.payment_link;
        return;
      }

      await fetchOrders(1);
      setRetryErrors(prev => ({
        ...prev,
        [order.id]: data?.detail || 'Платёж создаётся. Обновите страницу чуть позже.',
      }));
    } catch (err) {
      console.error('retryPayment error', err);
      await fetchOrders(1);
      setRetryErrors(prev => ({
        ...prev,
        [order.id]: 'Не удалось создать повторную оплату. Попробуйте позже или обратитесь в поддержку.',
      }));
    } finally {
      setRetryingOrderId(null);
    }
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
            const paymentStatusText = paymentStatusMap[order.payment_status] || order.payment_status || '—';
            const canRetryPayment = retryablePaymentStatuses.has(order.payment_status);
            const isRetrying = retryingOrderId === order.id;
            const retryError = retryErrors[order.id];

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
                      <div><strong>Оплата:</strong> {paymentStatusText}</div>
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
                        const title = it.product_title || product.title || 'Без названия';
                        const unitPrice = it.unit_price ?? product.price;
                        const oldUnitPrice = it.old_unit_price ?? null;
                        return (
                            <div key={idx} className="order-item-card">
                              <div className="order-item-img-wrap">
                                <img src={img} alt={title} className="order-item-img" />
                              </div>

                              <div className="order-item-body">
                                <a href={`/product/${product.id}`} className="order-item-title">{title}</a>
                                <div className="order-item-sub">
                                  <span>•</span>
                                  <span>Кол-во: {it.quantity}</span>
                                  {unitPrice && <span>{unitPrice} ₽</span>}
                                  {oldUnitPrice && <span>{oldUnitPrice} ₽ без скидки</span>}
                                </div>
                              </div>
                            </div>
                        );
                      })}
                    </div>

                    <div className="order-footer">
                      <div className="order-total"><strong>Сумма:</strong> {order.total_price ?? '—'} ₽</div>
                      <div className="order-actions">
                      {order.payment_status === 'link_created' && order.payment_link && (
                          <a href={order.payment_link} className="order-toggle-btn" target="_blank" rel="noopener noreferrer">
                            Оплатить
                          </a>
                      )}
                      {canRetryPayment && (
                          <button
                              type="button"
                              className="order-toggle-btn"
                              onClick={() => handleRetryPayment(order)}
                              disabled={isRetrying}
                          >
                            {isRetrying ? 'Создаём ссылку...' : 'Оплатить повторно'}
                          </button>
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
                    {retryError && (
                        <p className="orders-error order-retry-error">{retryError}</p>
                    )}
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
