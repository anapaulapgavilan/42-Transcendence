# Transcendence

![42](https://img.shields.io/badge/42-School-000000?style=flat-square&logo=42&logoColor=white) ![Language](https://img.shields.io/badge/lang-JavaScript%2FTypeScript%20%2B%20Fastify%20%2B%20Docker-blue?style=flat-square) ![Status](https://img.shields.io/badge/status-completed-success?style=flat-square)

Aplicacion web full-stack con autenticacion, juego y despliegue en contenedor.

## Stack

- School: 42
- Lenguaje principal: JavaScript/TypeScript + Fastify + Docker
- Alcance: un repositorio por proyecto

## Features

- Autenticacion de usuarios y gestion de sesiones
- Juego multiplayer en tiempo real via WebSockets
- Despliegue completo con Docker Compose y Nginx como reverse proxy
- Frontend con Tailwind CSS y backend con Fastify

## Screenshots

| Landing | Login / Signup | Dashboard |
|---|---|---|
| ![Landing](docs/screenshots/landing.png) | ![Login](docs/screenshots/login.png) | ![Dashboard](docs/screenshots/dashboard.png) |

| Gameplay | Perfil | Torneos |
|---|---|---|
| ![Gameplay](docs/screenshots/gameplay.png) | ![Perfil](docs/screenshots/profile.png) | ![Torneos](docs/screenshots/tournament.png) |

## Como Ejecutarlo

Opcion Docker (recomendada):

~~~bash
docker compose up --build -d
~~~

Abrir: https://localhost:10000

Opcion local (sin Docker):

~~~bash
npm install
npm run build
npm run dev
~~~

## Pruebas

No se detectaron scripts de testing dedicados en la raiz.

## Notas

- Este repositorio forma parte del portfolio de 42.
- Los comandos estan orientados a ejecucion local para revision y evaluacion.

## Autora

anapaulapgavilan
