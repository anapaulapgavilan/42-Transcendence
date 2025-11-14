import { tournament, tournamentPage, tournamentPlayPage } from '../controllers/tournamentController.js';
import { showHomePage } from '../controllers/index.controller.js';
import { showProfile, editProfilePage, editProfile, setup2FA, verify2FA, setupEmail2fa, verifyEmail2faPage, verifyEmail2fa, disable2fa } from '../controllers/profileController.js';
import { signupPage, loginPage, logout, signup, login, loginVerifyPage, loginVerify, loginVerifyEmailPage, loginVerifyEmail } from '../controllers/authController.js';
import { game, gamePage, gamePlayPage, endGameController, scoreController, tournamentMatchScoreController } from '../controllers/gameController.js';
import { friendsPage, friends } from '../controllers/friendsController.js';
import { homePage } from '../controllers/homeController.js';
import { changeLanguage } from '../controllers/languageController.js';

// This function is used to get all the posts and gets methods.
// Some of the controllers used are the same. For example authController
// handles everything related to login
// The preHandler calls the Middleware to make sure the auth is done
export default async function (fastify) {
    // Language switching route
    fastify.get('/change-language', changeLanguage);
    
    // Test translation endpoint
    fastify.get('/test-translation', async (request, reply) => {
        const testKey = 'common.gameTitle';
        const translation = request.t ? request.t(testKey) : 'No translation function';
        return reply.send({
            key: testKey,
            translation: translation,
            language: request.language || 'es',
            hasTFunction: !!request.t
        });
    });
    
    fastify.get('/', showHomePage);
    fastify.get('/home', { preHandler: [fastify.auth] }, homePage);
    fastify.get('/editprofile', { preHandler: [fastify.auth] }, editProfilePage);
    fastify.post('/editprofile', { preHandler: [fastify.auth] }, editProfile);

    fastify.get('/friends', { preHandler: [fastify.auth] }, friendsPage);
    fastify.post('/friends', { preHandler: [fastify.auth] }, friends);

    fastify.get('/tournamentplay', { preHandler: [fastify.auth] }, tournamentPlayPage);

    fastify.get('/tournament', { preHandler: [fastify.auth] }, tournamentPage);
    fastify.post('/tournament', { preHandler: [fastify.auth] }, tournament);

    fastify.get('/profile', { preHandler: [fastify.auth] }, showProfile);

    fastify.post('/game/score', { preHandler: [fastify.auth] }, scoreController);
    fastify.post('/tournament/match/score', { preHandler: [fastify.auth] }, tournamentMatchScoreController);
    fastify.post('/game/end', { preHandler: [fastify.auth] }, endGameController);
    fastify.get('/gameplay', { preHandler: [fastify.auth] }, gamePlayPage);
    
    fastify.get('/game', { preHandler: [fastify.auth] }, gamePage);
    fastify.post('/game', { preHandler: [fastify.auth] }, game);

    fastify.get('/signup', signupPage);
    fastify.post('/signup', signup)
    fastify.post('/login', login);
    fastify.get('/login', loginPage);
    fastify.get('/logout', { preHandler: [fastify.auth] }, logout);

    fastify.get('/setup2fa', { preHandler: [fastify.auth] }, setup2FA);
	fastify.post('/verify2fa', { preHandler: [fastify.auth] }, verify2FA);
	fastify.get('/login/verify', loginVerifyPage);
	fastify.post('/login/verify', loginVerify);
	fastify.get('/setupEmail2fa', { preHandler: [fastify.auth] }, setupEmail2fa);
	fastify.get('/verifyEmail2fa', { preHandler: [fastify.auth] }, verifyEmail2faPage);
	fastify.post('/verifyEmail2fa', { preHandler: [fastify.auth] }, verifyEmail2fa);
	fastify.get('/loginVerifyEmail', loginVerifyEmailPage);
	fastify.post('/loginVerifyEmail', loginVerifyEmail);
	fastify.post('/disable2fa', { preHandler: [fastify.auth] }, disable2fa);
}
