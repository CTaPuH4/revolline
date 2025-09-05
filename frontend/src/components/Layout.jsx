import Header from './Header';
import Footer from './Footer';
import { Outlet } from 'react-router-dom';
import {  useRef } from 'react';
import '../css/Layout.css'

export default function Layout() {
    const headerRef = useRef(null);

    return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
            <Header ref={headerRef} />
            <main className='layout'>
                <Outlet />
            </main>
            <Footer />
        </div>
    );
}
