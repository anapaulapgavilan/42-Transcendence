
// ------------------------
// gamePlay.js
// ------------------------

// Obtain data from the ejs
const {
    userName,
    opponentName,
    score1: initialScore1,
    score2: initialScore2,
    isAI,
    humanPlayer, // 'left', 'right', or null
    isPlayer1AI,
    isPlayer2AI,
    match_id,
    difficulty,
    backToHomeText
} = window.GAME_DATA;

// Create the canvas and the context
const canvas = document.getElementById("pong");
const ctx = canvas.getContext("2d");

// Game config
const PADDLE_WIDTH = 10;
const PADDLE_HEIGHT = 100;
const WINNING_SCORE = 7;
const BALL_SPEED = 6;

const AI_OBSERVE_INTERVAL = 1000; // ms
const AI_COMMAND_COOLDOWN = 150; // ms between direction changes

const PLAYER_FAST_SPEED = 6;

const DIFFICULTY_PRESETS = {
  easy: {
    label: "Easy",
    fastSpeed: 6,
    slowSpeed: 6,
    jitter: 1.2,
    deadzone: 4.2,
    slowPadding: 14,
    slowWindow: 1,
    preferSlow: true,
    anticipation: 0.58,
  },
  medium: {
    label: "Medium",
    fastSpeed: 6,
    slowSpeed: 6,
    jitter: 0.35,
    deadzone: 1.5,
    slowPadding: 6,
    slowWindow: 0.6,
    preferSlow: false,
    anticipation: 1,
  },
  hard: {
    label: "Hard",
    fastSpeed: 6,
    slowSpeed: 6,
    jitter: 0.12,
    deadzone: 0.45,
    slowPadding: 2,
    slowWindow: 0.3,
    preferSlow: false,
    anticipation: 1.5,
  },
};

const PREDICTION_MIN_ITERATIONS = 18;
const PREDICTION_ITERATION_FACTOR = 0.45;
const BASE_PREDICTION_ITERATIONS = Math.max(
  PREDICTION_MIN_ITERATIONS,
  Math.ceil((canvas.width / BALL_SPEED) * PREDICTION_ITERATION_FACTOR)
);

let currentDifficultyKey = difficulty || 'medium';
let currentDifficulty = { ...DIFFICULTY_PRESETS[currentDifficultyKey] };
let aiFastSpeed = 6;
let aiSlowSpeed = 6;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function createAdaptiveState(base) {
  return {
    jitter: base.jitter,
    deadzone: base.deadzone,
    slowPadding: base.slowPadding,
    slowWindow: base.slowWindow,
    preferSlow: !!base.preferSlow,
    rallySuccesses: 0,
    rallyMisses: 0,
    lastInterceptSuccessful: true,
    mood: "balanced",
    humanMotion: 0,
  };
}

let aiAdaptive = createAdaptiveState(currentDifficulty);

const leftPaddle = {
  x: 0,
  y: canvas.height / 2 - PADDLE_HEIGHT / 2,
  dy: 0,
};

const rightPaddle = {
  x: canvas.width - PADDLE_WIDTH,
  y: canvas.height / 2 - PADDLE_HEIGHT / 2,
  dy: 0,
};

const ball = {
  x: canvas.width / 2,
  y: canvas.height / 2,
  radius: 8,
  dx: 0,
  dy: 0,
};

const score = { left: initialScore1, right: initialScore2 };
let gameOver = false;

const aiEnabled = isPlayer1AI || isPlayer2AI;
const humanPaddle = humanPlayer === 'left' ? leftPaddle : (humanPlayer === 'right' ? rightPaddle : null);
const aiPaddle = isPlayer1AI ? leftPaddle : (isPlayer2AI ? rightPaddle : null);
const aiPaddleIsRight = aiPaddle === rightPaddle;


let aiObserveHandle = null;
let lastObservationTime = 0;
let lastCommandTimestamp = 0;

let aiSlowMove = false;

