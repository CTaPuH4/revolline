// src/components/CdekWidgetReact.jsx
import React, { useEffect, useRef } from "react";

const CDN_SRC = "https://cdn.jsdelivr.net/npm/@cdek-it/widget@3";

export default function CdekWidgetReact({
                                            apiKey,
                                            servicePath,
                                            defaultLocation = "Москва",
                                            from = { city: "Москва" },
                                            goods = [{ width: 10, height: 10, length: 10, weight: 1 }],
                                            tariffs = {
                                                office: [234, 136, 138],
                                                door: [233, 137, 139],
                                            },
                                            hideFilters = {
                                                have_cash: false,
                                                have_cashless: false,
                                                is_dressing_room: false,
                                                type: false,
                                            },
                                            hideDeliveryOptions = {
                                                office: false,
                                                door: false,
                                            },
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

                widgetRef.current = new CDEKWidget({
                    root: containerRef.current ? containerRef.current.id : "cdek-map",
                    apiKey,
                    servicePath,
                    from,
                    defaultLocation,
                    canChoose: true,
                    goods,
                    tariffs,
                    hideFilters,
                    hideDeliveryOptions,

                    // События
                    onReady: () => {
                        console.debug("CDEK ready");
                    },
                    onCalculate: (tariffs, address) => {
                        console.debug("CDEK calculate", tariffs, address);
                    },
                    onChoose: (mode, tariff, address) => {
                        console.debug("CDEK choose", { mode, tariff, address });
                        if (typeof onShippingSelect === "function") {
                            onShippingSelect({ mode, tariff, address });
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
            if (containerRef.current) containerRef.current.innerHTML = "";
        };
    }, [apiKey, servicePath, from, defaultLocation, goods, tariffs, hideFilters, hideDeliveryOptions, onShippingSelect]);

    return (
        <div className="cdek-widget-wrapper">
            <div className="cdek-widget-header">
                <h3>Доставка и пункты выдачи</h3>
            </div>
            <div id="cdek-map" ref={containerRef} style={{ height: "500px" }} />
        </div>
    );
}
