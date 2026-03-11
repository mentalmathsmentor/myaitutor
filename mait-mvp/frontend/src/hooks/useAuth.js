import { useCallback, useEffect, useState } from 'react';


const AUTH_USER_KEY = 'mait_auth_user';
const STUDENT_ID_KEY = 'mait_student_id';
const SESSION_TOKEN_KEY = 'mait_session_token';


const getSavedAuthUser = () => {
    try {
        const saved = localStorage.getItem(AUTH_USER_KEY);
        return saved ? JSON.parse(saved) : null;
    } catch {
        return null;
    }
};


const getSavedStudentId = () => localStorage.getItem(STUDENT_ID_KEY);
const getSavedSessionToken = () => localStorage.getItem(SESSION_TOKEN_KEY);


export default function useAuth(apiUrl, callbacks = {}) {
    const [authUser, setAuthUser] = useState(getSavedAuthUser);
    const [studentId, setStudentId] = useState(getSavedStudentId);
    const [sessionToken, setSessionToken] = useState(getSavedSessionToken);
    const [authLoading, setAuthLoading] = useState(false);
    const [authReady, setAuthReady] = useState(Boolean(getSavedSessionToken()));

    const persistSession = useCallback(({ student_id, session_token, user = null }) => {
        if (student_id) {
            localStorage.setItem(STUDENT_ID_KEY, student_id);
            setStudentId(student_id);
        }

        if (session_token) {
            localStorage.setItem(SESSION_TOKEN_KEY, session_token);
            setSessionToken(session_token);
        }

        if (user) {
            const authPayload = {
                student_id,
                name: user.name,
                email: user.email,
                picture: user.picture,
            };
            localStorage.setItem(AUTH_USER_KEY, JSON.stringify(authPayload));
            setAuthUser(authPayload);
        } else {
            localStorage.removeItem(AUTH_USER_KEY);
            setAuthUser(null);
        }
    }, []);

    const bootstrapAnonymousSession = useCallback(async () => {
        setAuthLoading(true);
        try {
            const res = await fetch(`${apiUrl}/auth/anonymous`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                throw new Error('Anonymous session bootstrap failed');
            }
            const data = await res.json();
            persistSession(data);
            return data;
        } finally {
            setAuthReady(true);
            setAuthLoading(false);
        }
    }, [apiUrl, persistSession]);

    useEffect(() => {
        if (!sessionToken) {
            bootstrapAnonymousSession().catch((error) => {
                console.error('Failed to bootstrap anonymous session:', error);
            });
        }
    }, [sessionToken, bootstrapAnonymousSession]);

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
                body: JSON.stringify({
                    token: credentialResponse.credential,
                    merge_from_student_id: studentId,
                }),
            });
            if (!res.ok) {
                throw new Error('Auth failed');
            }

            const data = await res.json();
            persistSession(data);
            callbacks.onLoginSuccess?.();
        } catch (e) {
            console.error('Google login error:', e);
        } finally {
            setAuthLoading(false);
            setAuthReady(true);
        }
    }, [apiUrl, callbacks, persistSession, studentId]);

    const handleLogout = useCallback(() => {
        localStorage.removeItem(AUTH_USER_KEY);
        localStorage.removeItem(STUDENT_ID_KEY);
        localStorage.removeItem(SESSION_TOKEN_KEY);
        setAuthUser(null);
        setStudentId(null);
        setSessionToken(null);
        setAuthReady(false);
        callbacks.onLogout?.();
    }, [callbacks]);

    return {
        authUser,
        studentId,
        sessionToken,
        authLoading,
        authReady,
        handleLoginSubmit,
        handleGoogleSuccess,
        handleLogout,
        bootstrapAnonymousSession,
    };
}
