import React, { useState } from 'react';
import CatalogSidebar from './CatalogSidebar';
import '../../css/catalog/MobileSidebar.css'

export default function MobileSidebarToggle() {
    const [open, setOpen] = useState(false);

    return (
        <>
            <button className="burger-button" onClick={() => setOpen(true)}>
                ☰ Каталог
            </button>

            {open && (
                <div className="mobile-sidebar-overlay" onClick={() => setOpen(false)}>
                    <div className="mobile-sidebar" onClick={(e) => e.stopPropagation()}>
                        <button className="close-button" onClick={() => setOpen(false)}>×</button>
                        <CatalogSidebar />
                    </div>
                </div>
            )}
        </>
    );
}
