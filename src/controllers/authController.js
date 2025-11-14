/* This file has been checked and aparently everything is correct 
 * for evaluating. The .env has been updated and its used in the code.
 * */
import bcrypt from 'bcrypt';
import { OAuth2Client } from 'google-auth-library';
import { authenticator } from 'otplib';
import { randomBytes } from 'crypto';
import { getLanguageAndTranslation } from '../helpers/translation.js';
import dotenv from 'dotenv'
dotenv.config()


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// signupPage for get method
export async function signupPage(request, reply) {
    // Get language and translation function
    const { language, t } = getLanguageAndTranslation(request);
    
    return reply.view('signup.ejs', {
        googleClientId: process.env.GOOGLE_CLIENT_ID,
        language: language,
        t: t
    });
}

// Handles the logic for the Post petition on the signup
export async function signup(request, reply) {
    const db = request.server.db;
    const { auth_provider } = request.body;
    const { language, t } = getLanguageAndTranslation(request);

    // If its local that means it did not use googleSignIn method
    if (auth_provider === 'local') {
        const { username, email, password } = request.body; // Gets the info of the signup
        if (!username || !email || !password) {
            return reply.code(400).send('Missing required fields');
        }

        const existingUser = db.prepare('SELECT 1 FROM user WHERE mail = ?').get(email); // Checks if user exists
        if (existingUser) {
            return reply.view('signup.ejs', {
                googleClientId: process.env.GOOGLE_CLIENT_ID,
                language: language,
                t: t
            });
        }

        const hash = await bcrypt.hash(password, 10); // Encrypts the password
        db.prepare(`INSERT INTO user (alias, mail, password_hash, auth_provider) VALUES (?, ?, ?, 'local')`) // Adds the user to the database
            .run(username, email, hash);

        return reply.redirect('/login'); // Redirects to login to make a new login

    } else if (auth_provider === 'google') { // If its google then it means he has done a googleSignIn
        const { id_token } = request.body; // Gets the token of google
        if (!id_token) {
            return reply.code(400).send('Google ID token is required'); 
        }

        let payload; // This variable will store the info of the login 
        try {
            const ticket = await client.verifyIdToken({ // Used to check the google token. Security
                idToken: id_token,
                audience: process.env.GOOGLE_CLIENT_ID,
            });
            payload = ticket.getPayload(); // Gets the info of the login
        } catch (err) {
            return reply.code(401).send('Invalid Google ID token'); // TODO changge so it doesnt give an error
        }

        const email = payload.email; 
        const username = payload.name || payload.email.split('@')[0];

        const existingUser = db.prepare('SELECT * FROM user WHERE mail = ?').get(email);

        if (existingUser) {
            // If user exists, log them in directly
            const token = request.server.jwt.sign({ userId: existingUser.id, username: existingUser.mail });
            return reply
                .setCookie('token', token, {
                    httpOnly: true,
                    secure: false, // TODO: We prolly need to change this to true to allow https
                    path: '/',
                    maxAge: 3600,
                })
                .redirect('/home');
        }

        // Creates the new google user and inserts it into the database
        const result = db.prepare(`INSERT INTO user (alias, mail, auth_provider) VALUES (?, ?, 'google')`)
            .run(username, email);
        
        const userId = result.lastInsertRowid;
        const token = request.server.jwt.sign({ userId: userId, username: email });
        return reply
            .setCookie('token', token, {
                httpOnly: true,
                secure: false, // TODO: We prolly need to change this to true to allow https
                path: '/',
                maxAge: 3600,
            })
            .redirect('/home');

    } else {
        return reply.code(400).send('Invalid auth provider');
    }
}



// loginpage for get method
export async function loginPage(request, reply) {
    // check if user is logged in (adjust according to your auth method)
    // this is needed because the middleware only checks to deny entry if not auth
    // but it doesnt deny entry to pages if auth (no access to login page
    // because the user is alredy logged in)
    const token = request.cookies.token || null;

    if (token) {
        try {
            // verify token (assuming you use fastify-jwt)
            await request.server.jwt.verify(token);
            // if token valid, redirect to profile/dashboard
            //return reply.redirect('/profile');
            return reply.redirect('/home');
        } catch (err) {
            // token invalid or expired, continue to login page
        }
    }
    // no token or invalid token, show login page
    // Get language and translation function
    const { language, t } = getLanguageAndTranslation(request);
    
    return reply.view('login', {
        googleClientId: process.env.GOOGLE_CLIENT_ID,
        language: language,
        t: t
    });
}


