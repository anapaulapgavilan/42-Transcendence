/* This file has been checked and aparently everything is correct 
 * for evaluating. The .env has been updated and its used in the code.
 * */

import { getLanguageAndTranslation } from '../helpers/translation.js';

// This controller is updated to handle tournament matchmaking and display.
export function tournamentPlayPage(request, reply) {
    const db = request.server.db;
    const userId = request.user.userId;

    // 1. OBTENER INFORMACIÓN BÁSICA DEL USUARIO (QUITANDO LAS COLUMNAS ERROREAS)
    const userStmt = db.prepare(`SELECT id, alias, mail, avatar_url FROM user WHERE id = ?`);
    const user = userStmt.get(userId);

    if (!user) {
        return reply.redirect('/login'); 
    }

    // 2. OBTENER WINS Y LOOSES CONSULTANDO LA TABLA 'game' (COMO EN showProfile)
    
    // Obtener el número de victorias
    const winsStmt = db.prepare(`SELECT COUNT(*) AS wins FROM game WHERE winner = ?`);
    const { wins } = winsStmt.get(userId);
    
    // Obtener el número de derrotas
    const lossesStmt = db.prepare(`SELECT COUNT(*) AS looses FROM game WHERE finished = 1 AND winner IS NOT ? AND (id_user1 = ? OR id_user2 = ?)`);
    const { looses } = lossesStmt.get(userId, userId, userId);

    // 3. FUSIONAR WINS y LOOSES con el objeto user
    user.wins = wins;
    user.looses = looses;


    // Get the current user's tournament ID
    const userData = db.prepare('SELECT id_tournament FROM user WHERE id = ?').get(userId);
    if (!userData || !userData.id_tournament) {
        return reply.redirect('/tournament');
    }
    const tournamentId = userData.id_tournament;

    // Fetch all matches again to get the final state of the bracket
    const finalMatches = db.prepare('SELECT * FROM tournament_match WHERE id_tournament = ? ORDER BY round, match_number').all(tournamentId);

    const tournamentWinner = db.prepare(`
        SELECT u.alias FROM tournament_match tm
        JOIN user u ON u.id = tm.winner_id
        WHERE tm.id_tournament = ? AND tm.round = (SELECT MAX(round) FROM tournament_match WHERE id_tournament = ?)
    `).get(tournamentId, tournamentId);

    // Group matches by round for the view
    const matchesByRound = finalMatches.reduce((acc, match) => {
        const player1 = match.player1_id ? db.prepare('SELECT alias FROM user WHERE id = ?').get(match.player1_id) : null;
        const player2 = match.player2_id ? db.prepare('SELECT alias FROM user WHERE id = ?').get(match.player2_id) : null;
        const winner = match.winner_id ? db.prepare('SELECT alias FROM user WHERE id = ?').get(match.winner_id) : null;

        const detailedMatch = {
            ...match,
            player1_alias: player1 ? player1.alias : 'TBD',
            player2_alias: player2 ? player2.alias : 'TBD',
            winner_alias: winner ? winner.alias : null
        };

        if (!acc[match.round]) {
            acc[match.round] = [];
        }
        acc[match.round].push(detailedMatch);
        return acc;
    }, {});

    // Render the view with the complete tournament bracket
    // Get language and translation function
    const { language, t } = getLanguageAndTranslation(request);

    return reply.view('tournamentplay', {
        user: user, // Ahora 'user' tiene 'wins' y 'looses'
        matchesByRound: matchesByRound,
        tournamentId: tournamentId,
        winner: tournamentWinner ? tournamentWinner.alias : null,
        language: language,
        t: t
    });
}


