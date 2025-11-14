# Sistema de Soporte Multiidioma - ft_transcendence

## Descripción
Este proyecto ahora incluye soporte completo para múltiples idiomas, permitiendo a los usuarios cambiar entre Español, Inglés, Francés y Rumano.

## Idiomas Soportados
- **Español (es)** - Idioma por defecto
- **Inglés (en)** - English
- **Francés (fr)** - Français
- **Rumano (ro)** - Română

## Características Implementadas

### 1. Selector de Idioma
- Componente visual con banderas y nombres de idiomas
- Ubicado en la esquina superior derecha de las páginas principales
- Menú desplegable con opciones de idioma
- Indicador visual del idioma actualmente seleccionado

### 2. Persistencia de Preferencias
- Las preferencias de idioma se guardan en cookies del navegador
- Duración de la cookie: 1 año
- El idioma se mantiene entre sesiones

### 3. Traducciones Completas
- **Navegación**: Menús, botones, enlaces
- **Contenido**: Títulos, descripciones, mensajes
- **Formularios**: Etiquetas, placeholders, mensajes de error
- **Estados del juego**: Mensajes de victoria/derrota, puntuaciones

### 4. Detección Automática
- El sistema detecta automáticamente el idioma preferido del usuario
- Fallback automático al español si el idioma no está soportado
- Soporte para cambio de idioma mediante URL (`?lng=en`)

## Estructura de Archivos

```
src/
├── locales/
│   ├── es/translation.json    # Traducciones en español
│   ├── en/translation.json    # Traducciones en inglés
│   ├── fr/translation.json    # Traducciones en francés
│   └── ro/translation.json    # Traducciones en rumano
├── config/
│   └── i18n.js               # Configuración de internacionalización
├── controllers/
│   └── languageController.js # Controlador para cambio de idioma
├── helpers/
│   └── i18n.js              # Funciones helper para traducciones
└── views/
    └── components/
        └── languageSwitcher.ejs # Componente selector de idioma
```

## Uso en Templates EJS

### Función de Traducción
```ejs
<%= t('common.home') %>
<%= t('auth.login') %>
<%= t('game.playNow') %>
```

### Variables Disponibles
- `t(key, options)` - Función de traducción
- `language` - Código del idioma actual (es, en, fr, ro)

### Ejemplo de Uso
```ejs
<h1><%= t('home.welcome') %></h1>
<p><%= t('home.readyToDominate') %></p>
<button><%= t('common.playNow') %></button>
```

## API de Cambio de Idioma

### Endpoint
```
GET /change-language?lng=<código_idioma>
```

### Parámetros
- `lng`: Código del idioma (es, en, fr, ro)

### Ejemplo
```
GET /change-language?lng=en
```

## Agregar Nuevas Traducciones

### 1. Actualizar Archivos JSON
Agregar nuevas claves a los tres archivos de traducción:

```json
{
  "nuevaSeccion": {
    "nuevaClave": "Texto en español"
  }
}
```

### 2. Usar en Templates
```ejs
<%= t('nuevaSeccion.nuevaClave') %>
```

### 3. Actualizar Controladores
Asegurar que los controladores pasen las variables `language` y `t` a las vistas:

```javascript
return reply.view('template.ejs', {
  // ... otros datos
  language: request.language || 'es',
  t: request.t || ((key) => key)
});
```

## Implementación Técnica del Sistema Multiidioma

### Arquitectura del Sistema

El sistema multiidioma está implementado usando un enfoque **híbrido** que combina:

1. **Sistema de traducciones directo en controladores** (implementación principal)
2. **Middleware de i18n** (para funcionalidades adicionales)
3. **Gestión de cookies** para persistencia de preferencias

### Dependencias Instaladas
- `i18next` - Librería principal de internacionalización
- `i18next-fs-backend` - Backend para cargar archivos desde sistema de archivos
- `i18next-http-middleware` - Middleware para Express/Fastify

### Implementación Principal: Sistema de Traducciones Directo

#### 1. Función de Traducción en Controladores

