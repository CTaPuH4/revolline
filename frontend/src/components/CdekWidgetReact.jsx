// src/components/CdekWidgetReact.jsx
import React, { useEffect, useRef, useMemo } from "react";

const CDN_SRC = "https://cdn.jsdelivr.net/npm/@cdek-it/widget@3";

export default function CdekWidgetReact({
                                            apiKey,
                                            servicePath,
                                            defaultLocation = "Москва",
                                            from = { city: "Москва" },
                                            goods = [{ width: 10, height: 10, length: 10, weight: 1 }],
                                            tariffs, // allow undefined
                                            hideFilters = { have_cash: false, have_cashless: false, is_dressing_room: false, type: false },
                                            hideDeliveryOptions = { office: false, door: false },
                                            onShippingSelect,
                                        }) {
    const containerRef = useRef(null);
    const widgetRef = useRef(null);
    // генерируем уникальный id на каждый экземпляр (без внешней зависимости)
    const rootIdRef = useRef(`cdek-map-${Math.random().toString(36).slice(2, 9)}`);

    // стабилизируем объекты, чтобы эффект не перезапускался каждый рендер
    const memoGoods = useMemo(() => goods, [JSON.stringify(goods)]);
    const memoHideFilters = useMemo(() => hideFilters, [JSON.stringify(hideFilters)]);
    const memoHideDeliveryOptions = useMemo(() => hideDeliveryOptions, [JSON.stringify(hideDeliveryOptions)]);
    const memoTariffs = useMemo(() => (Array.isArray(tariffs?.office) || Array.isArray(tariffs?.door) || Array.isArray(tariffs?.pickup) ? tariffs : undefined), [JSON.stringify(tariffs || {})]);

    useEffect(() => {
        let mounted = true;

        const loadScript = () =>
            new Promise((resolve, reject) => {
                if (typeof window !== "undefined" && window.CDEKWidget) return resolve(window.CDEKWidget);

                const existing = document.querySelector(`script[src="${CDN_SRC}"]`);
                if (existing) {
                    existing.addEventListener("load", () => resolve(window.CDEKWidget));
                    existing.addEventListener("error", reject);
                    return;
                }

                const s = document.createElement("script");
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

                // указываем root как id элемента
                widgetRef.current = new CDEKWidget({
                    root: rootIdRef.current,
                    apiKey,
                    servicePath,
                    defaultLocation,
                    canChoose: true,
                    // передаём tariffs только если он задан и непустой
                    ...(memoTariffs ? { tariffs: memoTariffs } : {}),
                    hideFilters: memoHideFilters,
                    hideDeliveryOptions: memoHideDeliveryOptions,

                    onReady: () => {
                        console.debug("CDEK ready");
                    },
                    onCalculate: (tariffsResp, address) => {
                        console.debug("CDEK calculate", tariffsResp, address);
                    },
                    onChoose: (mode, tariff, address) => {
                        console.debug("CDEK choose", { mode, tariff, address });
                        // ВАЖНО: передаём в callback именно объект address (чтобы parent мог делать payload.address / payload.name)
                        if (typeof onShippingSelect === "function") {
                            onShippingSelect(address, { mode, tariff, rawAddress: address });
                        }
                    },
                });
            } catch (err) {
                console.error("Failed to load CDEK widget", err);
            }
        })();

        return () => {
            mounted = false;
            try {
                if (widgetRef.current?.destroy) widgetRef.current.destroy();
            } catch (e) {
                /* ignore */
            }
            // очистим контейнер
            const el = document.getElementById(rootIdRef.current);
            if (el) el.innerHTML = "";
        };
    }, [apiKey, servicePath, from, defaultLocation, memoGoods, memoTariffs, memoHideFilters, memoHideDeliveryOptions, onShippingSelect]);

    return (
        <div className="cdek-widget-wrapper">
            <div className="cdek-widget-header">
                <h3>Доставка и пункты выдачи</h3>
            </div>
            {/* используем уникальный id */}
            <div id={rootIdRef.current} ref={containerRef} style={{ height: "500px" }} />
        </div>
    );
}
