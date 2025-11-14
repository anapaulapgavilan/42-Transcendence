import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple translation system
class TranslationManager {
  constructor() {
    this.translations = {};
    this.currentLanguage = 'es';
    this.loadTranslations();
  }

  loadTranslations() {
    const localesDir = path.join(__dirname, '../locales');
    const languages = ['es', 'en', 'fr', 'ro'];
    
    languages.forEach(lang => {
      const filePath = path.join(localesDir, lang, 'translation.json');
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        this.translations[lang] = JSON.parse(data);
        console.log(`✅ Loaded translations for ${lang}`);
      } catch (error) {
        console.error(`❌ Error loading translations for ${lang}:`, error);
        this.translations[lang] = {};
      }
    });
  }

  t(key, lang = 'es') {
    const language = lang;
    const translation = this.translations[language];
    
    if (!translation) {
      console.error(`❌ No translations found for language: ${language}`);
      return key;
    }

    // Navigate through nested keys (e.g., 'common.home')
    const keys = key.split('.');
    let result = translation;
    
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        console.error(`❌ Translation key not found: ${key} in ${language}`);
        return key;
      }
    }
    
    console.log(`✅ Translation: ${key} -> ${result} (${language})`);
    return result;
  }
}

// Create global instance
const translationManager = new TranslationManager();

// Simple middleware function
export function i18nMiddleware(request, reply, done) {
  console.log(`📝 i18nMiddleware executing for: ${request.method} ${request.url}`);
  
  // Get language from cookie, query param, or header
  let language = request.cookies?.i18next || request.query?.lng || 'es';
  
  // Validate language
  const supportedLanguages = ['es', 'en', 'fr', 'ro'];
  if (!supportedLanguages.includes(language)) {
    language = 'es';
  }
  
  // Set language in request
  request.language = language;
  
  // Create translation function
  request.t = (key, options = {}) => {
    const result = translationManager.t(key, language);
    console.log(`🔤 Translation: ${key} -> ${result}`);
    return result;
  };
  
  console.log(`🌍 Language set to: ${language}, t function available: ${!!request.t}`);
  
  // Change language if requested
  if (request.query?.lng && supportedLanguages.includes(request.query.lng)) {
    reply.setCookie('i18next', request.query.lng, {
      maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
      httpOnly: false,
      secure: false,
      sameSite: 'lax',
      path: '/'
    });
  }
  
  done();
}

// Fastify plugin for i18n
export default async function i18nPlugin(fastify, options) {
  console.log('🔧 Registering i18n middleware...');
  
  // Register the middleware
  fastify.addHook('preHandler', i18nMiddleware);
  
  console.log('✅ i18n middleware registered successfully');
}