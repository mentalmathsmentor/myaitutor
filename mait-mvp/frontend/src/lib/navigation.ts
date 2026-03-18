export type Section = 'landing' | 'resources' | 'worksheets' | 'pastpapers' | 'app' | 'demo' | 'privacy';

export const VALID_PAGES: Section[] = ['landing', 'resources', 'worksheets', 'pastpapers', 'app', 'demo', 'privacy'];

export function getPageFromPath(): Section {
    // Support both clean URLs (/pastpapers) and legacy hash URLs (/#/pastpapers)
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash && VALID_PAGES.includes(hash)) {
        // Migrate hash URL to clean URL
        window.history.replaceState(null, '', hash === 'landing' ? '/' : `/${hash}`);
        return hash;
    }
    const path = window.location.pathname.replace(/^\//, '') || 'landing';
    return VALID_PAGES.includes(path) ? path : 'landing';
}

export function navigateTo(page: Section) {
    const url = page === 'landing' ? '/' : `/${page}`;
    window.history.pushState(null, '', url);
    window.dispatchEvent(new Event('popstate'));
    window.scrollTo({ top: 0, behavior: 'instant' });
}
