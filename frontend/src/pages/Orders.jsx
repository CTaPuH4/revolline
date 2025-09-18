import React, { useEffect, useState } from 'react';
import '../css/Orders.css';

const API_BASE = import.meta.env.VITE_API_BASE;

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

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
      const list = Array.isArray(data) ? data : [data]; // иногда API может вернуть объект, иногда массив
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

  return (
    <main className="orders-page">
      <h2 className="orders-header">Мои заказы</h2>

      {isLoading && <p>Загрузка...</p>}
      {error && <p className="error">{error}</p>}

      {!isLoading && !error && orders.length === 0 && <p>У вас пока нет заказов.</p>}

      <div className="orders-list">
        {orders.map(order => (
          <div key={order.id} className="order-card">
            <div className="order-main-info">
              <p><strong>Номер заказа:</strong> #{order.id}</p>
              <p><strong>Статус:</strong> {order.status}</p>
              <p><strong>Дата:</strong> {new Date(order.created_at).toLocaleString()}</p>
              <p><strong>Адрес доставки:</strong> {order.shipping_address}</p>
            </div>

            <div className="order-prices">
              <p><strong>Сумма:</strong> {order.total_price} ₽</p>
              {order.promo && <p><strong>Промокод:</strong> {order.promo}</p>}
              {order.final_price && <p><strong>Итого со скидкой:</strong> {order.final_price} ₽</p>}
              {order.payment_link && (
                <a href={order.payment_link} target="_blank" rel="noreferrer" className="pay-link">
                  Оплатить
                </a>
              )}
            </div>

            <div className="order-items">
              <h4>Товары:</h4>
              {order.items.map((it, idx) => (
                <div key={idx} className="order-item">
                  <img
                    src={it.product?.images?.[0]?.image || '/no-image.png'}
                    alt={it.product?.title}
                    className="order-item-img"
                  />
                  <div className="order-item-info">
                    <p>{it.product?.title}</p>
                    <p>Цена: {it.product?.price} ₽</p>
                    {it.product?.discount_price && (
                      <p>Со скидкой: {it.product.discount_price} ₽</p>
                    )}
                    <p>Количество: {it.quantity}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
