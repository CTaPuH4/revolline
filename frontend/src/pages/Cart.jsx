import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import '../css/Cart.css';
import "../css/UserProfile.css";
import deleteIcon from "../assets/icons/delete-icon.png";
import plusIcon from "../assets/icons/plus.png";
import minusIcon from "../assets/icons/minus.png";
import fallbackImage from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";
import AuthModal from "../modals/Auth/AuthModal";
import CdekWidgetReact from "../components/CdekWidgetReact.jsx";
import { csrfFetch } from "../utils/api";

const API_BASE = import.meta.env.VITE_API_BASE;
const PROMO_STORAGE_KEY = 'revolline_checkout_promo_code';
const CHECKOUT_ID_STORAGE_KEY = 'revolline_checkout_idempotency_key';

const extractCleanError = (body) => {
  if (!body) return 'Неизвестная ошибка';

  let raw = body;

  if (typeof body === 'string') {
    try {
      raw = JSON.parse(body);
    } catch {
      return body.trim().replace(/\s+/g, ' ');
    }
  }

  if (typeof raw !== 'object') return 'Неизвестная ошибка';

  const messages = [];

  if (raw.detail) messages.push(raw.detail);
  if (raw.message) messages.push(raw.message);
  if (Array.isArray(raw.non_field_errors)) messages.push(...raw.non_field_errors);

  Object.entries(raw).forEach(([key, value]) => {
    if (['detail', 'message', 'non_field_errors'].includes(key)) return;
    if (Array.isArray(value)) messages.push(...value);
    else if (typeof value === 'string') messages.push(value);
  });

  if (messages.length === 0) return 'Ошибка сервера';

  return messages
      .map(msg => String(msg).trim())
      .filter(Boolean)
      .map(msg => {
        const spaceRatio = (msg.match(/ /g) || []).length / msg.length;
        if (spaceRatio > 0.35) return msg.replace(/ /g, '');
        return msg.replace(/\s+/g, ' ');
      })
      .join(' ')
    || 'Ошибка сервера';
};