const aiState = {
  currentKey: null,
  slowMode: false,
};

const aiPlan = {
  targetCenter: null,
  direction: null,
  interceptFrames: 0,
};

function resetAIPlan() {
  aiPlan.targetCenter = null;
  aiPlan.direction = null;
  aiPlan.interceptFrames = 0;
}

function recordAIContact(success) {
  if (success) {
    aiAdaptive.rallySuccesses = Math.min(aiAdaptive.rallySuccesses + 1, 8);
    aiAdaptive.rallyMisses = Math.max(aiAdaptive.rallyMisses - 1, 0);
    aiAdaptive.lastInterceptSuccessful = true;
  } else {
    aiAdaptive.rallyMisses = Math.min(aiAdaptive.rallyMisses + 1, 6);
    aiAdaptive.rallySuccesses = 0;
    aiAdaptive.lastInterceptSuccessful = false;
  }
}

function trackHumanMotion() {
  if (!humanPaddle) return; // Prevent crash on spectator mode
  aiAdaptive.humanMotion =
    aiAdaptive.humanMotion * 0.9 + Math.abs(humanPaddle.dy) * 0.1;
}

function setDifficulty(key, options = {}) {
  if (!DIFFICULTY_PRESETS[key]) return;
  currentDifficultyKey = key;
  currentDifficulty = { ...DIFFICULTY_PRESETS[key] };
  aiFastSpeed = 6;
  aiSlowSpeed = 6;
  aiAdaptive = createAdaptiveState(currentDifficulty);
  if (!options.silent) {
    releaseAIControl();
  }
}

function computeAITuning() {
  const scoreDiff = score.left - score.right;
  const rightLead = score.right - score.left;
  const verticalSpeed = Math.abs(ball.dy);
  const {
    rallySuccesses,
    rallyMisses,
    lastInterceptSuccessful,
    humanMotion,
  } = aiAdaptive;

  let mood = "balanced";
  if (!lastInterceptSuccessful || scoreDiff >= 2 || rallyMisses >= 2) {
    mood = "catchup";
  } else if (humanMotion > 4 || verticalSpeed > 5.2) {
    mood = "alert";
  } else if (rightLead >= 2 && rallySuccesses >= 3) {
    mood = "confident";
  } else if (scoreDiff >= 1) {
    mood = "catchup";
  }

  const tuning = {
    jitter: currentDifficulty.jitter,
    deadzone: currentDifficulty.deadzone,
    slowPadding: currentDifficulty.slowPadding,
    slowWindow: currentDifficulty.slowWindow,
    preferSlow: currentDifficulty.preferSlow,
  };

  switch (mood) {
    case "catchup":
      tuning.jitter = Math.max(0.08, tuning.jitter * 0.35);
      tuning.deadzone = Math.max(0.5, tuning.deadzone * 0.55);
      tuning.slowPadding = Math.max(2, tuning.slowPadding - 2);
      tuning.slowWindow = Math.max(0.4, tuning.slowWindow - 0.1);
      tuning.preferSlow = false;
      break;
    case "alert":
      tuning.jitter = Math.max(0.1, tuning.jitter * 0.55);
      tuning.deadzone = Math.max(0.6, tuning.deadzone * 0.75);
      tuning.slowPadding = Math.max(3, tuning.slowPadding - 1);
      tuning.slowWindow = Math.max(0.45, tuning.slowWindow - 0.05);
      break;
    case "confident":
      tuning.jitter = tuning.jitter * 1.35;
      tuning.deadzone = tuning.deadzone * 1.35;
      tuning.slowPadding = Math.min(tuning.slowPadding + 3, 12);
      tuning.slowWindow = Math.min(tuning.slowWindow + 0.1, 0.9);
      tuning.preferSlow = true;
      break;
    default:
      break;
  }

  aiAdaptive.jitter = tuning.jitter;
  aiAdaptive.deadzone = tuning.deadzone;
  aiAdaptive.slowPadding = tuning.slowPadding;
  aiAdaptive.slowWindow = tuning.slowWindow;
  aiAdaptive.preferSlow = tuning.preferSlow;
  aiAdaptive.mood = mood;

  return tuning;
}