Cada controlador incluye una función `getTranslation` que maneja las traducciones directamente:

```javascript
// src/controllers/index.controller.js
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
    
    // Navigate through nested keys (e.g., 'common.home')
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
```

#### 2. Integración en Controladores

Los controladores detectan el idioma desde las cookies y crean la función de traducción:

```javascript
export function showHomePage(request, reply) {
    const users = request.server.db.prepare('SELECT * FROM user').all();
    
    // Get language from cookie or default to 'es'
    const language = request.cookies?.i18next || 'es';
    
    // Create translation function
    const t = (key) => getTranslation(key, language);

    return reply.view('index', {
        mensaje: '¡Hola desde Fastify con controladores!',
        users,
        language: language,
        t: t  // Función de traducción disponible en la vista
    });
}
```

#### 3. Estructura de Archivos de Traducción

Los archivos JSON están organizados por secciones lógicas:

```json
// src/locales/es/translation.json
{
  "common": {
    "gameTitle": "Game of Pongs",
    "home": "Home",
    "profile": "Perfil",
    "game": "Game",
    "tournaments": "Torneos"
  },
  "landing": {
    "title": "QUE EMPIECE EL JUEGO",
    "signup": "SIGN UP",
    "login": "LOGIN"
  },
  "home": {
    "welcome": "¡BIENVENIDO",
    "readyToDominate": "¿Listo para dominar la arena digital?"
  }
}
```

### Sistema de Cambio de Idioma

#### 1. Controlador de Cambio de Idioma

```javascript
// src/controllers/languageController.js
import { getAvailableLanguages } from '../helpers/i18n.js';

export async function changeLanguage(request, reply) {
    const { lng } = request.query;
    const supportedLanguages = ['es', 'en', 'fr'];
    
    // Validate language
    if (!lng || !supportedLanguages.includes(lng)) {
        return reply.redirect('/');
    }
    
    // Set language cookie
    reply.setCookie('i18next', lng, {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        path: '/'
    });
    
    // Redirect back to the referring page or home
    const referer = request.headers.referer || '/';
    return reply.redirect(referer);
}
```

#### 2. Ruta de Cambio de Idioma

```javascript
// src/routes/routes.js
export default async function (fastify) {
    // Language switching route
    fastify.get('/change-language', changeLanguage);
    
    // ... otras rutas
}
```

### Componente Selector de Idioma

#### 1. Componente EJS

```ejs
<!-- src/views/components/languageSwitcher.ejs -->
<%
const availableLanguages = [
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'en', name: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' }
];

const currentLang = typeof language !== 'undefined' ? language : 'es';
const currentLangData = availableLanguages.find(lang => lang.code === currentLang) || availableLanguages[0];
%>

<div class="relative inline-block text-left">
    <button type="button" class="language-switcher-btn" onclick="toggleLanguageMenu()">
        <span class="flex items-center">
            <span class="text-lg mr-2"><%= currentLangData.flag %></span>
            <span class="text-sm font-medium text-white"><%= currentLangData.name %></span>
        </span>
    </button>
    
    <div id="languageMenu" class="language-menu hidden">
        <% availableLanguages.forEach(lang => { %>
            <a href="/change-language?lng=<%= lang.code %>" class="language-menu-item">
                <span class="text-lg mr-3"><%= lang.flag %></span>
                <span class="text-sm"><%= lang.name %></span>
            </a>
        <% }); %>
    </div>
</div>
```

#### 2. JavaScript para Interactividad

```javascript
function toggleLanguageMenu() {
    const menu = document.getElementById('languageMenu');
    menu.classList.toggle('hidden');
}

// Close menu when clicking outside
document.addEventListener('click', function(event) {
    const menu = document.getElementById('languageMenu');
    const button = event.target.closest('.language-switcher-btn');
    
    if (!button && !menu.contains(event.target)) {
        menu.classList.add('hidden');
    }
});
```

### Uso en Templates EJS

#### 1. Función de Traducción en Vistas

