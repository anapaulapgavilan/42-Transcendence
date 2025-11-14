import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple translation function
export function getTranslation(key, language = 'es') {
  try {
    const filePath = path.join(__dirname, '../locales', language, 'translation.json');
    const data = fs.readFileSync(filePath, 'utf8');
    const translations = JSON.parse(data);
    
    // Navigate through nested keys
    const keys = key.split('.');
    let result = translations;
    
    for (const k of keys) {
      if (result && typeof result === 'object' && k in result) {
        result = result[k];
      } else {
        return key; // Return key if not found
      }
    }
    
    return result;
  } catch (error) {
    console.error(`Translation error for ${key}:`, error);
    return key;
  }
}

// Helper function to get language and translation function for controllers
export function getLanguageAndTranslation(request, userPreferredLanguage = null) {
  // Get language from cookie, user's preferred language, or default to 'es'
  const language = request.cookies?.i18next || userPreferredLanguage || 'es';
  
  // Create translation function
  const t = (key) => getTranslation(key, language);
  
  return { language, t };
}