// Handles the login logic
export async function login(request, reply) {
    const db = request.server.db;
    const mailer = request.server.mailer;
    const { mail, password, googleToken } = request.body;

    if (googleToken) {
        try {
            const ticket = await client.verifyIdToken({ // Verifies the token for security reasons
                idToken: googleToken,
                audience: process.env.GOOGLE_CLIENT_ID,
            });

            const payload = ticket.getPayload();
            const email = payload.email;

            // Searches for the user based on an email
            const user = db.prepare('SELECT * FROM user WHERE mail = ?').get(email);

            // We need to check the user exists and also the auth_provider = google (to skip password)
            if (!user || user.auth_provider !== 'google') {
                return reply.redirect('/login'); // No existe o no es de tipo Google
            }

            // --- 2FA Check for Google Sign-In ---
            if (user.two_fa_enabled) {
                const mailer = request.server.mailer;
                const db = request.server.db;
                if (user.two_fa_method === 'app') {
                    const tempToken = request.server.jwt.sign(
                        { userId: user.id, auth_step: '2fa' },
                        { expiresIn: '5m' }
                    );
                    reply.setCookie('temp_token', tempToken, { httpOnly: true, path: '/', secure: false });
                    return reply.redirect('/login/verify');
                } else if (user.two_fa_method === 'email') {
                    const code = randomBytes(3).toString('hex').toUpperCase();
                    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

                    db.prepare(
                        'UPDATE user SET two_fa_email_code = ?, two_fa_email_code_expires_at = ? WHERE id = ?'
                    ).run(code, expiresAt.toISOString(), user.id);

                    try {
                        await mailer.sendMail({
                            from: '"Ft_Transcendence" <no-reply@transcendence.com>',
                            to: user.mail,
                            subject: 'Your Login Code',
                            text: `Your login code is: ${code}`,
                            html: `<p>Your login code is: <strong>${code}</strong></p>`,
                        });
                    } catch (err) {
                        request.log.error({ msg: 'Error sending login 2FA email', error: err });
                        return reply.redirect('/login');
                    }

                    const tempToken = request.server.jwt.sign(
                        { userId: user.id, auth_step: '2fa_email' },
                        { expiresIn: '10m' }
                    );
                    reply.setCookie('temp_token', tempToken, { httpOnly: true, path: '/', secure: false });
                    return reply.redirect('/loginVerifyEmail');
                }
            }

            // In case the auth is correct we need to create the JWT token
            const token = request.server.jwt.sign({ userId: user.id, username: user.mail });

            // Set user as online
            db.prepare('UPDATE user SET is_online = ? WHERE id = ?').run(1, user.id);

            // Set the user's preferred language cookie
            const userLanguage = user.preferred_language || 'es';
            reply.setCookie('i18next', userLanguage, {
                maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
                httpOnly: false,
                secure: false,
                sameSite: 'lax',
                path: '/'
            });

            // We set the JWT token as a cookie in order to keep the session
            return reply
                .setCookie('token', token, {
                    httpOnly: true,
                    secure: false, // TODO: We prolly need to change this to true to allow https
                    path: '/',
                    maxAge: 3600,
                })
                .redirect('/home');
        } catch (err) {
            console.error('Google Login Error:', err); 
            return reply.redirect('/login');
        }
    }

    const user = db.prepare('SELECT * FROM user WHERE mail = ?').get(mail);

    if (!user || user.auth_provider !== 'local') {
        return reply.redirect('/login');
    }

    const passwordcorrect = await bcrypt.compare(password, user.password_hash);

    if (!passwordcorrect) {
        return reply.redirect('/login');
    }

    // --- UPDATED 2FA Check ---
    if (user.two_fa_enabled) {
        // Check which method is enabled
        if (user.two_fa_method === 'app') {
            // --- App-based 2FA Flow (as before) ---
            const tempToken = request.server.jwt.sign(
                { userId: user.id, auth_step: '2fa' },
                { expiresIn: '5m' }
            );
            reply.setCookie('temp_token', tempToken, { httpOnly: true, path: '/', secure: false });
            return reply.redirect('/login/verify');

        } else if (user.two_fa_method === 'email') {
            // --- New Email-based 2FA Flow ---
            const code = randomBytes(3).toString('hex').toUpperCase();
            const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

            db.prepare(
                'UPDATE user SET two_fa_email_code = ?, two_fa_email_code_expires_at = ? WHERE id = ?'
            ).run(code, expiresAt.toISOString(), user.id);

            try {
                await mailer.sendMail({
                    from: '"Ft_Transcendence" <no-reply@transcendence.com>',
                    to: user.mail,
                    subject: 'Your Login Code',
                    text: `Your login code is: ${code}`,
                    html: `<p>Your login code is: <strong>${code}</strong></p>`,
                });
            } catch (err) {
                request.log.error({ msg: 'Error sending login 2FA email', error: err });
                // Redirect to login with an error eventually
                return reply.redirect('/login');
            }

            const tempToken = request.server.jwt.sign(
                { userId: user.id, auth_step: '2fa_email' },
                { expiresIn: '10m' }
            );
            reply.setCookie('temp_token', tempToken, { httpOnly: true, path: '/', secure: false });
            return reply.redirect('/loginVerifyEmail');
        }
    }

    // If 2FA is not enabled, log in as normal.
    const token = request.server.jwt.sign({ userId: user.id });

    // Set user as online
    db.prepare('UPDATE user SET is_online = ? WHERE id = ?').run(1, user.id);
    
    // Set the user's preferred language cookie
    const userLanguage = user.preferred_language || 'es';
    reply.setCookie('i18next', userLanguage, {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        path: '/'
    });
    
    return reply
        .setCookie('token', token, { httpOnly: true, secure: false, path: '/', maxAge: 3600 })
        .redirect('/home');
}