function launchBall(direction) {
  // If Player vs AI, ball always moves towards the human player.
  if (isPlayer1AI && !isPlayer2AI) { // P1 is AI (left), P2 is Human (right)
    direction = 1; // Move towards Human player (right)
  } else if (!isPlayer1AI && isPlayer2AI) { // P1 is Human (left), P2 is AI (right)
    direction = -1; // Move towards Human player (left)
  }
  // For Player vs Player or AI vs AI, the original 'direction' parameter is used.

  const speed = BALL_SPEED;
  const minAngle = (15 * Math.PI) / 180;
  const maxAngle = (45 * Math.PI) / 180;
  let angle = minAngle + Math.random() * (maxAngle - minAngle);
  if (Math.random() < 0.5) angle = -angle;

  ball.dx = direction * speed * Math.cos(angle);
  ball.dy = speed * Math.sin(angle);
  ball.x = canvas.width / 2;
  ball.y = canvas.height / 2;
}

function dispatchKeyEvent(type, key) {
  const event = new KeyboardEvent(type, {
    key,
    bubbles: true,
  });
  document.dispatchEvent(event);
}

function setAICommand(command, useSlowMode) {
  const now =
    typeof performance !== "undefined" ? performance.now() : Date.now();
  const previousKey = aiState.currentKey;
  const previousSlow = aiState.slowMode;

  if (
    command &&
    previousKey &&
    command !== previousKey &&
    lastCommandTimestamp &&
    now - lastCommandTimestamp < AI_COMMAND_COOLDOWN
  ) {
    return;
  }

  const slowChanged = previousSlow !== useSlowMode;
  if (slowChanged) {
    aiState.slowMode = useSlowMode;
    aiSlowMove = useSlowMode;
    if (previousKey && command === previousKey) {
      dispatchKeyEvent("keyup", previousKey);
      aiState.currentKey = null;
    }
  }

  if (command === previousKey && !slowChanged) {
    return;
  }

  if (previousKey && command !== previousKey) {
    dispatchKeyEvent("keyup", previousKey);
    aiState.currentKey = null;
  }

  if (!command) {
    aiState.currentKey = null;
    aiState.slowMode = false;
    aiSlowMove = false;
    lastCommandTimestamp = now;
    return;
  }

  if (!slowChanged) {
    aiState.slowMode = useSlowMode;
    aiSlowMove = useSlowMode;
  }

  dispatchKeyEvent("keydown", command);
  aiState.currentKey = command;
  lastCommandTimestamp = now;
}

function clearAICommand() {
  if (aiState.currentKey) {
    dispatchKeyEvent("keyup", aiState.currentKey);
    aiState.currentKey = null;
  }
  aiState.slowMode = false;
  aiSlowMove = false;
  resetAIPlan();
}

function releaseAIControl() {
  setAICommand(null, false);
  resetAIPlan();
}

function startAI() {
  if (!aiEnabled) return;
  if (aiObserveHandle) clearInterval(aiObserveHandle);
  lastObservationTime = 0;
  aiObserveHandle = setInterval(observeAI, AI_OBSERVE_INTERVAL);
    observeAI();
}

function stopAI() {
  if (aiObserveHandle) {
    clearInterval(aiObserveHandle);
    aiObserveHandle = null;
  }
  clearAICommand();
}

