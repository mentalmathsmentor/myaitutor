export const getStudentId = () => {
    let id = localStorage.getItem('mait_student_id');
    if (!id) {
        id = `student_${crypto?.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2)}`;
        localStorage.setItem('mait_student_id', id);
    }
    return id;
};

export const getSavedAuthUser = () => {
    try {
        const saved = localStorage.getItem('mait_auth_user');
        return saved ? JSON.parse(saved) : null;
    } catch { return null; }
};
