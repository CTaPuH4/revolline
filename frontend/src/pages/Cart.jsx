  import React, { useEffect, useState } from 'react';
  import '../css/Cart.css'
  import deleteIcon from "../assets/icons/delete-icon.png"
  import plusIcon from "../assets/icons/plus.png"
  import minusIcon from "../assets/icons/minus.png"
  import exapmle1 from "../assets/example1.jpg"


  const API_BASE = import.meta.env.VITE_API_BASE;

  export default function Cart() {
    const [items, setItems] = useState([]);
    const [checkedItems, setCheckedItems] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    // local editing values (string) to allow empty input while typing
    const [editQuantities, setEditQuantities] = useState({});

    useEffect(() => {
      // initialize missing entries from items (don't overwrite existing ones while user edits)
      setEditQuantities(prev => {
        const next = { ...prev };
        items.forEach(it => {
          if (next[it.cartItemId] === undefined) next[it.cartItemId] = String(it.quantity);
        });
        return next;
      });
// eslint-disable-next-line react-hooks/exhaustive-deps
    }, [items]);


    // --- promo states ---
    const [promoCode, setPromoCode] = useState('');
    const [applyingPromo, setApplyingPromo] = useState(false);
    const [promo, setPromo] = useState(null); // { code, percent, min_price }
    const [promoError, setPromoError] = useState(null);
  
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
    const handleQtyInputChange = (cartItemId, value) => {
      // allow any string (including empty) while typing
      setEditQuantities(prev => ({ ...prev, [cartItemId]: value }));
    };

    const commitQuantity = (cartItemId) => {
      const raw = editQuantities[cartItemId];
      let num = parseInt(raw, 10);

      if (isNaN(num) || num <= 0) num = 1;
      else if (num > 100) num = 100;

      // normalize displayed value immediately
      setEditQuantities(prev => ({ ...prev, [cartItemId]: String(num) }));

      const item = items.find(i => i.cartItemId === cartItemId);
      if (!item) return;

      // only call server if value actually changed
      if (item.quantity !== num) {
        updateQuantity(cartItemId, num);
      }
    };


    const fetchCart = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await apiFetch('/cart/');
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
        await apiFetch(`/cart/${cartItemId}/`, {
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
      const newQty = item.quantity + 1;
      setEditQuantities(prev => ({ ...prev, [cartItemId]: String(newQty) }));
      updateQuantity(cartItemId, newQty);
    };

    const decrementQty = (cartItemId) => {
      const item = items.find(i => i.cartItemId === cartItemId);
      if (!item || item.quantity <= 1) return;
      const newQty = item.quantity - 1;
      setEditQuantities(prev => ({ ...prev, [cartItemId]: String(newQty) }));
      updateQuantity(cartItemId, newQty);
    };


    const removeItem = async (cartItemId) => {
      const prev = items;
      setItems(prevItems => prevItems.filter(i => i.cartItemId !== cartItemId));
      setCheckedItems(prev => prev.filter(cid => cid !== cartItemId));
      try {
        await apiFetch(`/cart/${cartItemId}/`, { method: 'DELETE' });
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
        await Promise.all(ids.map(id => apiFetch(`/cart/${id}/`, { method: 'DELETE' })));
        // also clear promo when cart cleared
        setPromo(null);
        setPromoCode('');
        setPromoError(null);
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
    const totalPrice = selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0); // full price
    const totalDiscountPrice = selectedItems.reduce((sum, item) => sum + item.discount_price * item.quantity, 0); // after product discounts
    const totalDiscount = totalPrice - totalDiscountPrice;
    const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  
    // promo calculations
    const promoDiscountAmount = promo ? Number((totalDiscountPrice * (promo.percent / 100)).toFixed(2)) : 0;
    const finalPriceWithPromo = promo ? Number((totalDiscountPrice - promoDiscountAmount).toFixed(2)) : totalDiscountPrice;
  
    // --- Promo handlers ---
    const applyPromo = async () => {
      setPromoError(null);
      setError(null);
  
      const code = promoCode.trim();
      if (!code) {
        setPromoError('Введите промокод');
        return;
      }
  
      if (selectedItems.length === 0) {
        setPromoError('Выберите товары, к которым хотите применить промокод');
        return;
      }
  
      setApplyingPromo(true);
      try {
        const data = await apiFetch(`/promo/${encodeURIComponent(code)}/`);
        // data: { code, percent, min_price }
        if (!data || typeof data.percent !== 'number') {
          setPromoError('Неверный ответ от сервера по промокоду');
          setApplyingPromo(false);
          return;
        }
  
        // проверяем минимальную сумму — используем totalDiscountPrice (после product discounts)
        if (totalDiscountPrice < (data.min_price ?? 0)) {
          setPromoError(`Минимальная сумма для промокода: ${data.min_price} ₽`);
          setApplyingPromo(false);
          return;
        }
  
        setPromo({ ...data, code });
        setPromoError(null);
      } catch (err) {
        console.error('applyPromo failed', err);
        if (err.status === 404) {
          setPromoError('Промокод не найден');
        } else {
          setPromoError('Ошибка при проверке промокода');
        }
      } finally {
        setApplyingPromo(false);
      }
    };
  
    const removePromo = () => {
      setPromo(null);
      setPromoError(null);
      // оставляем поле promoCode — пользователь может повторно ввести
    };
  
    // При изменении выбранных товаров — перепроверяем применимость промокода (если уже применён)
    useEffect(() => {
      if (!promo) {
        setPromoError(null);
        return;
      }
      // Если сумма упала ниже min_price — показать ошибку (не автоматически убирать промокод)
      if (totalDiscountPrice < (promo.min_price ?? 0)) {
        setPromoError(`Минимальная сумма для промокода: ${promo.min_price} ₽`);
      } else {
        setPromoError(null);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [checkedItems, items, totalDiscountPrice]);
  
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
                        <button onClick={() => decrementQty(item.cartItemId)} aria-label="Уменьшить">
                          <img src={minusIcon} alt="-"/>
                        </button>

                        <input
                            type="number"
                            min="1"
                            max="100"
                            value={editQuantities[item.cartItemId] ?? String(item.quantity)}
                            onChange={(e) => {
                              // оставляем любую строку, чтобы пользователь мог стереть и ввести новое
                              handleQtyInputChange(item.cartItemId, e.target.value);
                            }}
                            onBlur={() => commitQuantity(item.cartItemId)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                // при Enter подтверждаем (и снимаем фокус)
                                e.currentTarget.blur();
                              } else if (e.key === 'ArrowUp') {
                                e.preventDefault();
                                incrementQty(item.cartItemId);
                              } else if (e.key === 'ArrowDown') {
                                e.preventDefault();
                                decrementQty(item.cartItemId);
                              }
                            }}
                            className="cart-item-qty-input"
                        />

                        <button onClick={() => incrementQty(item.cartItemId)} aria-label="Увеличить">
                          <img src={plusIcon} alt="+"/>
                        </button>
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
              {!promo ? (
                  <>
                    <input
                        type="text"
                        placeholder="Введите промокод"
                        value={promoCode}
                        onChange={(e) => setPromoCode(e.target.value)}
                        disabled={applyingPromo || selectedItems.length === 0}
                    />
                    <button onClick={applyPromo} disabled={applyingPromo || selectedItems.length === 0}>
                      {applyingPromo ? 'Проверка...' : 'OK'}
                    </button>
                  </>
              ) : (
                  <div className="promo-applied">
                    <span>Промокод применён: <strong>{promo.code}</strong> ({promo.percent}% )</span>
                    <button className="remove-promo" onClick={removePromo} title="Удалить промокод">✕</button>
                  </div>
              )}
              {promoError && <p className="promo-error" style={{ color: 'crimson', marginTop: 6 }}>{promoError}</p>}
            </div>
  
            <div className="summary-line">
              <span>Товаров на сумму:</span>
              <span>{totalPrice} ₽</span>
            </div>
  
            <div className="summary-line">
              <span>Ваша скидка (акции):</span>
              <span>-{totalDiscount} ₽</span>
            </div>
  
            {promo && !promoError && (
                <>
                  <div className="summary-line">
                    <span>Промоскидка ({promo.percent}%):</span>
                    <span>-{promoDiscountAmount} ₽</span>
                  </div>
  
                  <hr className="summary-divider" />
                  <div className="summary-total">
                    <span>Итого с промокодом:</span>
                    <span>{finalPriceWithPromo} ₽</span>
                  </div>
                </>
            )}
  
            {!promo && (
                <>
                  <hr className="summary-divider" />
                  <div className="summary-total">
                    <span>Итого:</span>
                    <span>{totalDiscountPrice} ₽</span>
                  </div>
                </>
            )}
  
            <button
                className="checkout-btn"
                disabled={selectedItems.length === 0 || Boolean(promoError)}
                title={selectedItems.length === 0 ? 'Выберите товары' : promoError ? promoError : 'Оформить заказ'}
            >
              Оформить заказ
            </button>
  
            {error && <p className="error">{error}</p>}
          </div>
        </main>
    );
  }
