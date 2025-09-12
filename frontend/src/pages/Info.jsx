import { useParams, Link, Navigate } from "react-router-dom";
import '../css/PrivacyPolicy.css';

const MENU = [
  { id: 'about',   title: 'О компании',                     
    content: 
      <div className="info-text">
        <p>Информация о компании...</p>
      </div> 
  },
  { id: 'privacy', title: 'Политика конфиденциальности',   
    content: 
      <div className="info-text">
        <p>Текст политики...</p>
      </div> 
  },
  { id: 'deal',    title: 'Пользовательское соглашение',    
    content: 
      <div className="info-text">
        <p>Текст соглашения...</p>
      </div> 
  },
  { id: 'partners',title: 'Партнерам',                      
    content: 
      <div className="info-text">
        <p>Информация для партнёров...</p>
      </div> 
  },
];

export default function PrivacyPolicy() {
  const { pageId } = useParams(); // /info/:pageId

  // если нет pageId или он некорректный — редиректим на /info/privacy
  if (!pageId || !MENU.some(m => m.id === pageId)) {
    return <Navigate to="/info/privacy" replace />;
  }

  const active = MENU.find(m => m.id === pageId);

  return (
    <main className="info-page">
      <div className="info-content">
        <aside className="info-catalog">
          <ul>
            {MENU.map((item, idx) => (
              <li key={item.id}>
                <Link
                  to={`/info/${item.id}`}
                  className={`category-link ${item.id === pageId ? 'active' : ''}`}
                >
                  {item.title}
                </Link>
                {idx < MENU.length - 1 && <div className="divider" />}
              </li>
            ))}
          </ul>
        </aside>

        <section className="privacy-main">
          <div className="privacy-block">
            <h1>{active.title}</h1>
            {active.content}
          </div>
        </section>
      </div>
    </main>
  );
}
