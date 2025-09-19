import React, { useEffect, useState } from 'react';
import '../css/Orders.css';

const API_BASE = import.meta.env.VITE_API_BASE;

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // track which orders are expanded (by id)
  const [expandedOrderIds, setExpandedOrderIds] = useState(new Set());

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

  const fetchOrders = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/orders/');
      const list = Array.isArray(data) ? data : [data];
      setOrders(list);
    } catch (err) {
      console.error('fetchOrders error', err);
      setError('Не удалось загрузить заказы');
    } finally {
      setIsLoading(false);
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
      {!isLoading && !error && orders.length === 0 && <p className="orders-empty">У вас пока нет заказов.</p>}

      <div className="orders-list">
        {orders.map(order => {
          const items = Array.isArray(order.items) ? order.items : [];
          const isOpen = expandedOrderIds.has(order.id);

          return (
            <article key={order.id} className="order-card" aria-labelledby={`order-${order.id}-title`}>
              {/* Header: left = order id, right = status + date */}
              <div className="order-card-header">
                <div className="order-left">
                  <div id={`order-${order.id}-title`} className="order-id">
                    Заказ #{order.id}
                  </div>
                </div>

                <div className="order-right">
                  <div><strong>Дата:</strong> {order.created_at ? new Date(order.created_at).toLocaleString() : '—'}</div>
                  <div><strong>Статус:</strong> {order.status || '—'}</div>
                </div>
              </div>

              {/* Body: address, collapsible items */}
              <div className="order-body">
                <div className="order-address">
                  <div><strong>Адрес доставки:</strong> {order.shipping_address || '—'}</div>
                </div>

                <div
                  id={`order-items-${order.id}`}
                  className={`order-items-collapse ${isOpen ? 'open' : ''}`}
                >
                  {items.length === 0 && <p className="orders-info">В этом заказе нет товаров.</p>}

                  {items.map((it, idx) => {
                    const product = it.product || {};
                    const img = product.images?.[0]?.image || '/no-image.png';
                    return (
                      <div key={idx} className="order-item-card">
                        <div className="order-item-img-wrap">
                          <img src={img} alt={product.title || 'Товар'} className="order-item-img" />
                        </div>

                        <div className="order-item-body">
                          <a href={`/product/${product.id}`} className="order-item-title">{product.title || 'Без названия'}</a>
                          <div className="order-item-sub">
                            <span>Цена: {product.discount_price ?? '—'} ₽</span>
                            {product.price && <span className="order-item-oldprice">({product.price} ₽)</span>}
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
      </div>
    </main>
  );
}
