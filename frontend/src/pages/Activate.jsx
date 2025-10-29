import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../css/home/Activate.css';  // Адаптированный CSS

const API_BASE = import.meta.env.VITE_API_BASE;

const Activate = () => {
    const { uidb64, token } = useParams();
    const navigate = useNavigate();
    const { login } = useAuth();  // Оставляем для возможного будущего, но backend не возвращает токены
    const [status, setStatus] = useState('loading');
    const [message, setMessage] = useState('');
    const [errorDetails, setErrorDetails] = useState('');

    // apiFetch (как в Cart, с обработкой 400)
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

    useEffect(() => {
        const activateAccount = async () => {
            try {
                const response = await apiFetch(`/activate/${uidb64}/${token}/`, { method: 'GET' });

                if (response?.detail === "Аккаунт успешно активирован") {  // Адаптировано под реальный ответ backend
                    setStatus('success');
                    setMessage('Ваш аккаунт успешно активирован!');

                    // Backend не возвращает токены, так что авто-логин не нужен. Если добавят — раскомментировать
                    // if (response.access && response.refresh) {
                    //   login(response.access, response.refresh);
                    // }

                    setTimeout(() => navigate('/'), 3000);  // Редирект на главную
                } else {
                    setStatus('error');
                    setMessage('Ошибка активации аккаунта');
                    setErrorDetails('Ссылка недействительна или устарела. Попробуйте зарегистрироваться заново.');
                }
            } catch (err) {
                console.error('Activation failed:', err);
                setStatus('error');
                setMessage('Ошибка активации аккаунта');
                setErrorDetails(err.body?.detail || 'Проверьте ссылку из email или попробуйте позже.');  // Обработка 400 с detail
            }
        };

        activateAccount();
    }, [uidb64, token, navigate, login]);

    return (
        <main className="activation-container">
            <h2 className="activation-header">Активация аккаунта</h2>

            <div className="activation-card">
                {status === 'loading' && (
                    <div className="activation-info">
                        <p>Активация в процессе...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="activation-success">
                        <p>{message}</p>
                        <p>Вы будете перенаправлены на главную через 3 секунды.</p>
                        <a href="/" className="activation-link">Перейти сразу</a>
                    </div>
                )}

                {status === 'error' && (
                    <div className="activation-error">
                        <p>{message}</p>
                        <p>{errorDetails}</p>
                    </div>
                )}
            </div>
        </main>
    );
};

export default Activate;