document.addEventListener("keydown", (e) => {
    // If player 1 is human, control with W/S
    if (!isPlayer1AI) {
        if (e.key === "w") leftPaddle.dy = -PLAYER_FAST_SPEED;
        if (e.key === "s") leftPaddle.dy = PLAYER_FAST_SPEED;
    }

    // If player 2 is human, control with ArrowUp/ArrowDown
    if (!isPlayer2AI) {
        if (e.key === "ArrowUp") rightPaddle.dy = -PLAYER_FAST_SPEED;
        if (e.key === "ArrowDown") rightPaddle.dy = PLAYER_FAST_SPEED;
    }

    // AI-dispatched events
    if (aiEnabled && !e.isTrusted) {
        const aiUpKey = aiPaddleIsRight ? "ArrowUp" : "w";
        const aiDownKey = aiPaddleIsRight ? "ArrowDown" : "s";
        if (e.key === aiUpKey) {
            aiPaddle.dy = aiSlowMove ? -aiSlowSpeed : -aiFastSpeed;
        } else if (e.key === aiDownKey) {
            aiPaddle.dy = aiSlowMove ? aiSlowSpeed : aiFastSpeed;
        }
    }
});

document.addEventListener("keyup", (e) => {
    // If player 1 is human, control with W/S
    if (!isPlayer1AI) {
        if (e.key === "w" || e.key === "s") leftPaddle.dy = 0;
    }

    // If player 2 is human, control with ArrowUp/ArrowDown
    if (!isPlayer2AI) {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") rightPaddle.dy = 0;
    }

    // AI-dispatched events
    if (aiEnabled && !e.isTrusted) {
        const aiUpKey = aiPaddleIsRight ? "ArrowUp" : "w";
        const aiDownKey = aiPaddleIsRight ? "ArrowDown" : "s";
        if (e.key === aiUpKey || e.key === aiDownKey) {
            aiPaddle.dy = 0;
        }
    }
});


function predictImpact(ballState, targetX) {
  let simX = ballState.x;
  let simY = ballState.y;
  let simDX = ballState.dx;
  let simDY = ballState.dy;
  let totalFrames = 0;

  const isMovingTowardsTarget = aiPaddleIsRight ? simDX > 0 : simDX < 0;
  if (!isMovingTowardsTarget) return null;

  const anticipation = currentDifficulty.anticipation ?? 1;
  const maxIterations = Math.max(
    PREDICTION_MIN_ITERATIONS,
    Math.round(BASE_PREDICTION_ITERATIONS * anticipation)
  );

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    if (aiPaddleIsRight ? simX >= targetX : simX <= targetX) break;

    const distanceX = targetX - simX;
    const timeToImpactX = distanceX / simDX;
    if (timeToImpactX <= 0) break;

    let timeToWall = Infinity;
    if (simDY > 0) {
      timeToWall = (canvas.height - ballState.radius - simY) / simDY;
    } else if (simDY < 0) {
      timeToWall = (simY - ballState.radius) / -simDY;
    }

    if (timeToWall < timeToImpactX) {
      simX += simDX * timeToWall;
      simY += simDY * timeToWall;
      simDY = -simDY;
      totalFrames += timeToWall;
    } else {
      simX = targetX;
      simY += simDY * timeToImpactX;
      totalFrames += timeToImpactX;
      break;
    }
  }

  return { y: simY, frames: totalFrames };
}

