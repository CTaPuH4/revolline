import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import '../css/home/ConfirmReset.css';
const API_BASE = import.meta.env.VITE_API_BASE;
const ConfirmReset = () => {
    // Получаем uid и token из query-параметров: /reset/?uid=...&token=...
    const [searchParams] = useSearchParams();
    const uid = searchParams.get('uid');
    const token = searchParams.get('token');
    const navigate = useNavigate();
    const [password, setPassword] = useState('');
    const [password2, setPassword2] = useState('');
    const [status, setStatus] = useState('idle'); // idle | loading | success | error
    const [message, setMessage] = useState('');
    const [errorDetails, setErrorDetails] = useState('');
    // Проверка наличия параметров при загрузке
    useEffect(() => {
        if (!uid || !token) {
            setStatus('error');
            setErrorDetails('Неверная или неполная ссылка для восстановления пароля.');
        }
    }, [uid, token]);
    const apiFetch = async (path, options = {}) => {
        const url = path.startsWith('http') ? path : `${API_BASE}${path.startsWith('/') ? path : '/' + path}`;
        const opts = {
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            ...options,
        };
        const res = await fetch(url, opts);
        if (!res.ok) {
            const text = await res.text();
            try {
                const body = text ? JSON.parse(text) : null;
                const err = new Error(`HTTP ${res.status}`);
                err.status = res.status;
                err.body = body;
                throw err;
            } catch {
                const err = new Error(`HTTP ${res.status}: ${text}`);
                err.status = res.status;
                err.body = text;
                throw err;
            }
        }
        if (res.status === 204) return null;
        try {
            return await res.json();
        } catch {
            return null;
        }
    };
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!uid || !token) {
            setErrorDetails('Параметры ссылки отсутствуют.');
            return;
        }
        setStatus('loading');
        setMessage('');
        setErrorDetails('');
        try {
            const response = await apiFetch('/reset/', {
                method: 'POST',
                body: JSON.stringify({
                    uid,
                    token,
                    new_password: password,
                    new_password2: password2,
                }),
            });
            if (response?.message === "Пароль успешно изменён") {
                setStatus('success');
                setMessage('Пароль успешно изменён!');
                setTimeout(() => navigate('/'), 3000);
            } else {
                setStatus('error');
                setErrorDetails('Ошибка при изменении пароля.');
            }
        } catch (err) {
            console.error('Confirm reset failed:', err);
            setStatus('error');
            let body = err.body;
            if (typeof body === 'string') {
                try {
                    body = JSON.parse(body);
                } catch {}
            }
            let errorMsgs = [];
            if (body && typeof body === 'object') {
                Object.entries(body).forEach(([key, value]) => {
                    if (Array.isArray(value)) {
                        errorMsgs.push(...value);
                    } else if (typeof value === 'string') {
                        errorMsgs.push(value);
                    }
                });
                if (errorMsgs.length === 0 && body.detail) {
                    errorMsgs = [body.detail];
                } else if (errorMsgs.length === 0 && body.message) {
                    errorMsgs = [body.message];
                }
            } else if (typeof body === 'string') {
                errorMsgs = [body];
            }
            let finalError = errorMsgs.length > 0 ? errorMsgs.join(' ') : 'Ссылка недействительна или устарела.';
            setErrorDetails(finalError);
        }
    };
    return (
        <main className="confirm-reset-container">
            <h2 className="confirm-reset-header">Сброс пароля</h2>
            <div className="confirm-reset-card">
                {status !== 'success' ? (
                    <form onSubmit={handleSubmit} className="confirm-reset-form">
                        <div className="confirm-reset-info">
                            <p>Введите новый пароль для вашего аккаунта.</p>
                        </div>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="Новый пароль"
                            className="confirm-reset-input"
                            required
                        />
                        <input
                            type="password"
                            value={password2}
                            onChange={(e) => setPassword2(e.target.value)}
                            placeholder="Подтвердите пароль"
                            className="confirm-reset-input"
                            required
                        />
                        <button type="submit" className="confirm-reset-submit" disabled={status === 'loading'}>
                            {status === 'loading' ? 'Сохранение...' : 'Сохранить пароль'}
                        </button>
                        {errorDetails && <p className="error" style={{color: 'red'}}>{errorDetails}</p>}
                    </form>
                ) : (
                    <div className="activation-success">
                        <p>{message}</p>
                        <p>Вы будете перенаправлены на главную через 3 секунды.</p>
                        <a href="/" className="activation-link">Перейти сразу</a>
                    </div>
                )}
            </div>
        </main>
    );
};
export default ConfirmReset;