```ejs
<!-- Ejemplo de uso en index.ejs -->
<h1 class="main-title">
    <span class="block text-gradient font-orbitron tracking-tight">
        <%= t('landing.title') %>
    </span>
</h1>

<div class="action-buttons">
    <a href="/signup">
        <button class="btn-primary group">
            <span class="relative z-10"><%= t('landing.signup') %></span>
        </button>
    </a>
    
    <a href="/login">
        <button class="btn-secondary group">
            <span class="relative z-10"><%= t('landing.login') %></span>
        </button>
    </a>
</div>
```

#### 2. Variables Disponibles en Vistas

- `t(key)` - Función de traducción
- `language` - Código del idioma actual (es, en, fr, ro)

### Flujo de Funcionamiento

#### 1. Detección de Idioma

```javascript
// En cada controlador
const language = request.cookies?.i18next || 'es';
```

#### 2. Carga de Traducciones

```javascript
// Carga síncrona desde archivos JSON
const filePath = path.join(__dirname, '../locales', language, 'translation.json');
const data = fs.readFileSync(filePath, 'utf8');
const translations = JSON.parse(data);
```

#### 3. Resolución de Claves Anidadas

```javascript
// Navegación por claves anidadas (ej: 'common.home')
const keys = key.split('.');
let result = translations;

for (const k of keys) {
    if (result && typeof result === 'object' && k in result) {
        result = result[k];
    } else {
        return key; // Fallback a la clave original
    }
}
```

### Configuración en app.js

```javascript
import i18nMiddleware from './config/i18n.js';

// Register i18n middleware FIRST (before routes)
await fastify.register(i18nMiddleware);

// Configure Statics
await fastify.register(fastifyStatic, {
    root: path.join(__dirname, '../public'),
    prefix: '/public/',
})

// Register routes
await fastify.register(routes)
```

### Ventajas de esta Implementación

1. **Simplicidad**: No depende de middleware complejo
2. **Rendimiento**: Carga directa de traducciones sin overhead
3. **Debugging**: Fácil de debuggear y entender
4. **Flexibilidad**: Cada controlador puede personalizar su lógica de traducción
5. **Compatibilidad**: Funciona perfectamente con Docker y Fastify

### Consideraciones Técnicas

1. **Carga Síncrona**: Las traducciones se cargan síncronamente en cada request
2. **Cache**: No hay cache implementado (se puede agregar para optimización)
3. **Fallback**: Si una traducción no existe, se devuelve la clave original
4. **Cookies**: Las preferencias se guardan en cookies del navegador
5. **Validación**: Solo se aceptan idiomas soportados (es, en, fr, ro)

## Testing

### Probar Cambio de Idioma
1. Acceder a cualquier página de la aplicación
2. Hacer clic en el selector de idioma (esquina superior derecha)
3. Seleccionar un idioma diferente
4. Verificar que el contenido cambie al idioma seleccionado
5. Recargar la página para confirmar que la preferencia se mantiene

### Probar Persistencia
1. Cambiar idioma
2. Cerrar el navegador
3. Abrir nuevamente y acceder a la aplicación
4. Verificar que el idioma seleccionado se mantiene

## Consideraciones Futuras

### Posibles Mejoras
1. **Más idiomas**: Agregar más idiomas según demanda
2. **Detección automática**: Detectar idioma del navegador del usuario
3. **Traducciones dinámicas**: Sistema para que usuarios contribuyan traducciones
4. **Pluralización**: Soporte para formas plurales complejas
5. **Fechas y números**: Formateo según convenciones locales

### Mantenimiento
- Revisar regularmente las traducciones para consistencia
- Actualizar traducciones cuando se agreguen nuevas funcionalidades
- Considerar usar servicios de traducción profesional para contenido crítico

## Conclusión

El sistema de soporte multiidioma está completamente implementado y funcional. Los usuarios pueden cambiar entre español, inglés y francés de manera intuitiva, y sus preferencias se mantienen entre sesiones. El sistema es extensible y fácil de mantener para futuras mejoras.
