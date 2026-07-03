import React, { useEffect, useRef } from "react";

const CDN_SRC = "https://cdn.jsdelivr.net/npm/@cdek-it/widget@3.11.1";
const DEFAULT_LOCATION = "Москва";
const DEFAULT_HIDE_FILTERS = {
    have_cash: false,
    have_cashless: false,
    is_dressing_room: false,
    type: false,
};
const DEFAULT_HIDE_DELIVERY_OPTIONS = { office: false, door: true };

export default function CdekWidgetReact({
    apiKey,
    servicePath,
    defaultLocation = DEFAULT_LOCATION,
    hideFilters = DEFAULT_HIDE_FILTERS,
    hideDeliveryOptions = DEFAULT_HIDE_DELIVERY_OPTIONS,
    onShippingSelect,
}) {
    const widgetRef = useRef(null);
    const rootIdRef = useRef(`cdek-map-${Math.random().toString(36).slice(2, 9)}`);

    useEffect(() => {
        if (!apiKey || !servicePath) {
            return undefined;
        }

        let cancelled = false;
        const rootId = rootIdRef.current;

        const mountWidget = () => {
            if (cancelled || !window.CDEKWidget) {
                return;
            }

            try {
                widgetRef.current?.destroy?.();
            } catch {
                // ignore
            }

            widgetRef.current = new window.CDEKWidget({
                root: rootId,
                apiKey,
                servicePath,
                defaultLocation,
                lang: "rus",
                canChoose: true,
                hideFilters,
                hideDeliveryOptions,
                onChoose: (mode, tariff, address) => {
                    if (typeof onShippingSelect === "function") {
                        onShippingSelect(address, { mode, tariff, rawAddress: address });
                    }
                },
            });
        };

        const existingScript = document.querySelector(`script[src="${CDN_SRC}"]`);
        if (window.CDEKWidget) {
            mountWidget();
        } else if (existingScript) {
            existingScript.addEventListener("load", mountWidget, { once: true });
        } else {
            const script = document.createElement("script");
            script.src = CDN_SRC;
            script.async = true;
            script.onload = mountWidget;
            document.head.appendChild(script);
        }

        return () => {
            cancelled = true;
            try {
                widgetRef.current?.destroy?.();
            } catch {
                // ignore
            }
            widgetRef.current = null;

            const element = document.getElementById(rootId);
            if (element) {
                element.innerHTML = "";
            }
        };
    }, [
        apiKey,
        servicePath,
        defaultLocation,
        hideFilters,
        hideDeliveryOptions,
        onShippingSelect,
    ]);

    if (!apiKey || !servicePath) {
        return (
            <div className="cdek-widget-wrapper">
                <div className="cdek-widget-header">
                    <h3>Доставка и пункты выдачи</h3>
                </div>
                <div className="cdek-widget-error">
                    Не настроен CDEK widget: проверьте `VITE_YANDEX_API_KEY` и
                    `VITE_CDEK_SERVICE_PATH`.
                </div>
            </div>
        );
    }

    return (
        <div className="cdek-widget-wrapper">
            <div className="cdek-widget-header">
                <h3>Доставка и пункты выдачи</h3>
            </div>
            <div id={rootIdRef.current} className="cdek-widget-root" />
        </div>
    );
}