export async function logout(request, reply) {
    try {
        const token = request.cookies.token;
        if (token) {
            const decodedToken = request.server.jwt.verify(token);
            const userId = decodedToken.userId;
            const db = request.server.db;
            db.prepare('UPDATE user SET is_online = ? WHERE id = ?').run(0, userId);
        }
    } catch (err) {
        request.log.error({ msg: 'Error during logout status update', error: err });
    }

    // clear the auth cookie -> removes the current user session
    reply.clearCookie('token'); 
    // redirect to login page
    return reply.redirect('/login');
}

// Renders the 2FA verification page.
export async function loginVerifyPage(request, reply) {
    const tempToken = request.cookies.temp_token;
    if (!tempToken) {
        return reply.redirect('/login'); // No temporary token, send back to login
    }
    
    // Get language and translation function
    const { language, t } = getLanguageAndTranslation(request);
    
    return reply.view('loginVerify.ejs', {
        language: language,
        t: t
    });
}

// Verifies the 2FA token submitted by the user.
export async function loginVerify(request, reply) {
    const { token: two_fa_token } = request.body;
    const tempToken = request.cookies.temp_token;

    if (!tempToken) {
        return reply.redirect('/login');
    }

    let decodedTempToken;
    try {
        decodedTempToken = request.server.jwt.verify(tempToken);
    } catch (err) {
        return reply.redirect('/login'); // Invalid or expired temp token
    }

    const userId = decodedTempToken.userId;
    const db = request.server.db;

	const user = db.prepare('SELECT id, two_fa_secret FROM user WHERE id = ?').get(userId);
	
    const isValid = authenticator.check(two_fa_token, user.two_fa_secret);

    if (isValid) {
        // 2FA code is correct. Set user online and create final session token.
        db.prepare('UPDATE user SET is_online = ? WHERE id = ?').run(1, user.id);
        const finalToken = request.server.jwt.sign({ userId: user.id });

        // Clear the temporary cookie and set the final one
        return reply
            .clearCookie('temp_token')
            .setCookie('token', finalToken, { httpOnly: true, secure: false, path: '/', maxAge: 3600 })
            .redirect('/home');
    } else {
        // Invalid 2FA code
        const { language, t } = getLanguageAndTranslation(request);
        return reply.view('loginVerify.ejs', { 
            error: 'Invalid code. Please try again.',
            language: language,
            t: t
        });
    }
}

// Renders the page for the user to enter the login code from their email
export async function loginVerifyEmailPage(request, reply) {
    if (!request.cookies.temp_token) return reply.redirect('/login');
    
    const { language, t } = getLanguageAndTranslation(request);
    
    return reply.view('loginVerifyEmail.ejs', {
        language: language,
        t: t
    });
}

// Verifies the email code and logs the user in
export async function loginVerifyEmail(request, reply) {
    const { code } = request.body;
    const tempToken = request.cookies.temp_token;

    if (!tempToken) return reply.redirect('/login');

    let decoded;
    try {
        decoded = request.server.jwt.verify(tempToken);
    } catch (err) {
        return reply.redirect('/login');
    }

    const user = request.server.db.prepare(
        'SELECT * FROM user WHERE id = ?'
    ).get(decoded.userId);

    const now = new Date();
    const expiresAt = new Date(user.two_fa_email_code_expires_at);

    if (user.two_fa_email_code !== code || now > expiresAt) {
        const { language, t } = getLanguageAndTranslation(request);
        return reply.view('loginVerifyEmail.ejs', { 
            error: 'Invalid or expired code.',
            language: language,
            t: t
        });
    }

    // Success: Clear temp code, create final token, and log in
    request.server.db.prepare(
        'UPDATE user SET two_fa_email_code = NULL, two_fa_email_code_expires_at = NULL WHERE id = ?'
    ).run(user.id);

    // Set user as online
    request.server.db.prepare('UPDATE user SET is_online = ? WHERE id = ?').run(1, user.id);

    const finalToken = request.server.jwt.sign({ userId: user.id });
    return reply
        .clearCookie('temp_token')
        .setCookie('token', finalToken, { httpOnly: true, path: '/', maxAge: 3600 })
        .redirect('/home');
}

