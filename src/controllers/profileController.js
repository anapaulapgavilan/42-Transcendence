/* This file has been checked and aparently everything is correct 
 * for evaluating. The .env has been updated and its used in the code.
 * */

import bcrypt from 'bcrypt';
import { writeFile, unlink} from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { authenticator } from 'otplib';
import { toDataURL } from 'qrcode';
import { randomBytes } from 'crypto';
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

// Used to protect the code from XSS (doesnt allow svg files)
const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
];

// Shows the pagge that allows you to edit the profile Get request
export async function editProfilePage(request, reply) {
    const userId = request.user.userId;

    const db = request.server.db;
    // CORRECCIÓN: Se incluye avatar_url y preferred_language en la consulta para que la imagen actual y el idioma se muestren en el frontend.
    const usuario = db.prepare(`
        SELECT id, alias, auth_provider, two_fa_enabled, two_fa_method, avatar_url, preferred_language 
        FROM user 
        WHERE id = ?
    `).get(userId);

    if (!usuario) {
        return reply.code(404).send('Usuario no encontrado'); 
    }

    // Get language from cookie or user's preferred language
    const language = request.cookies?.i18next || usuario.preferred_language || 'es';
    
    // Create translation function
    const t = (key) => getTranslation(key, language);

    return reply.view('editProfile.ejs', { 
        usuario,
        language: language,
        t: t
    });
}

// Handles the Post request for the editProfile page
export async function editProfile(request, reply) {
    const userId = request.user.userId;
    const db = request.server.db;

    // Límite de tamaño de archivo para el backend (5MB)
    const MAX_FILE_SIZE = 5242880; 
    let fileSizeError = false;

    const parts = request.parts(); // Used for changing the image
    const fields = {};
    let avatarFilename = null;

    for await (const part of parts) {
        if (part.file) {
            const buffer = await part.toBuffer();
            
            // VALIDACIÓN DE TAMAÑO EN BACKEND (Última instancia)
            if (buffer.length > MAX_FILE_SIZE) {
                fileSizeError = true;
                // No procesar el archivo y continuar leyendo otros campos
                continue; 
            }
            
            if (!allowedMimeTypes.includes(part.mimetype)) { 
                // Skip unsupported file types. Prevents from XSS
                avatarFilename = null;
                continue;
            }

            const ext = part.filename.split('.').pop();
            const filename = `${randomUUID()}.${ext}`;
            const filepath = join('public/uploads', filename);
            await writeFile(filepath, buffer);
            avatarFilename = `/public/uploads/${filename}`;
        } else {
            fields[part.fieldname] = part.value;
        }
    }

    const { alias, current_password, new_password, preferred_language } = fields;

    // Obtener el objeto 'user' completo para evitar errores de recarga y obtener el hash
    const user = db.prepare('SELECT * FROM user WHERE id = ?').get(userId);
    if (!user) {
        return reply.code(404).send('User not found');
    }

    // Si hubo un error de tamaño, recargar la página con el mensaje
    if (fileSizeError) {
        const language = request.cookies?.i18next || user.preferred_language || 'es';
        const t = (key) => getTranslation(key, language);
        
        return reply.view('editProfile.ejs', {
            usuario: user, // Pasar el usuario completo para evitar fallos en el header
            error: 'La imagen es demasiado grande. Máximo 5MB.',
            language: language,
            t: t
        });
    }

    // Only check/change password if user is local and new_password is provided
    let password_hash = user.password_hash;
    if (user.auth_provider === 'local' && new_password) {
        const match = await bcrypt.compare(current_password, user.password_hash);
        if (!match) {
            // Si hay error de contraseña, pasar el 'usuario' completo
            const language = request.cookies?.i18next || user.preferred_language || 'es';
            const t = (key) => getTranslation(key, language);
            
            return reply.view('editProfile.ejs', {
                usuario: { 
                    ...user, // Pasa todos los datos (incluido avatar_url)
                    alias: alias, // Usar el alias del formulario
                },
                error: 'Current password is incorrect.',
                language: language,
                t: t
            });
        }
        password_hash = await bcrypt.hash(new_password, 10);
    }

    // Delete old avatar if not default
    if (
        avatarFilename &&
            user.avatar_url &&
            !user.avatar_url.includes('default_avatar.png')
    ) {
        try {
            const oldPath = join(process.cwd(), user.avatar_url);
            await unlink(oldPath);
        } catch (err) {
            request.server.log.warn(`Could not delete old avatar: ${err.message}`);
        }
    }

    // Validate preferred language
    const supportedLanguages = ['es', 'en', 'fr', 'ro'];
    const validLanguage = preferred_language && supportedLanguages.includes(preferred_language) 
        ? preferred_language 
        : user.preferred_language || 'es';

    // Update user in DB
    if (avatarFilename) {
        db.prepare(`
UPDATE user SET alias = ?, password_hash = ?, avatar_url = ?, preferred_language = ?
WHERE id = ?
`).run(alias, password_hash, avatarFilename, validLanguage, userId);
    } else {
        db.prepare(`
UPDATE user SET alias = ?, password_hash = ?, preferred_language = ?
WHERE id = ?
`).run(alias, password_hash, validLanguage, userId);
    }

    // Update the language cookie to match the user's preference
    reply.setCookie('i18next', validLanguage, {
        maxAge: 365 * 24 * 60 * 60 * 1000, // 1 year
        httpOnly: false,
        secure: false,
        sameSite: 'lax',
        path: '/'
    });

    return reply.redirect('/profile');
}

