# ft_transcendence

Proyecto final de 42 Madrid - Plataforma web de juego Pong con funcionalidades avanzadas de usuario, IA y seguridad.

## 🎯 Descripción

ft_transcendence es una aplicación web de una sola página (SPA) que implementa el clásico juego Pong con características modernas como:

- Sistema completo de gestión de usuarios
- Autenticación 2FA y OAuth con Google
- IA para oponente automático
- Torneos y sistema de ranking
- Múltiples idiomas y compatibilidad cross-browser

## 🏗️ Arquitectura del Proyecto

### Stack Tecnológico

**Backend:**
- **Framework**: Fastify con Node.js
- **Base de datos**: SQLite con better-sqlite3
- **Autenticación**: JWT + 2FA (SMS, Email, App)
- **API**: RESTful con módulos ES

**Frontend:**
- **Estilo**: Tailwind CSS
- **Lenguaje**: TypeScript
- **Arquitectura**: SPA (Single Page Application)
- **Compatibilidad**: Firefox (principal) + navegador adicional

**Seguridad:**
- JSON Web Tokens (JWT)
- Two-Factor Authentication (2FA)
- OAuth Google Sign-in
- Variables de entorno para credenciales

## 📁 Estructura del Proyecto

```
ft_transcendence/
├── src/
│   ├── app.js                 # Punto de entrada del servidor
│   ├── config/
│   │   └── db.js             # Configuración de base de datos
│   ├── controllers/          # Lógica de controladores
│   ├── routes/
│   │   └── routes.js         # Definición de rutas
│   ├── views/                # Templates EJS
│   ├── styles/
│   │   └── input.css         # Estilos Tailwind
│   └── public/               # Archivos estáticos
├── db/                       # Base de datos SQLite
├── migrations/               # Scripts de migración SQL
├── scripts/
│   └── migrate.js           # Script de migraciones
├── package.json
├── tailwind.config.js
└── README.md
```

## 🚀 Instalación y Configuración (Método Recomendado)

El proyecto está completamente dockerizado. La forma más sencilla y garantizada de levantarlo es usando Docker Compose, lo cual maneja la instalación de dependencias, la compilación de estilos y el inicio del servidor en un único paso.

### Prerrequisitos

- Docker y Docker Compose: Instalado y corriendo en el sistema (Docker Desktop, Podman o similar).

### Instalación y Lanzamiento Paso a Paso (Docker)

1. **Clonar el repositorio**
   ```bash
   git clone [URL_DEL_REPOSITORIO]
   cd ft_transcendence
   ```

2. **AConfigurar variables de entorno**
Crea el archivo .env en la raíz (ver sección de Configuración Adicional).
 Edita .env con tus credenciales (Google OAuth, JWT, etc.)
   ```bash
   cp .env.example .env
   ```

3. **Lanzar el Proyecto - Este comando construye la imagen, instala dependencias, ejecuta el script de build (compilación de CSS) y levanta el servidor Node.js/Fastify.**
   ```bash
   docker compose up -d --build --force-recreate
   ```

Nota: Debes tener iniciada la sesión en Docker Hub (docker login) para evitar problemas con los límites de descarga de imágenes base (node:20-alpine).


## 🏃‍♂️ Ejecución

### Acceso a la Aplicación
Una vez que Docker Compose termine, la aplicación estará disponible en:

 **Iniciar el servidor de desarrollo**
   ```bash
  https://localhost:10000
   ```

 ###Gestión de Contenedores
 
 **Detener la aplicación**
 Detiene y elimina el contenedor.
   ```bash
   docker compose down
   ```

 **Ver logs (errores)**
 Muestra la salida en tiempo real del servidor Fastify.
   ```bash
   docker logs ft_transcendence_frontend -f
   ```

 **Acceder a la terminal**
 Abre un shell interactivo dentro del contenedor.
   ```bash
   docker exec -it ft_transcendence_frontend /bin/sh
   ```

### Operaciones Internas (Dentro del Contenedor)
### Para ejecutar operaciones de mantenimiento (como migraciones) en el entorno Docker:

Ejecutar migraciones de base de datos
- `docker exec -it ft_transcendence_frontend npm run migrate`
- 
## 🔧 Configuración Adicional

