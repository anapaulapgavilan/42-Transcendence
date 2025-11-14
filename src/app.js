
import Fastify from 'fastify';
import fastifyJwt from 'fastify-jwt';
import multipart from '@fastify/multipart';
import fastifyFormbody from '@fastify/formbody';
import fastifyCookie from '@fastify/cookie';
import fastifyStatic from '@fastify/static';
import fastifyView from '@fastify/view';
import ejs from 'ejs';
import routes from './routes/routes.js';
import dbConnector from './config/db.js';
import mailerConnector from './config/mailer.js';
import i18nMiddleware from './config/i18n.js';
import path from 'node:path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 🔐 Enable HTTPS

const httpsOptions = {
  key: fs.readFileSync(path.join(__dirname, '../certs/key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../certs/cert.pem')),
};


// Pass HTTPS options to Fastify
const fastify = Fastify({
  logger: true,
  https: httpsOptions
});

// Configure formbody
fastify.register(fastifyFormbody);

// Configure multipart for images
fastify.register(multipart, {
  limits: { fileSize: 5242880 } // 5 MB
});

fastify.register(fastifyCookie, {
  secret: process.env.COOKIE_SECRET,
});

// Configure Jwt
fastify.register(fastifyJwt, { secret: process.env.JWT_SECRET });

// Authentication decorator
fastify.decorate('auth', async function (request, reply) {
  try {
    await request.jwtVerify(); // Check header token
  } catch (err) {
    const token = request.cookies?.token;
    if (!token) {
      return reply.redirect('/login');
    }
    try {
      request.user = fastify.jwt.verify(token);
    } catch {
      return reply.redirect('/login');
    }
  }
});

// Configure EJS
await fastify.register(fastifyView, {
  engine: { ejs },
  root: path.join(__dirname, 'views'),
  viewExt: 'ejs'
});

// Register i18n middleware FIRST
await fastify.register(i18nMiddleware);

// Configure static files
await fastify.register(fastifyStatic, {
  root: path.join(__dirname, '../public'),
  prefix: '/public/',
});

// Register views
await fastify.register(routes);

// Register database and mailer
await fastify.register(dbConnector);
await fastify.register(mailerConnector);

// ✅ Start HTTPS server
fastify.listen({ port: 10000, host: '0.0.0.0' }, (err, address) => {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
  fastify.log.info(`🚀 HTTPS server running at ${address}`);
});

