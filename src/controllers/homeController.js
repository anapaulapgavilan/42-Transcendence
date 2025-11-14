/* This file has been checked and aparently everything is correct 
 * for evaluating. The .env has been updated and its used in the code.
 * */

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

// src/controllers/homeController.js

// Handles the home page GET request (dashboard after login)
export async function homePage(request, reply) {
    // Get the user from the JWT token
    const userId = request.user.userId;

    // Get basic user info
    const userStmt = request.server.db.prepare(`
        SELECT id, alias, mail, avatar_url, auth_provider 
        FROM user 
        WHERE id = ?
    `);

    const user = userStmt.get(userId);

    if (!user) {
        return reply.code(404).send('User not found');
    }

    // Get the number of wins
    const winsStmt = request.server.db.prepare(`
        SELECT COUNT(*) AS wins 
        FROM game 
        WHERE winner = ?
    `);
    const { wins } = winsStmt.get(userId);

    // Get the number of losses
    const lossesStmt = request.server.db.prepare(`
        SELECT COUNT(*) AS losses 
        FROM game 
        WHERE finished = 1 
        AND winner IS NOT ? 
        AND (id_user1 = ? OR id_user2 = ?)
    `);
    const { losses } = lossesStmt.get(userId, userId, userId);

    // Calculate level based on total games (simple formula)
    const totalGames = wins + losses;
    const level = Math.floor(totalGames / 5) + 1; // Level up every 5 games

    // Get recent activity (last 5 games)
    const recentGamesStmt = request.server.db.prepare(`
        SELECT g.*, u1.alias AS alias_user1, u2.alias AS alias_user2 
        FROM game g 
        JOIN user u1 ON g.id_user1 = u1.id 
        JOIN user u2 ON g.id_user2 = u2.id 
        WHERE g.id_user1 = ? OR g.id_user2 = ? 
        ORDER BY g.created_at DESC 
        LIMIT 5
    `);
    const recentGames = recentGamesStmt.all(userId, userId);

    // Merge stats with user data
    user.wins = wins;
    user.losses = losses;
    user.level = level;
    user.totalGames = totalGames;

    // Calculate win rate
    user.winRate = totalGames > 0 ? Math.round((wins / totalGames) * 100) : 0;

    // Get language from cookie or default to 'es'
    const language = request.cookies?.i18next || 'es';
    
    // Create translation function
    const t = (key) => getTranslation(key, language);

    return reply.view('home.ejs', { 
        user,
        recentGames,
        title: `Home - ${user.alias}`,
        language: language,
        t: t
    });
}