function observeAI() {
  if (!aiEnabled) return;
  if (gameOver) {
    clearAICommand();
    return;
  }

  const now = typeof performance !== "undefined" ? performance.now() : Date.now();
  if (now - lastObservationTime < AI_OBSERVE_INTERVAL) {
    return;
  }
  lastObservationTime = now;

  const tuning = computeAITuning();
  
  const aiCommandUp = aiPaddleIsRight ? "ArrowUp" : "w";
  const aiCommandDown = aiPaddleIsRight ? "ArrowDown" : "s";

  const isBallComing = aiPaddleIsRight ? ball.dx > 0 : ball.dx < 0;

  if (!isBallComing) {
    const targetY = canvas.height / 2 - PADDLE_HEIGHT / 2;
    const delta = targetY - aiPaddle.y;
    if (Math.abs(delta) <= tuning.deadzone) {
      releaseAIControl();
    } else {
      const useSlow = Math.abs(delta) < PADDLE_HEIGHT * tuning.slowWindow;
      const command = delta > 0 ? aiCommandDown : aiCommandUp;
      const targetCenter = clamp(
        canvas.height / 2,
        PADDLE_HEIGHT / 2,
        canvas.height - PADDLE_HEIGHT / 2
      );
      setAICommand(command, useSlow);
      aiPlan.targetCenter = targetCenter;
      aiPlan.direction = command;
      aiPlan.interceptFrames =
        Math.abs(delta) / (useSlow ? aiSlowSpeed : aiFastSpeed);
    }
    return;
  }

  const impactX = aiPaddleIsRight ? aiPaddle.x - ball.radius : aiPaddle.x + PADDLE_WIDTH + ball.radius;
  const prediction = predictImpact(ball, impactX);
  if (!prediction) {
    releaseAIControl();
    return;
  }

  const jitter = Math.random() * (2 * tuning.jitter) - tuning.jitter;
  const predictedCenter = clamp(
    prediction.y + jitter,
    PADDLE_HEIGHT / 2,
    canvas.height - PADDLE_HEIGHT / 2
  );
  const paddleCenterY = aiPaddle.y + PADDLE_HEIGHT / 2;
  const error = predictedCenter - paddleCenterY;

  if (Math.abs(error) <= tuning.deadzone) {
    releaseAIControl();
    return;
  }

  const travelFramesFast = Math.abs(error) / aiFastSpeed;
  const travelFramesSlow = Math.abs(error) / aiSlowSpeed;
  const timeBuffer = prediction.frames;

  let shouldUseSlow = false;
  if (tuning.preferSlow) {
    shouldUseSlow = travelFramesSlow + tuning.slowPadding < timeBuffer;
  } else {
    shouldUseSlow =
      travelFramesSlow + tuning.slowPadding < timeBuffer &&
      Math.abs(error) < PADDLE_HEIGHT * tuning.slowWindow;
  }

  const command = error > 0 ? aiCommandDown : aiCommandUp;
  setAICommand(command, shouldUseSlow);
  aiPlan.targetCenter = predictedCenter;
  aiPlan.direction = command;
  aiPlan.interceptFrames = timeBuffer;
}

// Store the score after each point
function saveScore() {
    // We dont save score in tournament matches
    if (match_id) return;
    fetch("/game/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scoreLeft: score.left, scoreRight: score.right })
    });
}

