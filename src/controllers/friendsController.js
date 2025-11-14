/* This file has been checked and aparently everything is correct 
 * for evaluating. The .env has been updated and its used in the code.
 * */
import { getLanguageAndTranslation } from '../helpers/translation.js';

// Función helper para obtener las estadísticas del usuario
function getUserStats(db, userId) {
    const userStmt = db.prepare('SELECT id, alias, mail, avatar_url FROM user WHERE id = ?').get(userId);
    if (!userStmt) return null;

    // Obtener el número de victorias
    const winsStmt = db.prepare(`SELECT COUNT(*) AS wins FROM game WHERE winner = ?`);
    const { wins } = winsStmt.get(userId);

    // Obtener el número de derrotas
    const lossesStmt = db.prepare(`SELECT COUNT(*) AS looses FROM game WHERE finished = 1 AND winner IS NOT ? AND (id_user1 = ? OR id_user2 = ?)`);
    const { looses } = lossesStmt.get(userId, userId, userId);

    userStmt.wins = wins;
    userStmt.looses = looses;

    return userStmt;
}

// Handles the Get petition for the friendsPage
export async function friendsPage(request, reply) {
    const userId = request.user.userId;
    const db = request.server.db;

    // OBTENER DATOS DE USUARIO CON ESTADÍSTICAS
    const user = getUserStats(db, userId);

    // Gets the friends of the current user
    const friends = db.prepare(`SELECT u.id, u.alias, u.mail, u.avatar_url, u.is_online FROM friends f JOIN user u ON u.id = (CASE WHEN f.id_user1 = ? THEN f.id_user2 ELSE f.id_user1 END) WHERE f.id_user1 = ? OR f.id_user2 = ?`).all(userId, userId, userId);

    // Gets the pending invites
    const pendingInvites = db.prepare(`SELECT u.id_user1, u2.alias, u2.mail FROM friend_invite u JOIN user u2 ON u2.id = u.id_user1 WHERE u.id_user2 = ? AND u.state = 'pending'`).all(userId);

    // Get language and translation function
    const { language, t } = getLanguageAndTranslation(request);

    // Sends everything to the view to process it
    return reply.view('friends.ejs', {
        user, // Pasamos el usuario con wins/looses
        friends,
        pendingInvites,
        searchResults: [],     
        searchQuery: '',
        language: language,
        t: t
    });
}

// Handles the Post petititoon for the friendsPage
// The logic is a little bit complex. It has to handle few different posts:
// 1. Handles the logic of searching a new user to invite.
// 2. Handles the logic of accepting or denying friend requests
// 3. Delete an existing friend
// 4. Send a friend request
export async function friends(request, reply) {
    const userId = request.user.userId;
    const body = request.body;
    const db = request.server.db; 

    const user = getUserStats(db, userId);

    // Gets the friends of the current user
    const friends = db.prepare(`SELECT u.id, u.alias, u.mail, u.avatar_url, u.is_online FROM friends f JOIN user u ON u.id = (CASE WHEN f.id_user1 = ? THEN f.id_user2 ELSE f.id_user1 END) WHERE f.id_user1 = ? OR f.id_user2 = ?`).all(userId, userId, userId);

    // Gets the pending invites
    const pendingInvites = db.prepare(`SELECT u.id_user1, u2.alias, u2.mail FROM friend_invite u JOIN user u2 ON u2.id = u.id_user1 WHERE u.id_user2 = ? AND u.state = 'pending'`).all(userId);


    // 1. Handles the search logic
    if (body.searchQuery) {
        const query = `%${body.searchQuery.toLowerCase()}%`;

        const results = db.prepare(`SELECT id, alias, mail FROM user u WHERE (LOWER(u.alias) LIKE ? OR LOWER(u.mail) LIKE ?) AND u.id != ? AND NOT EXISTS (SELECT 1 FROM friends f WHERE (f.id_user1 = ? AND f.id_user2 = u.id) OR (f.id_user2 = ? AND f.id_user1 = u.id)) LIMIT 20`).all(query, query, userId, userId, userId);

        // Get language and translation function
        const { language, t } = getLanguageAndTranslation(request);

        return reply.view('friends.ejs', {
            user, 
            friends,          
            pendingInvites,  
            searchResults: results,
            searchQuery: body.searchQuery,
            language: language,
            t: t
        });
    }

    // 2. Handles the accept or deny of invites.
    if (body.inviteId && body.action) {
        const invite = db.prepare(`SELECT * FROM friend_invite  WHERE id_user1 = ? AND id_user2 = ? AND state = 'pending'`).get(body.inviteId, userId);

        if (!invite) {
            return reply.code(400).send('Invalid invite'); 
        }

        if (body.action === 'accept') {
            // If its accepted we insert it into the table and update the friend_invite table
            db.prepare(`INSERT INTO friends (id_user1, id_user2) VALUES (?, ?)`).run(body.inviteId, userId);
            db.prepare(`UPDATE friend_invite SET state = 'accepted' WHERE id_user1 = ? AND id_user2 = ?`).run(body.inviteId, userId);
        } 
        else if (body.action === 'reject') // If its denied then we only update the friend_invite table
            db.prepare(`UPDATE friend_invite SET state = 'rejected' WHERE id_user1 = ? AND id_user2 = ?`).run(body.inviteId, userId);

        return reply.redirect('/friends');
    }

    // 3. Deletes an existing friend
    if (body.friendId && body.action === 'remove') {
        db.prepare(`DELETE FROM friends WHERE (id_user1 = ? AND id_user2 = ?) OR (id_user2 = ? AND id_user1 = ?)`).run(userId, body.friendId, userId, body.friendId);
        return reply.redirect('/friends');
    }

    // 4. Sends a friend invitation
    if (body.userIdToInvite && body.action === 'invite') {
        const alreadyInvited = db.prepare(`SELECT 1 FROM friend_invite WHERE id_user1 = ? AND id_user2 = ? AND state = 'pending'`).get(userId, body.userIdToInvite);

        if (!alreadyInvited) {
            db.prepare(`INSERT INTO friend_invite (id_user1, id_user2) VALUES (?, ?)`).run(userId, body.userIdToInvite);
        }
        return reply.redirect('/friends');
    }

    return reply.code(400).send('Invalid request'); 
}
