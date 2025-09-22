import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import '../css/Cart.css';
import "../css/UserProfile.css";
import deleteIcon from "../assets/icons/delete-icon.png";
import plusIcon from "../assets/icons/plus.png";
import minusIcon from "../assets/icons/minus.png";
import exapmle1 from "../assets/example1.jpg";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../modals/Auth/AuthModal";
import CdekWidgetReact from "../components/CdekWidgetReact.jsx";

const API_BASE = import.meta.env.VITE_API_BASE;

export default function Cart() {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editQuantities, setEditQuantities] = useState({});

  // --- promo states ---
  const [promoCode, setPromoCode] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promo, setPromo] = useState(null);
  const [promoError, setPromoError] = useState(null);

  // --- checkout UI state ---
  const [isCheckout, setIsCheckout] = useState(false);
  const [showAuth, setShowAuth] = useState(false);

  // --- selected payload ---
  const [selectedShippingPayload, setSelectedShippingPayload] = useState(null);

  // --- validation/errors ---
  const [fieldErrors, setFieldErrors] = useState({});
  const [checkoutError, setCheckoutError] = useState(null);
  const [creatingOrder, setCreatingOrder] = useState(false);

  // -------------------------
  // helper: normalize backend keys/texts (handles keys/texts with weird spaces)
  // -------------------------
  const normalizeBackendKey = (key) => {
    if (!key) return '';
    return String(key).replace(/\s+/g, '').toLowerCase();
  };

  const normalizeErrorText = (text) => {
    if (text == null) return '';
    let t = String(text).trim();
    // collapse repeating whitespace
    t = t.replace(/\s+/g, ' ');
    // heuristic: if the string contains an unusually high ratio of spaces (likely letters separated by spaces),
    // remove all spaces to restore words
    const spaces = (t.match(/ /g) || []).length;
    const ratio = t.length > 0 ? spaces / t.length : 0;
    if (ratio > 0.35) {
      t = t.replace(/ /g, '');
    }
    return t;
  };

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
      try {
        const body = text ? JSON.parse(text) : null;
        const err = new Error(`HTTP ${res.status}`);
        err.status = res.status;
        err.body = body;
        throw err;
      } catch {
        const err = new Error(`HTTP ${res.status}: ${text}`);
        err.status = res.status;
        err.body = text;
        throw err;
      }
    }

    if (res.status === 204) return null;

    try {
      return await res.json();
    } catch {
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

  // --- Quantity handlers ---
  const handleQtyInputChange = (cartItemId, value) => {
    setEditQuantities(prev => ({ ...prev, [cartItemId]: value }));
  };

  const commitQuantity = (cartItemId) => {
    const raw = editQuantities[cartItemId];
    let num = parseInt(raw, 10);

    if (isNaN(num) || num <= 0) num = 1;
    else if (num > 100) num = 100;

    setEditQuantities(prev => ({ ...prev, [cartItemId]: String(num) }));

    const item = items.find(i => i.cartItemId === cartItemId);
    if (!item) return;

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

      // инициализируем editQuantities чтобы инпуты были синхронизированы
      const initialEdit = {};
      transformed.forEach(it => { initialEdit[it.cartItemId] = String(it.quantity); });
      setEditQuantities(initialEdit);
    } catch (err) {
      console.error('fetchCart error', err);
      setError('Не удалось загрузить корзину');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCart();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    try {
      await Promise.all(ids.map(id => apiFetch(`/cart/${id}/`, { method: 'DELETE' })));
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

  // --- Totals and promo ---
  const totalPrice = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const totalDiscountPrice = items.reduce((sum, item) => sum + item.discount_price * item.quantity, 0);
  const totalDiscount = totalPrice - totalDiscountPrice;
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const promoDiscountAmount = promo ? Number((totalDiscountPrice * (promo.percent / 100)).toFixed(2)) : 0;
  const finalPriceWithPromo = promo ? Number((totalDiscountPrice - promoDiscountAmount).toFixed(2)) : totalDiscountPrice;

  const applyPromo = async () => {
    setPromoError(null);
    setError(null);

    const code = promoCode.trim();
    if (!code) {
      setPromoError('Введите промокод');
      return;
    }

    if (items.length === 0) {
      setPromoError('Корзина пуста');
      return;
    }

    setApplyingPromo(true);
    try {
      const data = await apiFetch(`/promo/${encodeURIComponent(code)}/`);
      if (!data || typeof data.percent !== 'number') {
        setPromoError('Неверный ответ от сервера по промокоду');
        setApplyingPromo(false);
        return;
      }

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
  };

  // --- Checkout form states ---
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [patronymic, setPatronymic] = useState('');
  const [phone, setPhone] = useState('+7');

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
      setPatronymic(user.patronymic || '');
      const rawPhone = user.phone ?? '';
      const digits = String(rawPhone).replace(/\D/g, "");
      let rest = "";
      if (digits.length === 0) rest = "";
      else if (digits.startsWith("8") || digits.startsWith("7")) rest = digits.slice(1);
      else rest = digits;
      setPhone("+7" + rest);
    }
  }, [user]);

  const onStartCheckout = (e) => {
    e?.preventDefault?.();
    setCheckoutError(null);
    setError(null);

    if (items.length === 0) {
      setError('Корзина пуста');
      return;
    }

    if (promoError) {
      setError(promoError);
      return;
    }

    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }

    setIsCheckout(true);
  };

  // validate checkout fields; returns true if ok, fills fieldErrors otherwise
  const validateCheckout = () => {
    const errs = {};
    if (!firstName || !firstName.trim()) errs.firstName = 'Введите имя';
    if (!lastName || !lastName.trim()) errs.lastName = 'Введите фамилию';
    if (!patronymic || !patronymic.trim()) errs.patronymic = 'Введите отчество';

    const digits = String(phone || '').replace(/\D/g, '');
    // expect Russian full number including leading country digit (7) -> total 11 digits
    if (digits.length < 11) errs.phone = 'Введите корректный телефон (например +7...)';

    if (!selectedShippingPayload) errs.shipping = 'Выберите адрес доставки';

    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const createOrder = async () => {
    setCheckoutError(null);
    setCreatingOrder(true);
    setFieldErrors({});

    // client-side validation
    const ok = validateCheckout();
    if (!ok) {
      setCreatingOrder(false);
      return;
    }

    try {
      // try to update profile first
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        patronymic: patronymic,
        phone: phone,
      });
    } catch (err) {
      console.error('updateProfile failed', err);
      // if backend returned structured field errors, map them
      if (err && err.body && typeof err.body === 'object') {
        const map = {};
        for (const key of Object.keys(err.body)) {
          const normKey = normalizeBackendKey(key);
          const rawVal = err.body[key];
          const text = Array.isArray(rawVal) ? rawVal.join(' ') : String(rawVal);
          const cleanText = normalizeErrorText(text);

          if (normKey === 'first_name' || normKey === 'firstname') map.firstName = cleanText;
          else if (normKey === 'last_name' || normKey === 'lastname') map.lastName = cleanText;
          else if (normKey === 'phone') map.phone = cleanText;
          else if (normKey === 'patronymic' || normKey === 'middle_name') map.patronymic = cleanText;
          else {
            // unknown — push to general
            setCheckoutError(prev => (prev ? prev + ' ' + cleanText : cleanText));
          }
        }
        if (Object.keys(map).length > 0) setFieldErrors(map);
        if (!checkoutError) setCheckoutError('Ошибка в данных профиля');
      } else {
        setCheckoutError('Не удалось сохранить данные профиля');
      }
      setCreatingOrder(false);
      return;
    }

    // формируем адрес
    const shipping_address_string = selectedShippingPayload?.address || selectedShippingPayload?.formatted || '';

    try {
      const payload = {
        shipping_address: shipping_address_string,
        city: selectedShippingPayload?.city,
        sdek_code: selectedShippingPayload?.code,
        sdek_payload: selectedShippingPayload,
      };
      if (promo?.code) payload.promo = promo.code;

      const data = await apiFetch('/orders/', {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      if (data && data.payment_link) {
        window.location.href = data.payment_link;
        return;
      }

      navigate('/orders');
    } catch (err) {
      console.error('createOrder failed', err);

      // если бэк вернул объект с ошибками — отобразим их рядом с полями
      if (err && err.body) {
        const body = err.body;
        const map = {};
        for (const key of Object.keys(body)) {
          const normKey = normalizeBackendKey(key);
          const rawVal = body[key];
          const text = Array.isArray(rawVal) ? rawVal.join(' ') : String(rawVal);
          const cleanText = normalizeErrorText(text);

          if (normKey === 'first_name' || normKey === 'firstname') map.firstName = cleanText;
          else if (normKey === 'last_name' || normKey === 'lastname') map.lastName = cleanText;
          else if (normKey === 'phone') map.phone = cleanText;
          else if (normKey === 'patronymic' || normKey === 'middle_name') map.patronymic = cleanText;
          else if (normKey === 'shipping_address' || normKey === 'city' || normKey === 'sdek_code' || normKey === 'shipping') {
            map.shipping = (map.shipping ? map.shipping + ' ' : '') + cleanText;
          } else if (normKey === 'non_field_errors' || normKey === 'detail' || normKey === 'message') {
            setCheckoutError(prev => (prev ? prev + ' ' + cleanText : cleanText));
          } else {
            // unknown key — append to general checkoutError
            setCheckoutError(prev => (prev ? prev + ' ' + cleanText : cleanText));
          }
        }
        if (Object.keys(map).length > 0) setFieldErrors(map);
      } else {
        setCheckoutError('Не удалось создать заказ. Попробуйте ещё раз.');
      }
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleSummaryButton = async (e) => {
    e?.preventDefault?.();
    if (items.length === 0 || promoError) return;

    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }

    if (!isCheckout) {
      onStartCheckout();
      return;
    }

    await createOrder();
  };

  // ------------------
  // Mемоизация пропсов для CDEK виджета — чтобы не пересоздавать объекты при каждом рендере
  // ------------------

  const goodsMemo = useMemo(() => items.map(item => ({
    width: 20,
    height: 10,
    length: 15,
    weight: item.quantity * 1,
  })), [items]);

  const fromMemo = useMemo(() => ({
    country_code: 'RU',
    city: 'Новосибирск',
    postal_code: 630009,
    code: 270,
    address: 'ул. Большевистская, д. 101',
  }), []);

  const tariffsMemo = useMemo(() => ({
    office: [136],
    door: []
  }), []);

  const hideDeliveryOptionsMemo = useMemo(() => ({
    office: false,
    door: true
  }), []);

  const handleShippingSelect = useCallback((payload) => {
    console.log("Выбран пункт выдачи:", payload);
    setSelectedShippingPayload(payload);
    // clear shipping field error on selection
    setFieldErrors(prev => ({ ...prev, shipping: undefined }));
  }, [setSelectedShippingPayload]);

  const cdekWidgetElement = useMemo(() => (
      <CdekWidgetReact
          apiKey={import.meta.env.VITE_YANDEX_API_KEY}
          servicePath={import.meta.env.VITE_CDEK_SERVICE_PATH}
          defaultLocation="Москва"
          from={fromMemo}
          goods={goodsMemo}
          tariffs={tariffsMemo}
          hideDeliveryOptions={hideDeliveryOptionsMemo}
          onShippingSelect={handleShippingSelect}
      />
  ), [fromMemo, goodsMemo, tariffsMemo, hideDeliveryOptionsMemo, handleShippingSelect]);

  // helper to clear field error on change
  const clearFieldError = (field) => {
    setFieldErrors(prev => {
      if (!prev || !prev[field]) return prev;
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
    setCheckoutError(null);
  };

  // ------------------
  // JSX
  // ------------------
  return (
      <main className='cart-page'>
        {/* Products block */}
        {!isCheckout && (
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
                            <img src={minusIcon} alt="-" />
                          </button>

                          <input
                              type="number"
                              min="1"
                              max="100"
                              value={editQuantities[item.cartItemId] ?? String(item.quantity)}
                              onChange={(e) => handleQtyInputChange(item.cartItemId, e.target.value)}
                              onBlur={() => commitQuantity(item.cartItemId)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
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
                            <img src={plusIcon} alt="+" />
                          </button>
                        </div>
                      </div>

                      <button className="cart-item-remove" onClick={() => removeItem(item.cartItemId)}>×</button>
                    </div>
                ))}
              </div>
            </div>
        )}


        {/* Checkout form */}
        {isCheckout && (
            <div className="cart-products cart-box checkout-form">
              <div className="cart-header-row">
                <h2 className='cart-header'>Оформление заказа</h2>
              </div>

              <div className="checkout-fields">
                <div className="info-card">
                  <div className="user-info-group">
                    <div className="user-info-field">
                      <label>Имя</label>
                      <input
                          type="text"
                          value={firstName}
                          onChange={(e) => { setFirstName(e.target.value); clearFieldError('firstName'); }}
                      />
                      {fieldErrors.firstName && <p style={{ color: 'crimson', fontSize: 13, marginTop: 6 }}>{fieldErrors.firstName}</p>}
                    </div>
                    <div className="user-info-field">
                      <label>Фамилия</label>
                      <input
                          type="text"
                          value={lastName}
                          onChange={(e) => { setLastName(e.target.value); clearFieldError('lastName'); }}
                      />
                      {fieldErrors.lastName && <p style={{ color: 'crimson', fontSize: 13, marginTop: 6 }}>{fieldErrors.lastName}</p>}
                    </div>
                    <div className="user-info-field">
                      <label>Отчество</label>
                      <input
                          type="text"
                          value={patronymic}
                          onChange={(e) => { setPatronymic(e.target.value); clearFieldError('patronymic'); }}
                      />
                      {fieldErrors.patronymic && <p style={{ color: 'crimson', fontSize: 13, marginTop: 6 }}>{fieldErrors.patronymic}</p>}
                    </div>
                    <div className="user-info-field">
                      <label>Телефон</label>
                      <input
                          type="tel"
                          value={phone}
                          onChange={(e) => { setPhone(e.target.value); clearFieldError('phone'); }}
                      />
                      {fieldErrors.phone && <p style={{ color: 'crimson', fontSize: 13, marginTop: 6 }}>{fieldErrors.phone}</p>}
                    </div>
                  </div>
                </div>

                {/* --- CDEK Widget --- */}
                <div className="cdek-widget-container" style={{ marginTop: 20 }}>
                  {cdekWidgetElement}
                </div>

                <div style={{ marginTop: 15, fontWeight: 500 }}>
                  <span>Выбранный адрес доставки: </span>
                  <span>
                        {selectedShippingPayload ? (
                            `${selectedShippingPayload.city}, ${selectedShippingPayload.address || selectedShippingPayload.name}`
                        ) : (
                            'не выбран'
                        )}
                    </span>
                </div>
                {fieldErrors.shipping && <p style={{ color: 'crimson', fontSize: 13, marginTop: 6 }}>{fieldErrors.shipping}</p>}

                {checkoutError && <p className="error" style={{ color: 'crimson' }}>{checkoutError}</p>}
              </div>
            </div>
        )}


        {/* Cart summary */}
        <div className='cart-summary cart-box'>
          <div className="summary-header">
            <h2 className='cart-header'>Итог заказа</h2>
            <span className="items-count">{totalCount}</span>
          </div>

          <div className="promo-code">
            {!promo ? (
                <>
                  <input
                      type="text"
                      placeholder="Введите промокод"
                      value={promoCode}
                      onChange={(e) => setPromoCode(e.target.value)}
                      disabled={applyingPromo || items.length === 0}
                  />
                  <button onClick={applyPromo} disabled={applyingPromo || items.length === 0}>
                    {applyingPromo ? 'Проверка...' : 'OK'}
                  </button>
                </>
            ) : (
                <div className="promo-applied">
                  <span>Промокод применён: <strong>{promo.code}</strong> ({promo.percent}%)</span>
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

          {promo && !promoError ? (
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
          ) : (
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
              title={items.length === 0 ? 'Корзина пуста' : promoError ? promoError : (isCheckout ? 'Перейти к оплате' : 'Оформить заказ')}
              onClick={handleSummaryButton}
              disabled={creatingOrder || items.length === 0 || Boolean(promoError)}
          >
            {creatingOrder ? 'Создаём заказ...' : (isCheckout ? 'Перейти к оплате' : 'Оформить заказ')}
          </button>

          {/* === NEW: общие ошибки под кнопкой оформления === */}
          {(checkoutError || Object.keys(fieldErrors).length > 0) && (
              <div className="checkout-errors" style={{ marginTop: 12 }}>
                {checkoutError && <p style={{ color: 'crimson', margin: 0 }}>{checkoutError}</p>}

                {/* Показываем все fieldErrors как список — избегаем дублирования пустых значений */}
                {Object.keys(fieldErrors).length > 0 && (
                    <ul style={{ color: 'crimson', marginTop: 8, paddingLeft: 18 }}>
                      {Object.entries(fieldErrors).map(([key, msg]) => (
                          msg ? <li key={key} style={{ fontSize: 13 }}>{msg}</li> : null
                      ))}
                    </ul>
                )}
              </div>
          )}
          {/* === END NEW === */}

          {error && <p className="error">{error}</p>}
        </div>

        {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      </main>
  );
}