// Handles the show profile GET request
export async function showProfile(request, reply) {
    // Get the user from the cookie
    const userId = request.user.userId;

    // Get basic user info
    const userStmt = request.server.db.prepare(`SELECT id, alias, mail, avatar_url FROM user WHERE id = ?`);

    const user = userStmt.get(userId);

    if (!user) {
        return reply.code(404).send('User not found'); 
    }

    // Get the number of wins
    const winsStmt = request.server.db.prepare(`SELECT COUNT(*) AS wins FROM game WHERE winner = ?`);
    const { wins } = winsStmt.get(userId);


    // GGet the number of looses
    const lossesStmt = request.server.db.prepare(`SELECT COUNT(*) AS looses FROM game WHERE finished = 1 AND winner IS NOT ? AND (id_user1 = ? OR id_user2 = ?)`);
    const { looses } = lossesStmt.get(userId, userId, userId);

    // Get the match history
    const matchHistoryStmt = request.server.db.prepare(`SELECT g.*, u1.alias AS alias_user1, u2.alias AS alias_user2 FROM game g JOIN user u1 ON g.id_user1 = u1.id JOIN user u2 ON g.id_user2 = u2.id WHERE g.id_user1 = ? OR g.id_user2 = ? ORDER BY g.created_at DESC LIMIT 15
`);

    const matchHistory = matchHistoryStmt.all(userId, userId);
    request.server.log.info(`: ${matchHistory}`)

    // Merge stats with user
    user.wins = wins;
    user.looses = looses;

    // Get language from cookie or default to 'es'
    const language = request.cookies?.i18next || 'es';
    
    // Create translation function
    const t = (key) => getTranslation(key, language);

    return reply.view('profile.ejs', { 
        user, 
        matchHistory,
        language: language,
        t: t
    });
}

// Handles the GET request to set up 2FA, generating a secret and a QR code.
export async function setup2FA(request, reply) {
    const userId = request.user.userId;
    const db = request.server.db;

    // Get user's email to display in the authenticator app
    const user = db.prepare('SELECT mail FROM user WHERE id = ?').get(userId);

    // Generate a unique secret for the user
    const secret = authenticator.generateSecret();

    // Temporarily save the secret to the database.
    // We will only mark it as final once the user verifies it.
    db.prepare('UPDATE user SET two_fa_secret = ? WHERE id = ?').run(secret, userId);

    // Create the URL for the QR code.
    // This tells the authenticator app which account the code belongs to.
    const otpauth = authenticator.keyuri(user.mail, 'Ft_Transcendence', secret);

    // Generate the QR code as an image in Data URL format
    const qrCodeImage = await toDataURL(otpauth);

    // Get language from cookie or default to 'es'
    const language = request.cookies?.i18next || 'es';
    
    // Create translation function
    const t = (key) => getTranslation(key, language);
    
    // Render a new view with the QR code and instructions.
    // We also pass the 'secret' as text in case the user cannot scan the QR code.
    return reply.view('setup2fa.ejs', {
        qrCode: qrCodeImage,
        secret: secret,
        language: language,
        t: t
    });
}

