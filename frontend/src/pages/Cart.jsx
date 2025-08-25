import { useState } from 'react';
import '../css/Cart.css'
import deleteIcon from "../assets/icons/delete-icon.png"
import plusIcon from "../assets/icons/plus.png"
import minusIcon from "../assets/icons/minus.png"
import exapmle1 from "../assets/example1.jpg"
import exapmle2 from "../assets/example2.jpg"

// !!!!!!!!!!!!!!!        ДОБАВИТЬ ВО ФРОНТЕ К ТОВАРУ СВОЙСТВО SELECTED          !!!!!!!!!!!!!!!!!




export default function Cart() {
  const [items, setItems] = useState([
    { id: 1, title: "Love Generation Blushberry Contouring Palette", type: "Румяна", discount_price: 800, price: 880, quantity: 1, image: exapmle1 },
    { id: 2, title: "Influence Beauty Lunar Highlighter", type: "Хайлайтер", discount_price: 400, price: 500, quantity: 1, image: exapmle2 }
  ]);

  // Массив id отмеченных товаров
  const [checkedItems, setCheckedItems] = useState(items.map(item => item.id));

  const removeItem = (id) => {
    setItems(prev => prev.filter(item => item.id !== id));
    setCheckedItems(prev => prev.filter(cid => cid !== id));
  };

  const clearCart = () => {
    setItems([]);
    setCheckedItems([]);
  };

  const handleCheck = (id) => {
    setCheckedItems(prev =>
      prev.includes(id)
        ? prev.filter(cid => cid !== id)
        : [...prev, id]
    );
  };

  const incrementQty = (id) => {
    setItems(prev => prev.map(item =>
      item.id === id ? { ...item, quantity: item.quantity + 1 } : item
    ));
  };

  const decrementQty = (id) => {
    setItems(prev => prev.map(item =>
      item.id === id && item.quantity > 1 ? { ...item, quantity: item.quantity - 1 } : item
    ));
  };

  // Итоги заказа — только выбранные товары
  const selectedItems = items.filter(item => checkedItems.includes(item.id));

  // Сумма товаров без скидки
  const totalPrice = selectedItems.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  // Сумма товаров со скидкой
  const totalDiscountPrice = selectedItems.reduce(
    (sum, item) => sum + item.discount_price * item.quantity,
    0
  );

  const totalDiscount = totalPrice - totalDiscountPrice;

  // Общее количество товаров в корзине
  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <main className='cart-page'>
      {/* Блок Товары */}
      <div className='cart-products cart-box'>
        <div className="cart-header-row">
          <h2 className='cart-header'>
            Товары
            <sup className="cart-items-count">{totalCount}</sup>
          </h2>
          <button className="cart-clear-btn icon-button" onClick={clearCart} data-tooltip="Очистить корзину">
            <img src={deleteIcon} alt="Очистить корзину" />
          </button>
        </div>
        
        <div className="cart-items">
          {items.length === 0 ? (
            <p className="empty-cart">Корзина пуста</p>
          ) : (
            items.map(item => (
              <div key={item.id} className="cart-item">
                {/* Чекбокс */}
                <label className="custom-checkbox">
                  <input
                    type="checkbox"
                    checked={checkedItems.includes(item.id)}
                    onChange={() => handleCheck(item.id)}
                  />
                  <span className="checkmark"></span>
                </label>

                {/* Фото */}
                <img src={item.image} alt={item.title} className="cart-item-img" />

                {/* Информация о товаре */}
                <div className="cart-item-info">
                  <h3 className="cart-item-title">{item.title}</h3>
                  <p className="cart-item-type">{item.type}</p>
                  <div className="cart-item-prices">
                    <span className="cart-item-price">{item.discount_price} ₽</span>
                    <span className="cart-item-oldprice">{item.price} ₽</span>
                  </div>

                  {/* Кол-во */}
                  <div className="cart-item-qty">
                    <button onClick={() => decrementQty(item.id)}>
                      <img src={minusIcon} alt="-" />
                    </button>
                    <span>{item.quantity}</span>
                    <button onClick={() => incrementQty(item.id)}>
                      <img src={plusIcon} alt="+" />
                    </button>
                  </div>
                </div>

                {/* Крестик */}
                <button className="cart-item-remove" onClick={() => removeItem(item.id)}>×</button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Блок Итог заказа */}
      <div className='cart-summary cart-box'>
        <div className="summary-header">
          <h2 className='cart-header'>Итог заказа</h2>
          <span className="items-count">
            {selectedItems.reduce((sum, item) => sum + item.quantity, 0)}
          </span>
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
      </div>
    </main>
  );
}
