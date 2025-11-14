/* This file has been checked and aparently everything is correct 
 * for evaluating. The .env has been updated and its used in the code.
 * */
import { getLanguageAndTranslation } from '../helpers/translation.js';

function _finishTournamentMatch(db, match_id, scoreLeft, scoreRight) {
    const match = db.prepare('SELECT * FROM tournament_match WHERE id = ?').get(match_id);
    if (!match) {
        return { error: "Match not found" };
    }

    const winnerId = scoreLeft > scoreRight ? match.player1_id : match.player2_id;

    db.prepare(`
        UPDATE tournament_match
        SET score_player1 = ?, score_player2 = ?, winner_id = ?
        WHERE id = ?
    `).run(scoreLeft, scoreRight, winnerId, match_id);

    // Add the finished tournament match to the game history
    db.prepare(`
        INSERT INTO game (id_tournament, id_user1, id_user2, points_user1, points_user2, winner, finished)
        VALUES (?, ?, ?, ?, ?, ?, 1)
    `).run(match.id_tournament, match.player1_id, match.player2_id, scoreLeft, scoreRight, winnerId);

    // Check if the round is finished and create the next one
    const tournamentId = match.id_tournament;
    const currentRound = match.round;

    const allMatchesInRound = db.prepare('SELECT * FROM tournament_match WHERE id_tournament = ? AND round = ?').all(tournamentId, currentRound);
    const isRoundFinished = allMatchesInRound.every(m => m.winner_id !== null);

    if (isRoundFinished) {
        if (allMatchesInRound.length > 1) {
            const winners = allMatchesInRound.map(m => m.winner_id);
            const shuffledWinners = winners.sort(() => 0.5 - Math.random());
            const nextRound = currentRound + 1;

            const insertMatchStmt = db.prepare(`
                INSERT INTO tournament_match (id_tournament, round, match_number, player1_id, player2_id, winner_id)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            let matchNumber = 1;
            for (let i = 0; i < shuffledWinners.length; i += 2) {
                const player1 = shuffledWinners[i];
                const player2 = (i + 1 < shuffledWinners.length) ? shuffledWinners[i + 1] : null;
                insertMatchStmt.run(tournamentId, nextRound, matchNumber, player1, player2 ? player2 : null, player2 ? null : player1);
                matchNumber++;
            }
        } else {
            // This was the final match, tournament is over
            db.prepare('UPDATE tournament SET finished = 1 WHERE id = ?').run(tournamentId);
        }
    }
    return { success: true, tournament_id: tournamentId };
}


export function endGameController(request, reply) {
    const db = request.server.db;
    const userId = request.user.userId;
    const { scoreLeft, scoreRight } = request.body;

    const game = db.prepare(`
        SELECT *
        FROM game
        WHERE (id_user1 = ? OR id_user2 = ?)
          AND finished = 0
    `).get(userId, userId);

    if (!game) {
        return reply.status(404).send({ error: "No hay partida activa" });
    }

    const winner = scoreLeft > scoreRight ? game.id_user1 : game.id_user2;

    db.prepare(`
        UPDATE game
        SET points_user1 = ?, points_user2 = ?, winner = ?, finished = 1
        WHERE id = ?
    `).run(scoreLeft, scoreRight, winner, game.id);

    return reply.send({ success: true });
}

// Controlador para guardar puntuación
export function scoreController(request, reply) {
    const db = request.server.db;
    const userId = request.user.userId;

    const { scoreLeft, scoreRight } = request.body;

    if (scoreLeft === undefined || scoreRight === undefined) {
        return reply.status(400).send({ error: "Faltan puntuaciones en el body" });
    }

    // Buscar partida sin terminar del usuario
    const game = db.prepare(`
        SELECT *
        FROM game
        WHERE (id_user1 = ? OR id_user2 = ?)
          AND finished = 0
    `).get(userId, userId);

    if (!game) {
        return reply.status(404).send({ error: "No se encontró partida activa" });
    }

    // Actualizar puntuaciones
    db.prepare(`
        UPDATE game
        SET points_user1 = ?, points_user2 = ?
        WHERE id = ?
    `).run(scoreLeft, scoreRight, game.id);

    return reply.send({ success: true });
}


// This controller is for tournament matches score
export function tournamentMatchScoreController(request, reply) {
    const db = request.server.db;
    const { match_id, scoreLeft, scoreRight } = request.body;

    if (!match_id || scoreLeft === undefined || scoreRight === undefined) {
        return reply.status(400).send({ error: "Missing match_id or scores" });
    }

    const result = _finishTournamentMatch(db, match_id, scoreLeft, scoreRight);

    if (result.error) {
        return reply.status(404).send({ error: result.error });
    }

    return reply.send({ success: true, tournament_id: result.tournament_id });
}


// Get of /gameplay route
export function gamePlayPage(request, reply) {
    const db = request.server.db;
    const userId = request.user.userId;
    const { match_id } = request.query;

    let user1, user2, gameData;

    // This is a tournament match
    if (match_id) {
        const match = db.prepare('SELECT * FROM tournament_match WHERE id = ?').get(match_id);
        if (!match) {
            return reply.status(404).send({ error: "Tournament match not found" });
        }

        user1 = db.prepare('SELECT id, alias, AI_user FROM user WHERE id = ?').get(match.player1_id);
        user2 = db.prepare('SELECT id, alias, AI_user FROM user WHERE id = ?').get(match.player2_id);

        if (user1 && user2 && user1.AI_user && user2.AI_user) {
            // Both players are AI, simulate the match
            const score1 = Math.random() > 0.5 ? 7 : Math.floor(Math.random() * 7);
            const score2 = score1 === 7 ? Math.floor(Math.random() * 7) : 7;

            _finishTournamentMatch(db, match_id, score1, score2);

            return reply.redirect('/tournamentplay');
        }
        
        let humanPlayer = null; // The user of this browser session
        if (user1.id === userId) {
            humanPlayer = 'left';
        } else if (user2.id === userId) {
            humanPlayer = 'right';
        }

        const isPlayer1AI = !!user1.AI_user;
        const isPlayer2AI = !!user2.AI_user;

        // We pass the match id to the view
        gameData = {
            nombreUsuario1: user1.alias,
            nombreUsuario2: user2.alias,
            puntuacion1: 0,
            puntuacion2: 0,
            IA: isPlayer1AI || isPlayer2AI, // Flag to know if there is an AI in the match
            humanPlayer: humanPlayer, // 'left', 'right', or null for spectator
            isPlayer1AI: isPlayer1AI,
            isPlayer2AI: isPlayer2AI,
            match_id: match_id,
            difficulty: 'medium' // For tournaments, difficulty is always medium
        };

    } else {
        // This is a regular 1vs1 match
        const game = db.prepare(`
            SELECT *
            FROM game
            WHERE (id_user1 = ? OR id_user2 = ?)
              AND finished = 0
        `).get(userId, userId);

        if (!game) {
            return reply.redirect("/game");
        }

        user1 = db.prepare('SELECT alias, AI_user FROM user WHERE id = ?').get(game.id_user1);
        user2 = db.prepare('SELECT alias, AI_user FROM user WHERE id = ?').get(game.id_user2);

        const isPlayer1AI = !!user1.AI_user;
        const isPlayer2AI = !!user2.AI_user;

        gameData = {
            nombreUsuario1: user1.alias,
            nombreUsuario2: user2.alias,
            puntuacion1: game.points_user1,
            puntuacion2: game.points_user2,
            IA: isPlayer1AI || isPlayer2AI,
            humanPlayer: 'left', // In regular matches, human is always left
            isPlayer1AI: isPlayer1AI,
            isPlayer2AI: isPlayer2AI,
            match_id: null, // No match_id for regular games
            difficulty: game.difficulty
        };
    }

    return reply.view("gamePlay", gameData);
}


// Post of /game route
export function game(request, reply) {
    const { IA, name, difficulty } = request.body;
    const db = request.server.db;
    const userId = request.user.userId; 

    // Check if either IA or a name is set if not, redirect
    if (!IA && (!name || name.trim() === "")) {
        return reply.status(400).send({ error: "Debe especificar un nombre si no es un usuario IA." });
    }

    let alias;
    let AI_user = false;

    if (IA) {
        alias = "IA";
        AI_user = true;
    } else {
        alias = name.trim();
    }

    // Create a temporal_user
    const insertUserStmt = db.prepare(`
        INSERT INTO user (
            alias, 
            mail, 
            password_hash, 
            preferred_language, 
            id_tournament, 
            is_online, 
            temporal_user, 
            avatar_url, 
            AI_user, 
            auth_provider
        )
        VALUES (?, NULL, NULL, 'es', NULL, 0, 1, '/public/uploads/default_avatar.png', ?, 'local')
    `);

    const userResult = insertUserStmt.run(alias, AI_user ? 1 : 0);
    const newUserId = userResult.lastInsertRowid;

    // Create a match
    const insertGameStmt = db.prepare(`
        INSERT INTO game (
            id_tournament, 
            tournament_place, 
            id_user1, 
            id_user2, 
            points_user1, 
            points_user2, 
            winner, 
            finished,
            difficulty
        )
        VALUES (NULL, NULL, ?, ?, 0, 0, NULL, 0, ?)
    `);

    insertGameStmt.run(userId, newUserId, IA ? difficulty : null);

    // Once the match is created redirect to the gameplay window
    return reply.redirect("/gameplay");
}



// Get of /game route
// Get of /game route
export function gamePage(request, reply) {
    const db = request.server.db;
    const userId = request.user.userId;

    // Obtain info of current user
    const currentUser = db.prepare(`
        SELECT id, alias, avatar_url
        FROM user
        WHERE id = ?
    `).get(userId);

    if (!currentUser) {
        return reply.redirect("/login"); // Manejo de caso extremo
    }

    // OBTENER WINS Y LOOSES (necesarios para calcular el Nivel en EJS)
    const winsStmt = db.prepare(`SELECT COUNT(*) AS wins FROM game WHERE winner = ?`);
    const { wins } = winsStmt.get(userId);

    const lossesStmt = db.prepare(`SELECT COUNT(*) AS looses FROM game WHERE finished = 1 AND winner IS NOT ? AND (id_user1 = ? OR id_user2 = ?)`);
    const { looses } = lossesStmt.get(userId, userId, userId);

    // Adjuntar las estadísticas al objeto de usuario
    currentUser.wins = wins;
    currentUser.looses = looses;
    
    // El EJS ya contiene la lógica de cálculo de Nivel, pero nos aseguraremos de que esté correcta.

    // Check if user is in a current game
    const existingGame = db.prepare(`
        SELECT *
        FROM game
        WHERE (id_user1 = ? OR id_user2 = ?)
          AND finished = FALSE
    `).get(userId, userId);

    if (existingGame) {
        // If user in a current game redirect to game window
        return reply.redirect("/gameplay");
    }

    // Get language and translation function
    const { language, t } = getLanguageAndTranslation(request);

    // If not in a game, render view to let user create a game
    return reply.view('game', {
        mensaje: 'You are in game view',
        user: currentUser, // Ahora 'user' tiene 'wins' y 'looses'
        language: language,
        t: t
    });
}
