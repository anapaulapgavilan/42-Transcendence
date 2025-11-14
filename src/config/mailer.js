import fp from 'fastify-plugin';
import nodemailer from 'nodemailer';

async function mailerConnector(fastify, options) {
    // Create the transporter object using Gmail's SMTP servers
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: 'transcendence2fapong@gmail.com', // Mail
            pass: 'ksmo tqkf cmcq pmbw',  // APP password
        },
    });

    // Make the transporter available throughout the app as `fastify.mailer`
    fastify.decorate('mailer', transporter);
}

export default fp(mailerConnector);