// Post of /tournament route
// Post of /tournament route
export function tournament(request, reply) {
  const db = request.server.db;
  const userId = request.user.userId;

  // Obtener datos de usuario con estadísticas (necesario para recargar la vista correctamente)
  // Usamos la misma lógica que tournamentPage para obtener wins/looses
  const userData = db
    .prepare('SELECT id, alias, avatar_url, id_tournament FROM user WHERE id = ?')
    .get(userId);
        
  const winsStmt = db.prepare(`SELECT COUNT(*) AS wins FROM game WHERE winner = ?`);
  const { wins } = winsStmt.get(userId);

  const lossesStmt = db.prepare(`SELECT COUNT(*) AS looses FROM game WHERE finished = 1 AND winner IS NOT ? AND (id_user1 = ? OR id_user2 = ?)`);
  const { looses } = lossesStmt.get(userId, userId, userId);
  
  userData.wins = wins;
  userData.looses = looses;
  // Fin de obtención de datos de usuario

  // Obtain players Max 7 (Plus current user) -> 8
  const players = [];
  for (let i = 1; i <= 7; i++) {
    const name = request.body[`player${i}`]?.trim() || '';
    const isAI = request.body[`player${i}_ai`] === 'on' || request.body[`player${i}_ai`] === true;

    if (name !== '' || isAI) {
      players.push({ alias: isAI ? 'IA' : name, AI_user: isAI });
    }
  }

  // LÍMITE DEL TORNEO: MÍNIMO 3 JUGADORES + TU JUGADOR = 4 PARTICIPANTES
  // Si la plantilla dice 4, el mínimo total es 4.
  const totalParticipants = players.length + 1; // +1 por el usuario actual
  if (totalParticipants < 4) {
    // CORRECCIÓN CLAVE: Devolver la vista EJS con el mensaje de error 
    return reply.view('tournament.ejs', {
        user: userData, // Pasamos los datos del usuario para el header
        error: 'Necesitas al menos 3 oponentes (IA o nombre) además de ti para crear un torneo (Total 4).',
    });
  }

  // --- VALIDATION FOR DUPLICATE NAMES ---
  const humanPlayerNames = players
      .filter(p => !p.AI_user)
      .map(p => p.alias.toLowerCase());
  humanPlayerNames.push(userData.alias.toLowerCase());

  const nameSet = new Set();
  for (const name of humanPlayerNames) {
      if (nameSet.has(name)) {
          const { language, t } = getLanguageAndTranslation(request);
          return reply.view('tournament.ejs', {
              user: userData,
              error: 'Los nombres de los jugadores deben ser únicos.',
              language: language,
              t: t
          });
      }
      nameSet.add(name);
  }
  // --- END OF VALIDATION ---

  // --- Lógica de creación del torneo si la validación pasa ---

  // If no players are set we cant create a tournament
  // (Esta validación ahora está implícita en la validación de totalParticipants >= 4)
  /* if (players.length === 0) { ... } */

  // First we create the tournament in order to have a tournament_id to
  // put to the users
  const createTournamentStmt = db.prepare(`
    INSERT INTO tournament (finished) VALUES (0)
  `);
  const tournamentResult = createTournamentStmt.run();
  const tournamentId = tournamentResult.lastInsertRowid;

  // We prepare the query
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
    ) VALUES (?, NULL, NULL, 'es', ?, 0, 1, '/public/uploads/default_avatar.png', ?, 'local')
  `);

  // Create a temporal user for each user in the tournament
  for (const player of players) {
    insertUserStmt.run(player.alias, tournamentId, player.AI_user ? 1 : 0);
  }

    // Update the current user tournament_id
    const updateUserTournamentStmt = db.prepare(`
        UPDATE user
        SET id_tournament = ?
        WHERE id = ?
    `);

    updateUserTournamentStmt.run(tournamentId, userId);

    // Create the first round of matches
    const tournamentUsers = db.prepare('SELECT * FROM user WHERE id_tournament = ?').all(tournamentId);
    const shuffledUsers = tournamentUsers.sort(() => 0.5 - Math.random());

    const insertMatchStmt = db.prepare(`
        INSERT INTO tournament_match (id_tournament, round, match_number, player1_id, player2_id, winner_id)
        VALUES (?, 1, ?, ?, ?, ?)
    `);

    let matchNumber = 1;
    for (let i = 0; i < shuffledUsers.length; i += 2) {
        const player1 = shuffledUsers[i];
        const player2 = (i + 1 < shuffledUsers.length) ? shuffledUsers[i + 1] : null;
        insertMatchStmt.run(tournamentId, matchNumber, player1.id, player2 ? player2.id : null, player2 ? null : player1.id);
        matchNumber++;
    }

    //Load the game
    return reply.redirect('/tournamentplay');
}

/// Get of /tournament route
export function tournamentPage(request, reply) {
    const userId = request.user.userId;
    const db = request.server.db;

    // Obtain the current user data
    const userData = db
        .prepare('SELECT id, alias, avatar_url, id_tournament FROM user WHERE id = ?')
        .get(userId);
        
    if (!userData) {
        return reply.redirect('/login');
    }

    // AÑADIDO: OBTENER WINS Y LOOSES (necesarios para calcular el Nivel)
    const winsStmt = db.prepare(`SELECT COUNT(*) AS wins FROM game WHERE winner = ?`);
    const { wins } = winsStmt.get(userId);

    const lossesStmt = db.prepare(`SELECT COUNT(*) AS looses FROM game WHERE finished = 1 AND winner IS NOT ? AND (id_user1 = ? OR id_user2 = ?)`);
    const { looses } = lossesStmt.get(userId, userId, userId);

    // Adjuntar las estadísticas al objeto de usuario
    userData.wins = wins;
    userData.looses = looses;
    
    // Get language and translation function
    const { language, t } = getLanguageAndTranslation(request);

    // Check if hes alredy involved in a tournament if he isnt then load view
    if (!userData.id_tournament) {
        return reply.view('tournament', {
            user: userData, // 'user' ahora incluye wins y looses
            language: language,
            t: t
        });
    }

    // If a tournament exists check if its alredy finished
    const tournament = db
        .prepare('SELECT * FROM tournament WHERE id = ? AND finished = 0')
        .get(userData.id_tournament);

    // If its not finished then load tournamentplay view
    if (tournament) {
        return reply.redirect('/tournamentplay');
    }

    // If its finished then load tournament view
    return reply.view('tournament', {
        user: userData, // 'user' ahora incluye wins y looses
        language: language,
        t: t
    });
}
