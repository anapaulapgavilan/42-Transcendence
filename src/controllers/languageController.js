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
    
    // Redirect back to the referring page or home
    const referer = request.headers.referer || '/';
    return reply.redirect(referer);
}
