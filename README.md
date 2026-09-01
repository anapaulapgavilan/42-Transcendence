# Transcendence

![42](https://img.shields.io/badge/42-School-000000?style=flat-square&logo=42&logoColor=white) ![Language](https://img.shields.io/badge/lang-JavaScript%2FTypeScript%20%2B%20Fastify%20%2B%20Docker-blue?style=flat-square) ![Status](https://img.shields.io/badge/status-completed-success?style=flat-square)

Full-stack web app with authentication, gameplay, and containerized deployment.

## About This Project

### What It Does

Transcendence is a full-stack web application built around a real-time, browser-playable version of Pong, wrapped with the features a real product needs: account creation and login (including Google sign-in), user profiles with match history and stats, a friends list, and both quick matches (including a play-against-AI mode) and multi-player tournaments.

The backend is a Fastify (Node.js) server that serves the app, exposes the game and account APIs, and drives real-time gameplay over WebSockets, backed by SQLite for persistence. The frontend is server-rendered with EJS and styled with Tailwind CSS. The whole stack runs behind Nginx inside a single Docker Compose service, self-signed TLS certificates included, so it can be deployed with one command.

### Purpose

It evaluates the ability to design and ship a complete web product end-to-end: authentication and session security, real-time bidirectional communication for gameplay, relational data modeling for users/matches/tournaments, and a reproducible containerized deployment, rather than any single isolated technique.

## Stack

- School: 42
- Primary language: JavaScript/TypeScript + Fastify + Docker
- Scope: one repository per project

## Skills Demonstrated

`Full-stack development` | `Authentication/security` | `Real-time WebSockets` | `Relational data modeling` | `Containerized deployment`

## Features

- User authentication and session management
- Real-time multiplayer gameplay via WebSockets
- Full deployment with Docker Compose and Nginx as reverse proxy
- Tailwind CSS frontend with a Fastify backend

## Review Focus

- Look for the full product surface: authentication, profiles, match history, friends, AI mode, and tournaments.
- Review WebSocket gameplay flow and how server state stays consistent during real-time matches.
- Notice the deployment story: app, backend, database, TLS, and reverse proxy running as a reproducible stack.

## Screenshots

![dashboard](docs/screenshots/dashboard.png)

![gameplay](docs/screenshots/gameplay.png)

![landing](docs/screenshots/landing.png)

![login](docs/screenshots/login.png)

![profile](docs/screenshots/profile.png)

![signup](docs/screenshots/signup.png)

![tournament](docs/screenshots/tournament.png)

## How to Run

Prerequisites (Docker option): Docker and Docker Compose, plus a `.env` file at the project root with `COOKIE_SECRET`, `JWT_SECRET`, and `GOOGLE_CLIENT_ID` (a placeholder value works if Google sign-in is not needed). Prerequisites (local option): Node.js 20+ and npm.

Docker option (recommended):

~~~bash
docker compose up --build -d
~~~

Open: https://localhost:10000

Local option (without Docker):

~~~bash
npm install
npm run build
npm run dev
~~~

## Testing

No dedicated testing scripts were detected at the project root.

## Notes

- This repository is part of the 42 portfolio.
- Commands are intended for local execution for review and evaluation.

## Author

anapaulapgavilan
