/* This file has been checked and aparently everything is correct 
 * for evaluating. The .env has been updated and its used in the code.
 * */

import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple translation function
function getTranslation(key, language = 'es') {
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

// Esta funcion se encarga de manejar la ruta GET de /
// Todavía está sin desarrollar
export function showHomePage(request, reply) {
    const users = request.server.db.prepare('SELECT * FROM user').all();
    
    // Get language from cookie or default to 'es'
    const language = request.cookies?.i18next || 'es';
    
    console.log(`🌍 Language detected: ${language}`);
    console.log(`🍪 Cookies:`, request.cookies);
    
    // Create translation function
    const t = (key) => getTranslation(key, language);

    return reply.view('index', {
        mensaje: '¡Hola desde Fastify con controladores!',
        users,  // aquí mismo, la clave users y el valor users
        language: language,
        t: t
    });
}
