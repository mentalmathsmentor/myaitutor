let transientStudentId;
// Storage may be denied (private browsing, blocked site data); callers fall back to in-memory state.
export const readStorage = key => { try { return localStorage.getItem(key); } catch { return null; } };
export const writeStorage = (key, value) => { try { localStorage.setItem(key, value); } catch { /* Keep in-memory state only. */ } };
export const removeStorage = key => { try { localStorage.removeItem(key); } catch { /* Keep in-memory state only. */ } };
export const newStudentId = () => `student_${crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2)}`;

export const getStudentId = () => {
    let id;
    try { id = localStorage.getItem('mait_student_id'); } catch { /* Storage may be denied in private browsing. */ }
    if (!id) {
        id = transientStudentId || newStudentId();
        transientStudentId = id;
        try { localStorage.setItem('mait_student_id', id); } catch { /* Retain only for this page lifetime. */ }
    }
    return id;
};

export const getSavedAuthUser = () => {
    try {
        const saved = localStorage.getItem('mait_auth_user');
        return saved ? JSON.parse(saved) : null;
    } catch { return null; }
};
