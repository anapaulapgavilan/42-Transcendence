// Helper function to get translations in EJS templates
export function getTranslation(req, key, options = {}) {
    if (req && req.t) {
        return req.t(key, options);
    }
    return key;
}

// Helper function to get current language
export function getCurrentLanguage(req) {
    if (req && req.language) {
        return req.language;
    }
    return 'es'; // default language
}

// Helper function to get available languages
export function getAvailableLanguages() {
    return [
        { code: 'es', name: 'Español', flag: '🇪🇸' },
        { code: 'en', name: 'English', flag: '🇺🇸' },
        { code: 'fr', name: 'Français', flag: '🇫🇷' }
    ];
}
