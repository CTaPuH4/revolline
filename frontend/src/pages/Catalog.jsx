
import CatalogSidebar from '../components/catalog/CatalogSidebar'
import '../css/catalog/Catalog.css'
import Breadcrumbs from  '../components/Breadcrumbs'

export default function Catalog() {
  return (
    <main>
      <div className='catalog-header'>
        <p>Каталог</p>
        <Breadcrumbs />
      </div>
      <div className="catalog-container">
      <CatalogSidebar />
      <div className="catalog-scrollable">
        <div className="products">
          {Array.from({ length: 40 }, (_, i) => (
            <div className="product-card" key={i}>
              <div className="product-image">Фото</div>
              <div className="product-name">Товар {i + 1}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
    </main>
  );
}