export default function Cart() {
  const { user, isAuthenticated, updateProfile } = useAuth();
  const navigate = useNavigate();
  const shouldRestorePromoRef = useRef(false);
  const checkoutIdRef = useRef(
    sessionStorage.getItem(CHECKOUT_ID_STORAGE_KEY),
  );

  const [items, setItems] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [editQuantities, setEditQuantities] = useState({});

  const [promoCode, setPromoCode] = useState('');
  const [applyingPromo, setApplyingPromo] = useState(false);
  const [promo, setPromo] = useState(null);
  const [promoError, setPromoError] = useState(null);

  const [isCheckout, setIsCheckout] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [selectedShippingPayload, setSelectedShippingPayload] = useState(null);

  const [fieldErrors, setFieldErrors] = useState({});
  const [checkoutError, setCheckoutError] = useState(null);
  const [creatingOrder, setCreatingOrder] = useState(false);

  const [cartTotal, setCartTotal] = useState(0);
  const [deliveryFee, setDeliveryFee] = useState(0);
  const [totalPriceWithDelivery, setTotalPriceWithDelivery] = useState(0);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [patronymic, setPatronymic] = useState('');
  const [phone, setPhone] = useState('+7');

  const persistPromoCode = useCallback((code) => {
    const normalized = String(code || '').trim();
    if (!normalized) {
      localStorage.removeItem(PROMO_STORAGE_KEY);
      return;
    }
    localStorage.setItem(PROMO_STORAGE_KEY, normalized);
  }, []);

  const getOrCreateCheckoutId = () => {
    if (!checkoutIdRef.current) {
      checkoutIdRef.current = window.crypto.randomUUID();
      sessionStorage.setItem(
        CHECKOUT_ID_STORAGE_KEY,
        checkoutIdRef.current,
      );
    }
    return checkoutIdRef.current;
  };

  const clearCheckoutId = () => {
    checkoutIdRef.current = null;
    sessionStorage.removeItem(CHECKOUT_ID_STORAGE_KEY);
  };

  const apiFetch = useCallback(async (path, options = {}) => {
    const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
    const opts = {
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      ...options,
    };
    const res = await csrfFetch(url, opts);
    if (!res.ok) {
      const text = await res.text();
      let body = null;
      try {
        body = text ? JSON.parse(text) : null;
      } catch {
        body = text;
      }
      const err = new Error(`HTTP ${res.status}`);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    if (res.status === 204) return null;
    try {
      return await res.json();
    } catch {
      return null;
    }
  }, []);

  const transformServerItem = useCallback((serverItem) => {
    const product = serverItem.product_data || serverItem.product || {};
    const firstImageObj = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : null;
    const image = (firstImageObj && (firstImageObj.image || firstImageObj.url)) || product.image || fallbackImage;

    return {
      cartItemId: serverItem.id,
      productId: product.id,
      title: product.title || product.name || 'Без названия',
      type: product.pr_type || '',
      price: Number(product.price ?? 0),
      old_price: product.old_price != null ? Number(product.old_price) : null,
      quantity: serverItem.quantity ?? 1,
      image,
    };
  }, []);

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
    if (item.quantity !== num) updateQuantity(cartItemId, num);
  };

  const fetchCart = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await apiFetch('/cart/');
      const list = data.items || [];
      const transformed = list.map(transformServerItem);
      setItems(transformed);

      const initialEdit = {};
      transformed.forEach((it) => {
        initialEdit[it.cartItemId] = String(it.quantity);
      });
      setEditQuantities(initialEdit);

      setCartTotal(Number(data.cart_total || 0));
      setDeliveryFee(Number(data.delivery_fee || 0));
      setTotalPriceWithDelivery(Number(data.total_price || 0));
    } catch (err) {
      console.error('fetchCart error', err);
      setError(extractCleanError(err.body));
    } finally {
      setIsLoading(false);
    }
  }, [apiFetch, transformServerItem]);

  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  useEffect(() => {
    const savedPromoCode = localStorage.getItem(PROMO_STORAGE_KEY);
    if (savedPromoCode) {
      setPromoCode(savedPromoCode);
      shouldRestorePromoRef.current = true;
    }
  }, []);

  const updateQuantity = async (cartItemId, newQty) => {
    setItems(prev => prev.map(it => it.cartItemId === cartItemId ? { ...it, quantity: newQty } : it));
    try {
      await apiFetch(`/cart/${cartItemId}/`, {
        method: 'PATCH',
        body: JSON.stringify({ quantity: newQty }),
      });
      fetchCart();
    } catch (err) {
      console.error('updateQuantity failed', err);
      setError(extractCleanError(err.body) || 'Не удалось обновить количество');
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
      fetchCart();
    } catch (err) {
      console.error('removeItem failed', err);
      setError(extractCleanError(err.body) || 'Не удалось удалить товар');
      setItems(prev);
      fetchCart();
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
      persistPromoCode('');
      fetchCart();
    } catch (err) {
      console.error('clearCart failed', err);
      setError(extractCleanError(err.body) || 'Не удалось очистить корзину');
      setItems(prev);
      fetchCart();
    } finally {
      setIsLoading(false);
    }
  };

  const totalPrice = items.reduce(
    (sum, item) => sum + (item.old_price || item.price) * item.quantity,
    0,
  );
  const totalDiscount = Number((totalPrice - cartTotal).toFixed(2));
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);
  const promoDiscountAmount = promo ? Number((cartTotal * (promo.percent / 100)).toFixed(2)) : 0;
  const finalPriceWithPromo = promo ? Number((cartTotal - promoDiscountAmount).toFixed(2)) : cartTotal;
  const grandTotal = promo ? finalPriceWithPromo + deliveryFee : totalPriceWithDelivery;

  const applyPromo = useCallback(async (promoCodeValue = promoCode) => {
    setPromoError(null);
    setError(null);
    const code = String(promoCodeValue || '').trim();
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
        setPromoError('Неверный ответ от сервера');
        return;
      }
      if (cartTotal < (data.min_price ?? 0)) {
        setPromoError(`Минимальная сумма: ${data.min_price} ₽`);
        return;
      }
      setPromo({ ...data, code });
      setPromoCode(code);
      persistPromoCode(code);
      setPromoError(null);
    } catch (err) {
      console.error('applyPromo failed', err);
      setPromoError(extractCleanError(err.body));
    } finally {
      setApplyingPromo(false);
    }
  }, [apiFetch, cartTotal, items.length, persistPromoCode, promoCode]);

  const removePromo = () => {
    setPromo(null);
    setPromoError(null);
    setPromoCode('');
    setError(null);
    persistPromoCode('');
  };

  useEffect(() => {
    if (
      !shouldRestorePromoRef.current
      || isLoading
      || applyingPromo
      || promo
      || !promoCode
      || items.length === 0
    ) {
      return;
    }

    shouldRestorePromoRef.current = false;
    applyPromo(promoCode);
  }, [isLoading, applyingPromo, promo, promoCode, items.length, applyPromo]);

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
    if (!isAuthenticated) {
      setShowAuth(true);
      return;
    }
    setIsCheckout(true);
  };

  const validateCheckout = () => {
    const errs = {};
    if (!firstName?.trim()) errs.firstName = 'Введите имя';
    if (!lastName?.trim()) errs.lastName = 'Введите фамилию';
    if (!patronymic?.trim()) errs.patronymic = 'Введите отчество';
    const digits = String(phone || '').replace(/\D/g, '');
    if (digits.length < 11) errs.phone = 'Введите корректный телефон';
    if (!selectedShippingPayload) errs.shipping = 'Выберите адрес доставки';
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const createOrder = async () => {
    setCheckoutError(null);
    setCreatingOrder(true);
    setFieldErrors({});

    if (!validateCheckout()) {
      setCreatingOrder(false);
      return;
    }

    try {
      await updateProfile({
        first_name: firstName,
        last_name: lastName,
        patronymic: patronymic,
        phone: phone,
      });
    } catch (err) {
      console.error('updateProfile failed', err);
      setCheckoutError(extractCleanError(err.body) || 'Ошибка сохранения профиля');
      setCreatingOrder(false);
      return;
    }

    const shipping_address_string = selectedShippingPayload?.address || selectedShippingPayload?.formatted || '';

    try {
      const payload = { shipping_address: shipping_address_string };
      if (promo?.code) payload.promo = promo.code;
      const idempotencyKey = getOrCreateCheckoutId();

      const data = await apiFetch('/orders/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idempotencyKey,
        },
        body: JSON.stringify(payload),
      });

      if (data?.payment_link) {
        persistPromoCode('');
        clearCheckoutId();
        window.location.href = data.payment_link;
        return;
      }

      if (data?.payment_status === 'pending') {
        setCheckoutError(
          data.detail || 'Платёж уже создаётся. Повторите запрос позже.',
        );
        return;
      }

      if (['paid', 'expired', 'refunded'].includes(data?.payment_status)) {
        clearCheckoutId();
      }

      persistPromoCode('');
      navigate('/orders');
    } catch (err) {
      console.error('createOrder failed', err);
      setCheckoutError(extractCleanError(err.body));
    } finally {
      setCreatingOrder(false);
    }
  };

  const handleSummaryButton = async (e) => {
    e?.preventDefault?.();

    if (items.length === 0) {
      setError('Корзина пуста');
      return;
    }

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

  const hideDeliveryOptionsMemo = useMemo(() => ({ office: false, door: true }), []);
  const handleShippingSelect = useCallback((payload) => {
    setSelectedShippingPayload(payload);
    setFieldErrors(prev => ({ ...prev, shipping: undefined }));
  }, []);

  const cdekWidgetElement = useMemo(() => (
    <CdekWidgetReact
      apiKey={import.meta.env.VITE_YANDEX_API_KEY}
      servicePath={import.meta.env.VITE_CDEK_SERVICE_PATH}
      defaultLocation="Москва"
      hideDeliveryOptions={hideDeliveryOptionsMemo}
      onShippingSelect={handleShippingSelect}
    />
  ), [hideDeliveryOptionsMemo, handleShippingSelect]);

  const clearFieldError = (field) => {
    setFieldErrors(prev => {
      const copy = { ...prev };
      delete copy[field];
      return copy;
    });
    setCheckoutError(null);
  };

  return (
    <main className='cart-page'>
      {!isCheckout && (
        <div className='cart-products cart-box'>
          <div className="cart-header-row">
            <h2 className='cart-header'>
              Товары <sup className="cart-items-count">{totalCount}</sup>
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
                    <span className="cart-item-price">{item.price} ₽</span>
                    {item.old_price && (
                      <span className="cart-item-oldprice">{item.old_price} ₽</span>
                    )}
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
                        if (e.key === 'Enter') e.currentTarget.blur();
                        else if (e.key === 'ArrowUp') {
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
                  <input type="text" value={firstName} onChange={(e) => { setFirstName(e.target.value); clearFieldError('firstName'); }} />
                  {fieldErrors.firstName && <p style={{ color: 'crimson', fontSize: 13, marginTop: 6 }}>{fieldErrors.firstName}</p>}
                </div>
                <div className="user-info-field">
                  <label>Фамилия</label>
                  <input type="text" value={lastName} onChange={(e) => { setLastName(e.target.value); clearFieldError('lastName'); }} />
                  {fieldErrors.lastName && <p style={{ color: 'crimson', fontSize: 13, marginTop: 6 }}>{fieldErrors.lastName}</p>}
                </div>
                <div className="user-info-field">
                  <label>Отчество</label>
                  <input type="text" value={patronymic} onChange={(e) => { setPatronymic(e.target.value); clearFieldError('patronymic'); }} />
                  {fieldErrors.patronymic && <p style={{ color: 'crimson', fontSize: 13, marginTop: 6 }}>{fieldErrors.patronymic}</p>}
                </div>
                <div className="user-info-field">
                  <label>Телефон</label>
                  <input type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); clearFieldError('phone'); }} />
                  {fieldErrors.phone && <p style={{ color: 'crimson', fontSize: 13, marginTop: 6 }}>{fieldErrors.phone}</p>}
                </div>
              </div>
            </div>

            <div className="cdek-widget-container" style={{ marginTop: 20 }}>
              {cdekWidgetElement}
            </div>

            <div style={{ marginTop: 15, fontWeight: 500 }}>
              <span>Выбранный адрес доставки: </span>
              <span>
                {selectedShippingPayload
                  ? `${selectedShippingPayload.city}, ${selectedShippingPayload.address || selectedShippingPayload.name}`
                  : 'не выбран'}
              </span>
            </div>
          </div>
        </div>
      )}

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
                onChange={(e) => {
                  setPromoCode(e.target.value);
                  setPromoError(null);
                }}
                disabled={applyingPromo || items.length === 0}
              />
              <button onClick={applyPromo} disabled={applyingPromo || items.length === 0}>
                {applyingPromo ? 'Проверка...' : 'OK'}
              </button>
            </>
          ) : (
            <div className="promo-applied">
              <span>Промокод: <strong>{promo.code}</strong> ({promo.percent}%)</span>
              <button className="remove-promo" onClick={removePromo} title="Удалить">X</button>
            </div>
          )}
          {promoError && <p style={{ color: 'crimson', marginTop: 6, fontSize: 14 }}>{promoError}</p>}
        </div>

        <div className="summary-line">
          <span>Товаров на сумму:</span>
          <span>{totalPrice} ₽</span>
        </div>
        <div className="summary-line">
          <span>Скидка (акции):</span>
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

        <div className="summary-line">
          <span>Доставка:</span>
          <span>{deliveryFee} ₽</span>
        </div>

        <hr className="summary-divider" />
        <div className="summary-total">
          <span>Всего к оплате:</span>
          <span>{grandTotal} ₽</span>
        </div>

        <button
          className="checkout-btn"
          onClick={handleSummaryButton}
          disabled={creatingOrder || items.length === 0}
        >
          {creatingOrder ? 'Создаём заказ...' : (isCheckout ? 'Перейти к оплате' : 'Оформить заказ')}
        </button>

        {fieldErrors.shipping && <p style={{ color: 'crimson', fontSize: 18, marginTop: 6 }}>{fieldErrors.shipping}</p>}
        {checkoutError && <p style={{ color: 'crimson', marginTop: 12 }}>{checkoutError}</p>}
        {error && <p style={{ color: 'crimson', marginTop: 12 }}>{error}</p>}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
    </main>
  );
}
