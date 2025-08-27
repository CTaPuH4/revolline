import React, { useEffect, useState } from 'react';
import '../css/Cart.css'
import deleteIcon from "../assets/icons/delete-icon.png"
import plusIcon from "../assets/icons/plus.png"
import minusIcon from "../assets/icons/minus.png"
import exapmle1 from "../assets/example1.jpg"
import exapmle2 from "../assets/example2.jpg"

// В этой версии явно прописан BASE URL API — чтобы fetch уходил на backend, а не на dev-server (5173).
const API_BASE = 'http://127.0.0.1:8000'; // <- полный путь к бэку

export default function Cart() {
  const [items, setItems] = useState([]);
  const [checkedItems, setCheckedItems] = useState([]);
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

  const transformServerItem = (serverItem) => {
    const product = serverItem.product_data || serverItem.product || {};
    const firstImageObj = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null;
    const image = (firstImageObj && (firstImageObj.image || firstImageObj.url)) || product.image || exapmle1;

    return {
      cartItemId: serverItem.id,
      productId: product.id,
      title: product.title || product.name || 'Без названия',
      type: product.type || '',
      price: product.price ?? 0,
      discount_price: product.discount_price ?? product.price ?? 0,
      quantity: serverItem.quantity ?? 1,
      image,
    };
  };

  const fetchCart = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiFetch('/api/cart/');
      const list = Array.isArray(data) ? data : data.results || [];
      const transformed = list.map(transformServerItem);
      setItems(transformed);
      setCheckedItems(transformed.map(i => i.cartItemId));
    } catch (err) {
      console.error('fetchCart error', err);
      setError('Не удалось загрузить корзину');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
  }, []);

  const updateQuantity = async (cartItemId, newQty) => {
    setItems(prev => prev.map(it => it.cartItemId === cartItemId ? { ...it, quantity: newQty } : it));
    try {
      await apiFetch(`/api/cart/${cartItemId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: newQty }),
      });
    } catch (err) {
      console.error('updateQuantity failed', err);
      setError('Не удалось обновить количество. Загружаю актуальные данные.');
      fetchCart();
    }
  };

  const incrementQty = (cartItemId) => {
    const item = items.find(i => i.cartItemId === cartItemId);
    if (!item) return;
    updateQuantity(cartItemId, item.quantity + 1);
  };

  const decrementQty = (cartItemId) => {
    const item = items.find(i => i.cartItemId === cartItemId);
    if (!item || item.quantity <= 1) return;
    updateQuantity(cartItemId, item.quantity - 1);
  };

  const removeItem = async (cartItemId) => {
    const prev = items;
    setItems(prevItems => prevItems.filter(i => i.cartItemId !== cartItemId));
    setCheckedItems(prev => prev.filter(cid => cid !== cartItemId));
    try {
      await apiFetch(`/api/cart/${cartItemId}/`, { method: 'DELETE' });
    } catch (err) {
      console.error('removeItem failed', err);
      setError('Не удалось удалить товар. Попробуйте снова.');
      setItems(prev);
    }
  };

  const clearCart = async () => {
    if (items.length === 0) return;
    setIsLoading(true);
    setError(null);
    const ids = items.map(i => i.cartItemId);
    const prev = items;
    setItems([]);
    setCheckedItems([]);
    try {
      await Promise.all(ids.map(id => apiFetch(`/api/cart/${id}/`, { method: 'DELETE' })));
    } catch (err) {
      console.error('clearCart failed', err);
      setError('Не удалось очистить корзину полностью.');
      setItems(prev);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCheck = (cartItemId) => {
    setCheckedItems(prev => prev.includes(cartItemId) ? prev.filter(cid => cid !== cartItemId) : [...prev, cartItemId]);
  };

  const selectedItems = items.filter(item => checkedItems.includes(item.cartItemId));
  const totalPrice = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalDiscountPrice = selectedItems.reduce((sum, item) => sum + item.discount_price * item.quantity, 0);
  const totalDiscount = totalPrice - totalDiscountPrice;
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const addToCart = async (productId, quantity = 1) => {
    try {
      const data = await apiFetch('/api/cart/', {
        method: 'POST',
        body: JSON.stringify({ product: productId, quantity }),
      });
      if (data && (data.id || data.product_data)) {
        if (!data.id) {
          await fetchCart();
          return;
        }
        const transformed = transformServerItem(data);
        setItems(prev => [...prev, transformed]);
        setCheckedItems(prev => [...prev, transformed.cartItemId]);
      } else {
        await fetchCart();
      }
    } catch (err) {
      console.error('addToCart failed', err);
      setError('Не удалось добавить товар в корзину.');
    }
  };

  return (
      <main className='cart-page'>
        {/* UI остался без изменений */}
        <div className='cart-products cart-box'>
          <div className="cart-header-row">
            <h2 className='cart-header'>
              Товары
              <sup className="cart-items-count">{totalCount}</sup>
            </h2>
            <button className="cart-clear-btn icon-button" onClick={clearCart} data-tooltip="Очистить корзину" disabled={isLoading}>
              <img src={deleteIcon} alt="Очистить корзину" />
            </button>
          </div>

          <div className="cart-items">
            {isLoading && <p>Загрузка...</p>}
            {!isLoading && items.length === 0 && <p className="empty-cart">Корзина пуста</p>}

            {!isLoading && items.map(item => (
                <div key={item.cartItemId} className="cart-item">
                  <label className="custom-checkbox">
                    <input
                        type="checkbox"
                        checked={checkedItems.includes(item.cartItemId)}
                        onChange={() => handleCheck(item.cartItemId)}
                    />
                    <span className="checkmark"></span>
                  </label>

                  {/* Обёрнуты в ссылку на страницу товара */}
                  <a href={`/product/${item.productId}`} className="cart-item-link">
                    <img src={item.image} alt={item.title} className="cart-item-img" />
                  </a>

                  <div className="cart-item-info">
                    <h3 className="cart-item-title">
                      <a href={`/product/${item.productId}`} className="cart-item-title-link">{item.title}</a>
                    </h3>
                    <p className="cart-item-type">{item.type}</p>
                    <div className="cart-item-prices">
                      <span className="cart-item-price">{item.discount_price} ₽</span>
                      <span className="cart-item-oldprice">{item.price} ₽</span>
                    </div>

                    <div className="cart-item-qty">
                      <button onClick={() => decrementQty(item.cartItemId)}>
                        <img src={minusIcon} alt="-" />
                      </button>
                      <span>{item.quantity}</span>
                      <button onClick={() => incrementQty(item.cartItemId)}>
                        <img src={plusIcon} alt="+" />
                      </button>
                    </div>

                    <div style={{ marginTop: 8 }}>
                      {/* favorites actions are omitted here for brevity */}
                    </div>
                  </div>

                  <button className="cart-item-remove" onClick={() => removeItem(item.cartItemId)}>×</button>
                </div>
            ))}
          </div>
        </div>

        <div className='cart-summary cart-box'>
          <div className="summary-header">
            <h2 className='cart-header'>Итог заказа</h2>
            <span className="items-count">{selectedItems.reduce((sum, item) => sum + item.quantity, 0)}</span>
          </div>

          <div className="promo-code">
            <input type="text" placeholder="Введите промокод" />
            <button>OK</button>
          </div>

          <div className="summary-line">
            <span>Товаров на сумму:</span>
            <span>{totalPrice} ₽</span>
          </div>

          <div className="summary-line">
            <span>Ваша скидка:</span>
            <span>-{totalDiscount} ₽</span>
          </div>

          <hr className="summary-divider" />

          <div className="summary-total">
            <span>Итого:</span>
            <span>{totalDiscountPrice} ₽</span>
          </div>

          <button className="checkout-btn">Оформить заказ</button>

          {error && <p className="error">{error}</p>}
        </div>
      </main>
  );
}