### Base de Datos

El proyecto utiliza SQLite con el archivo de base de datos ubicado en `db/transcendence.db`. Las migraciones se ejecutan automáticamente al usar `npm run migrate`.

### Tailwind CSS

Los estilos se definen en `src/styles/input.css` y se compilan a `public/styles.css`. La configuración está en `tailwind.config.js`.

### Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto con:

```env
# Google OAuth
GOOGLE_CLIENT_ID=tu_client_id
GOOGLE_CLIENT_SECRET=tu_client_secret

# JWT
JWT_SECRET=tu_jwt_secret_muy_seguro

# 2FA
SMS_API_KEY=tu_api_key_sms
EMAIL_API_KEY=tu_api_key_email

# Base de datos
DATABASE_PATH=./db/transcendence.db
```

## 🎮 Funcionalidades Principales

### Gestión de Usuarios
- Registro y login con email/contraseña
- Autenticación OAuth con Google
- Perfiles de usuario con avatares
- Sistema de amigos y estado online
- Historial de partidas y estadísticas

### Juego Pong
- Partidas 1v1 entre usuarios
- IA como oponente (no utiliza algoritmo A*)
- Controles responsive
- Sistema de puntuación en tiempo real

### Seguridad
- Autenticación de dos factores (2FA)
- Tokens JWT para sesiones
- Protección de rutas sensibles
- Validación de datos de entrada

### Torneos
- Creación y gestión de torneos
- Sistema de brackets
- Rankings y estadísticas
- Histórico de resultados

## 🌐 Navegadores Soportados

- **Principal**: Mozilla Firefox (última versión estable)
- **Secundario**: Chrome/Chromium (última versión estable)

## 🛠️ Desarrollo

### Estructura de Módulos

El proyecto sigue una arquitectura modular con:
- **Módulos ES**: Utilizando `import/export`
- **Fastify plugins**: Para funcionalidades reutilizables
- **Separación de responsabilidades**: Controladores, rutas, configuración

### Contribución

1. Fork del repositorio
2. Crear una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`
3. Commit de tus cambios: `git commit -m 'Add nueva funcionalidad'`
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Crear un Pull Request

## 📋 Módulos Implementados

### Major Modules (1pt cada uno)
- ✅ Framework backend (Fastify)
- ✅ Gestión estándar de usuarios
- ✅ Autenticación remota (Google OAuth)
- ✅ Oponente IA
- ✅ 2FA y JWT

### Minor Modules (0.5pt cada uno)
- ✅ Framework/toolkit frontend (Tailwind CSS)
- ✅ Base de datos backend (SQLite)
- ✅ Compatibilidad navegadores
- ✅ Soporte múltiples idiomas

## 🐛 Troubleshooting

### Problemas Comunes

1. **Error al iniciar el servidor**
   ```bash
   # Verificar que el puerto 3000 esté libre
   lsof -i :3000
   # Matar proceso si es necesario
   kill -9 [PID]
   ```

2. **Error de base de datos**
   ```bash
   # Recrear la base de datos
   rm db/transcendence.db
   npm run migrate
   ```

3. **Problemas con CSS**
   ```bash
   # Limpiar y recompilar
   rm public/styles.css
   npm run watch:css
   ```

4. **Error de dependencias**
   ```bash
   # Limpiar e instalar
   rm -rf node_modules package-lock.json
   npm install
   ```

## 📞 Soporte

Para problemas o preguntas:
1. Revisar la documentación en este README
2. Consultar los logs del servidor
3. Verificar las variables de entorno
4. Contactar al equipo de desarrollo

## 👥 Equipo de Desarrollo

- Álvaro Rodríguez Rodrigo
- Victoria Codreanu  
- Christian Yacoub Obage
- Santiago Bergs Fernández de Bobadilla
- Ana Paula Pérez-Gavilán Pliego

## 📄 Licencia

Este proyecto es parte del curriculum de 42 Madrid. Consulta las políticas de la escuela para más información sobre el uso y distribución.

---

**Nota**: Este README se mantendrá actualizado conforme el proyecto evolucione. Para la versión más reciente, consulta el repositorio del proyecto.
