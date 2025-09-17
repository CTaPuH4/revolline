// src/components/CdekWidgetReact.jsx
import React, { useEffect, useRef } from 'react';

const CDN_SRC = 'https://cdn.jsdelivr.net/npm/@cdek-it/widget@3';

export default function CdekWidgetReact({
                                            apiKey,
                                            servicePath,
                                            defaultLocation = 'Москва',
                                            onShippingSelect,
                                        }) {
    const containerRef = useRef(null);
    const widgetRef = useRef(null);

    useEffect(() => {
        let mounted = true;

        const loadScript = () =>
            new Promise((resolve, reject) => {
                if (window && window.CDEKWidget) return resolve(window.CDEKWidget);

                const existing = document.querySelector(`script[src="${CDN_SRC}"]`);
                if (existing) {
                    existing.addEventListener('load', () => resolve(window.CDEKWidget));
                    existing.addEventListener('error', reject);
                    return;
                }

                const s = document.createElement('script');
                s.src = CDN_SRC;
                s.async = true;
                s.onload = () => resolve(window.CDEKWidget);
                s.onerror = reject;
                document.head.appendChild(s);
            });

        (async () => {
            try {
                const CDEKWidget = await loadScript();
                if (!mounted) return;

                // Инициализация виджета
                widgetRef.current = new CDEKWidget({
                    root: containerRef.current ? containerRef.current.id : 'cdek-map',
                    apiKey,            // ваш Яндекс API key
                    servicePath,       // ссылка на service.php
                    from: defaultLocation,
                    defaultLocation,
                    // Отключаем встроенный геокодер, чтобы использовать координаты с сервера
                    disableGeocoding: true,
                    onSelect: (payload) => {
                        console.debug('CDEK onSelect', payload);
                        if (typeof onShippingSelect === 'function') onShippingSelect(payload);
                    },
                    onError: (err) => {
                        console.warn('CDEK widget error', err);
                    },
                });
            } catch (err) {
                console.error('Failed to load CDEK widget', err);
            }
        })();

        return () => {
            mounted = false;
            // Уничтожение виджета при размонтировании
            try {
                if (widgetRef.current?.destroy) widgetRef.current.destroy();
            } catch (e) { /* ignore */ }
            if (containerRef.current) containerRef.current.innerHTML = '';
        };
    }, [apiKey, servicePath, defaultLocation, onShippingSelect]);

    return (
        <div className="cdek-widget-wrapper">
            <div className="cdek-widget-header">
                <h3>Доставка и пункты выдачи</h3>
                <div className="cdek-widget-status">Рассчитать стоимость доставки</div>
            </div>
            <div id="cdek-map" ref={containerRef} style={{ height: '500px' }} />
        </div>
    );
}