// Verifies the 6-digit token and enables 2FA for the user.
export async function verify2FA(request, reply) {
    const { token } = request.body;
    const userId = request.user.userId;
    const db = request.server.db;

    // Get the user's secret from the database
    const user = db.prepare('SELECT two_fa_secret, mail FROM user WHERE id = ?').get(userId);
    if (!user || !user.two_fa_secret) {
        // This should not happen if they are on this page
        return reply.redirect('/profile'); 
    }

    // Check if the token is valid
    const isValid = authenticator.check(token, user.two_fa_secret);

    if (isValid) {
        // If valid, enable 2FA for the user and finalize the secret
        db.prepare(`UPDATE user SET two_fa_enabled = TRUE, two_fa_method = 'app' WHERE id = ?`).run(userId);
        // Redirect to profile, maybe with a success message
        return reply.redirect('/profile');
    } else {
        // If invalid, re-render the setup page with an error message
        const otpauth = authenticator.keyuri(user.mail, 'Ft_Transcendence', user.two_fa_secret);
        const qrCodeImage = await toDataURL(otpauth);

        // Get language from cookie or default to 'es'
        const language = request.cookies?.i18next || 'es';
        
        // Create translation function
        const t = (key) => getTranslation(key, language);
        
        return reply.view('setup2fa.ejs', {
            qrCode: qrCodeImage,
            secret: user.two_fa_secret,
            error: 'Invalid code. Please try again.',
            language: language,
            t: t
        });
    }
}

// Handles the request to start the email 2FA setup process.
export async function setupEmail2fa(request, reply) {
    const userId = request.user.userId;
    const db = request.server.db;
    const mailer = request.server.mailer;

    // Get user's email
    const user = db.prepare('SELECT mail FROM user WHERE id = ?').get(userId);

    // Generate a simple 6-digit code
    const code = randomBytes(3).toString('hex').toUpperCase();

    // Set an expiration time for the code (e.g., 10 minutes from now)
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    // Store the code and its expiration in the database
    db.prepare(`
        UPDATE user 
        SET two_fa_email_code = ?, two_fa_email_code_expires_at = ?
        WHERE id = ?
    `).run(code, expiresAt.toISOString(), userId);

    // Send the code to the user's email
    try {
        await mailer.sendMail({
            from: '"Ft_Transcendence" <no-reply@transcendence.com>',
            to: user.mail,
            subject: 'Your Two-Factor Authentication Code',
            text: `Your verification code is: ${code}`,
            html: `<p>Your verification code is: <strong>${code}</strong></p><p>This code will expire in 10 minutes.</p>`,
        });

    } catch (err) {
        request.log.error('Error sending 2FA email', err);
        // Handle error appropriately
    }

    // Redirect the user to a page where they can enter the code
    return reply.redirect('/verifyEmail2fa');
}

// Renders the page for the user to enter the code sent to their email.
export async function verifyEmail2faPage(request, reply) {
    // Get language from cookie or default to 'es'
    const language = request.cookies?.i18next || 'es';
    
    // Create translation function
    const t = (key) => getTranslation(key, language);
    
    // We pass an empty error object so the template doesn't crash on the first load
    return reply.view('verifyEmail2fa.ejs', { 
        error: null,
        language: language,
        t: t
    });
}

// Verifies the email code and, if correct, enables email 2FA.
export async function verifyEmail2fa(request, reply) {
    const { code } = request.body;
    const userId = request.user.userId;
    const db = request.server.db;

    const user = db.prepare(`
        SELECT two_fa_email_code, two_fa_email_code_expires_at 
        FROM user WHERE id = ?
    `).get(userId);

    // Check if the code is correct and not expired
    const now = new Date();
    const expiresAt = new Date(user.two_fa_email_code_expires_at);

    if (!user.two_fa_email_code || user.two_fa_email_code !== code || now > expiresAt) {
        // Get language from cookie or default to 'es'
        const language = request.cookies?.i18next || 'es';
        
        // Create translation function
        const t = (key) => getTranslation(key, language);
        return reply.view('verifyEmail2fa.ejs', { 
            error: 'Invalid or expired code. Please try again.',
            language: language,
            t: t
        });
    }

    // If successful, enable 2FA and clear the temporary code fields
    db.prepare(`
        UPDATE user SET 
        two_fa_enabled = TRUE, 
        two_fa_method = 'email',
        two_fa_email_code = NULL,
        two_fa_email_code_expires_at = NULL
        WHERE id = ?
    `).run(userId);

    return reply.redirect('/profile');
}

// Disables 2FA for the user.
export async function disable2fa(request, reply) {
    const userId = request.user.userId;
    const db = request.server.db;

    // Reset all 2FA fields for the user
    db.prepare(`
        UPDATE user SET 
        two_fa_enabled = FALSE, 
        two_fa_method = NULL,
        two_fa_secret = NULL,
        two_fa_email_code = NULL,
        two_fa_email_code_expires_at = NULL
        WHERE id = ?
    `).run(userId);

    return reply.redirect('/editprofile');
}
