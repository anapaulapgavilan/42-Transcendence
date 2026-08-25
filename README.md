# Transcendence

![42](https://img.shields.io/badge/42-School-000000?style=flat-square&logo=42&logoColor=white) ![Language](https://img.shields.io/badge/lang-JavaScript%2FTypeScript%20%2B%20Fastify%20%2B%20Docker-blue?style=flat-square) ![Status](https://img.shields.io/badge/status-completed-success?style=flat-square)

Full-stack web app with authentication, gameplay, and containerized deployment.

## Stack

- School: 42
- Primary language: JavaScript/TypeScript + Fastify + Docker
- Scope: one repository per project

## Features

- User authentication and session management
- Real-time multiplayer gameplay via WebSockets
- Full deployment with Docker Compose and Nginx as reverse proxy
- Tailwind CSS frontend with a Fastify backend

## Screenshots

![dashboard](docs/screenshots/dashboard.png)

![gameplay](docs/screenshots/gameplay.png)

![landing](docs/screenshots/landing.png)

![login](docs/screenshots/login.png)

![profile](docs/screenshots/profile.png)

![signup](docs/screenshots/signup.png)

![tournament](docs/screenshots/tournament.png)

## How to Run

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
