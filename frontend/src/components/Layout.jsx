import Header from './Header';
import Footer from './Footer';
import { Outlet } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';

export default function Layout() {
    const headerRef = useRef(null);
    const [headerHeight, setHeaderHeight] = useState(0);

    useEffect(() => {
        const updateHeaderHeight = () => {
            if (headerRef.current) {
                setHeaderHeight(headerRef.current.offsetHeight);
            }
        };

        updateHeaderHeight();
        window.addEventListener('resize', updateHeaderHeight);
        return () => window.removeEventListener('resize', updateHeaderHeight);
    }, []);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header ref={headerRef} />
            <main style={{ flex: '1 0 auto', marginTop: `${headerHeight}px` }}>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
