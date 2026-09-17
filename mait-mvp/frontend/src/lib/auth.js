let transientStudentId;
export const getStudentId = () => {
    let id;
    try { id = localStorage.getItem('mait_student_id'); } catch { /* Storage may be denied in private browsing. */ }
    if (!id) {
        id = transientStudentId || `student_${crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2)}`;
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