function update() {
  if (gameOver) return;

  leftPaddle.y += leftPaddle.dy;
  rightPaddle.y += rightPaddle.dy;

  trackHumanMotion();

  leftPaddle.y = clamp(leftPaddle.y, 0, canvas.height - PADDLE_HEIGHT);
  rightPaddle.y = clamp(rightPaddle.y, 0, canvas.height - PADDLE_HEIGHT);

  if (aiEnabled && aiPlan.direction && aiState.currentKey) {
    const paddleCenterY = aiPaddle.y + PADDLE_HEIGHT / 2;
    const error = aiPlan.targetCenter - paddleCenterY;
    const movingDown = aiPlan.direction === (aiPaddleIsRight ? "ArrowDown" : "s");
    const activeDeadzone = aiAdaptive.deadzone;
    
    const isBallComing = aiPaddleIsRight ? ball.dx > 0 : ball.dx < 0;

    if (
      (movingDown && error <= activeDeadzone) ||
      (!movingDown && error >= -activeDeadzone) ||
      (movingDown && error < 0) ||
      (!movingDown && error > 0)
    ) {
      releaseAIControl();
    } else if (!isBallComing) {
      releaseAIControl();
    }
  }

  ball.x += ball.dx;
  ball.y += ball.dy;

  if (ball.y - ball.radius <= 0 || ball.y + ball.radius >= canvas.height) {
    ball.dy = -ball.dy;
  }

  // Left paddle collision (if human)
  if (!isPlayer1AI && ball.x - ball.radius <= leftPaddle.x + PADDLE_WIDTH && ball.dx < 0) {
      const paddle = leftPaddle;
      if (ball.y >= paddle.y && ball.y <= paddle.y + PADDLE_HEIGHT) {
        ball.dx = -ball.dx;
        const hitPoint = (ball.y - (paddle.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
        const angle = hitPoint * (Math.PI / 4);
        const speed = Math.hypot(ball.dx, ball.dy);
        ball.dx = Math.abs(speed * Math.cos(angle));
        ball.dy = speed * Math.sin(angle);
        if(aiEnabled) aiAdaptive.rallySuccesses = Math.max(aiAdaptive.rallySuccesses - 1, 0);
      }
  }

  // Right paddle collision (if human)
  if (!isPlayer2AI && ball.x + ball.radius >= rightPaddle.x && ball.dx > 0) {
      const paddle = rightPaddle;
      if (ball.y >= paddle.y && ball.y <= paddle.y + PADDLE_HEIGHT) {
        ball.dx = -ball.dx;
        const hitPoint = (ball.y - (paddle.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
        const angle = hitPoint * (Math.PI / 4);
        const speed = Math.hypot(ball.dx, ball.dy);
        ball.dx = -Math.abs(speed * Math.cos(angle));
        ball.dy = speed * Math.sin(angle);
        if(aiEnabled) aiAdaptive.rallySuccesses = Math.max(aiAdaptive.rallySuccesses - 1, 0);
      }
  }

  // AI paddle collision
  if (
    aiEnabled &&
    ((aiPaddleIsRight && ball.x + ball.radius >= rightPaddle.x && ball.dx > 0) ||
    (!aiPaddleIsRight && ball.x - ball.radius <= leftPaddle.x + PADDLE_WIDTH && ball.dx < 0))
  ) {
      const paddle = aiPaddle;
      if (ball.y >= paddle.y && ball.y <= paddle.y + PADDLE_HEIGHT) {
        ball.dx = -ball.dx;
        const hitPoint = (ball.y - (paddle.y + PADDLE_HEIGHT / 2)) / (PADDLE_HEIGHT / 2);
        const angle = hitPoint * (Math.PI / 4);
        const speed = Math.hypot(ball.dx, ball.dy);
        ball.dx = (aiPaddleIsRight ? -1 : 1) * Math.abs(speed * Math.cos(angle));
        ball.dy = speed * Math.sin(angle);
        recordAIContact(true);
      }
  }

  // Score logic
  if (ball.x - ball.radius < 0) {
    score.right++;
    if(aiEnabled) recordAIContact(true);
    saveScore();
    if (score.right >= WINNING_SCORE) {
      gameOver = true;
      stopAI();
    } else {
      releaseAIControl();
      launchBall(1);
    }
  }

  if (ball.x + ball.radius > canvas.width) {
    score.left++;
    if(aiEnabled) recordAIContact(false);
    saveScore();
    if (score.left >= WINNING_SCORE) {
      gameOver = true;
      stopAI();
    } else {
      releaseAIControl();
      launchBall(-1);
    }
  }
  
  // Game Over
  if (gameOver) {
      // If it is a tournament match
      if (match_id) {
          fetch("/tournament/match/score", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ 
                  match_id: match_id,
                  scoreLeft: score.left,
                  scoreRight: score.right
              })
          })
          .then(response => response.json())
          .then(data => {
              if (data.success) {
                  // Redirect to tournament view to see the updated bracket
                  window.location.href = '/tournamentplay';
              }
          });
      } else {
          // If it is a regular match
          fetch("/game/end", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ scoreLeft: score.left, scoreRight: score.right })
          });
          // Create and show the button
          const homeButton = document.createElement('a');
          homeButton.href = '/home';
          homeButton.textContent = backToHomeText;
          homeButton.className = 'btn btn-primary';
          document.body.appendChild(homeButton);
      }
  }
}

