/* This file has been checked and aparently everything is correct 
 * for evaluating. The .env has been updated and its used in the code.
 * */

import { getAvailableLanguages } from '../helpers/i18n.js';

export async function changeLanguage(request, reply) {
    const { lng } = request.query;
    const supportedLanguages = ['es', 'en', 'fr', 'ro'];
    
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
    
    // Update user's preferred language in database if user is authenticated
    if (request.user && request.user.userId) {
        try {
            const db = request.server.db;
            db.prepare('UPDATE user SET preferred_language = ? WHERE id = ?').run(lng, request.user.userId);
        } catch (error) {
            console.error('Error updating user language preference:', error);
            // Continue even if database update fails
        }
    }
    
    // Redirect back to the referring page or home
    const referer = request.headers.referer || '/';
    return reply.redirect(referer);
}
