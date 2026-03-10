import { useState, useCallback } from 'react'

const getSavedAuthUser = () => {
    try {
        const saved = localStorage.getItem('mait_auth_user');
        return saved ? JSON.parse(saved) : null;
    } catch { return null; }
};

const getStudentId = () => {
    let id = localStorage.getItem('mait_student_id');
    if (!id) {
        id = `student_${crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2)}`;
        localStorage.setItem('mait_student_id', id);
    }
    return id;
};

/**
 * useAuth — manages auth state (user, studentId), Google login, access code fallback, logout.
 * Extracted from App.jsx to reduce monolith complexity.
 *
 * @param {string} apiUrl - The backend API base URL
 * @param {object} callbacks - Side-effect callbacks: { onLoginSuccess, onLogout }
 */
export default function useAuth(apiUrl, callbacks = {}) {
    const [authUser, setAuthUser] = useState(getSavedAuthUser);
    const [studentId, setStudentId] = useState(() => {
        const saved = getSavedAuthUser();
        return saved?.student_id || getStudentId();
    });
    const [authLoading, setAuthLoading] = useState(false);

    const handleLoginSubmit = useCallback(async (code) => {
        try {
            const res = await fetch(`${apiUrl}/auth/verify-access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ code }),
            });
            if (res.ok) {
                callbacks.onLoginSuccess?.();
                return true;
            }
            return false;
        } catch (e) {
            console.warn('Backend verification failed:', e);
            return false;
        }
    }, [apiUrl, callbacks]);

    const handleGoogleSuccess = useCallback(async (credentialResponse) => {
        setAuthLoading(true);
        try {
            const res = await fetch(`${apiUrl}/auth/google`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token: credentialResponse.credential }),
            });
            if (!res.ok) throw new Error('Auth failed');
            const data = await res.json();

            const user = {
                student_id: data.student_id,
                name: data.user.name,
                email: data.user.email,
                picture: data.user.picture,
            };

            // If this is a new Google user and we had anonymous data, migrate it
            const oldId = localStorage.getItem('mait_student_id');
            if (data.status === 'new' && oldId && oldId !== data.student_id) {
                try {
                    await fetch(`${apiUrl}/auth/migrate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ old_student_id: oldId, new_student_id: data.student_id }),
                    });
                } catch (e) {
                    console.warn('Migration failed (non-fatal):', e);
                }
            }

            // Persist auth state
            localStorage.setItem('mait_auth_user', JSON.stringify(user));
            localStorage.setItem('mait_student_id', data.student_id);
            setAuthUser(user);
            setStudentId(data.student_id);
            callbacks.onLoginSuccess?.();
        } catch (e) {
            console.error('Google login error:', e);
        } finally {
            setAuthLoading(false);
        }
    }, [apiUrl, callbacks]);

    const handleLogout = useCallback(() => {
        localStorage.removeItem('mait_auth_user');
        const newId = `student_${crypto.randomUUID()}`;
        localStorage.setItem('mait_student_id', newId);
        setAuthUser(null);
        setStudentId(newId);
        callbacks.onLogout?.();
    }, [callbacks]);

    return {
        authUser,
        studentId,
        authLoading,
        handleLoginSubmit,
        handleGoogleSuccess,
        handleLogout,
    };
}