function render() {
    // Fondo con gradiente sutil
    const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, "#0a0e1a");
    gradient.addColorStop(0.5, "#151b2d");
    gradient.addColorStop(1, "#0a0e1a");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Línea central punteada
    ctx.strokeStyle = "rgba(255, 255, 255, 0.2)";
    ctx.lineWidth = 2;
    ctx.setLineDash([10, 10]);
    ctx.beginPath();
    ctx.moveTo(canvas.width / 2, 0);
    ctx.lineTo(canvas.width / 2, canvas.height);
    ctx.stroke();
    ctx.setLineDash([]);

    // Paddle izquierda (color cyan/azul)
    const leftGradient = ctx.createLinearGradient(
        leftPaddle.x, leftPaddle.y,
        leftPaddle.x, leftPaddle.y + PADDLE_HEIGHT
    );
    leftGradient.addColorStop(0, "#00d4ff");
    leftGradient.addColorStop(0.5, "#00a8cc");
    leftGradient.addColorStop(1, "#00d4ff");
    ctx.fillStyle = leftGradient;
    ctx.fillRect(leftPaddle.x, leftPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    
    // Borde de la paddle izquierda
    ctx.strokeStyle = "#00ffff";
    ctx.lineWidth = 1;
    ctx.strokeRect(leftPaddle.x, leftPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Paddle derecha (color magenta/rosa)
    const rightGradient = ctx.createLinearGradient(
        rightPaddle.x, rightPaddle.y,
        rightPaddle.x, rightPaddle.y + PADDLE_HEIGHT
    );
    rightGradient.addColorStop(0, "#ff00ff");
    rightGradient.addColorStop(0.5, "#cc00aa");
    rightGradient.addColorStop(1, "#ff00ff");
    ctx.fillStyle = rightGradient;
    ctx.fillRect(rightPaddle.x, rightPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);
    
    // Borde de la paddle derecha
    ctx.strokeStyle = "#ff66ff";
    ctx.lineWidth = 1;
    ctx.strokeRect(rightPaddle.x, rightPaddle.y, PADDLE_WIDTH, PADDLE_HEIGHT);

    // Bola con gradiente radial
    const ballGradient = ctx.createRadialGradient(
        ball.x, ball.y, 0,
        ball.x, ball.y, ball.radius
    );
    ballGradient.addColorStop(0, "#ffffff");
    ballGradient.addColorStop(0.7, "#f0f0f0");
    ballGradient.addColorStop(1, "#cccccc");
    ctx.fillStyle = ballGradient;
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Borde de la bola
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Scores con mejor tipografía
    ctx.font = "bold 32px 'Arial', sans-serif";
    ctx.textAlign = "center";
    
    // Score izquierdo (color cyan)
    ctx.fillStyle = "#00d4ff";
    ctx.fillText(`${userName}`, canvas.width / 4, 35);
    ctx.font = "bold 40px 'Arial', sans-serif";
    ctx.fillText(`${score.left}`, canvas.width / 4, 75);
    
    // Score derecho (color magenta)
    ctx.fillStyle = "#ff00ff";
    ctx.font = "bold 32px 'Arial', sans-serif";
    ctx.fillText(`${opponentName}`, (canvas.width * 3) / 4, 35);
    ctx.font = "bold 40px 'Arial', sans-serif";
    ctx.fillText(`${score.right}`, (canvas.width * 3) / 4, 75);


}

function gameLoop() {
  update();
  render();
  requestAnimationFrame(gameLoop);
}

// Backup when closing
window.onbeforeunload = function(){
    if (match_id) return;
    const data = JSON.stringify({ scoreLeft: score.left, scoreRight: score.right });
    navigator.sendBeacon("/game/score", data);
};

// Init 
setDifficulty(currentDifficultyKey, { silent: true });
if (aiEnabled) {
    startAI();
}
launchBall(Math.random() < 0.5 ? 1 : -1);
gameLoop();
