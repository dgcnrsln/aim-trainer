// --- CONFIG ---
const DIFFICULTY_SETTINGS = {
    easy: { size: 90, lifetime: 1200 },
    medium: { size: 60, lifetime: 1000 },
    hard: { size: 40, lifetime: 700 }
};

// --- STATE ---
const state = {
    duration: 60,
    difficulty: 'medium',
    isPlaying: false,
    score: 0,
    hits: 0,
    misses: 0,
    clicks: 0,
    timeLeft: 0,
    timerInterval: null,
    targetTimeout: null
};

// --- DOM ELEMENTS ---
const screens = {
    start: document.getElementById('start-screen'),
    game: document.getElementById('game-screen'),
    end: document.getElementById('end-screen')
};

const ui = {
    timeBtns: document.querySelectorAll('#time-select .select-btn'),
    diffBtns: document.querySelectorAll('#diff-select .select-btn'),
    highscore: document.getElementById('highscore-display'),
    modeLabel: document.getElementById('mode-label'),
    timer: document.getElementById('timer-display'),
    score: document.getElementById('score-display'),
    acc: document.getElementById('acc-display'),
    finalScore: document.getElementById('final-score'),
    finalAcc: document.getElementById('final-acc'),
    finalHits: document.getElementById('final-hits'),
    finalMisses: document.getElementById('final-misses'),
    crosshair: document.getElementById('crosshair'),
    container: document.getElementById('game-container')
};

const audio = {
    hit: new Audio('assets/shoot.mp3')
};

// --- INITIALIZATION ---
function init() {
    setupListeners();
    updateHighscoreDisplay();
}

function setupListeners() {
    // Buttons
    document.getElementById('start-btn').addEventListener('click', startGame);
    document.getElementById('restart-btn').addEventListener('click', startGame);
    document.getElementById('menu-btn').addEventListener('click', showMenu);

    // Settings
    ui.timeBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            ui.timeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.duration = parseInt(btn.dataset.value);
            ui.modeLabel.textContent = state.duration;
            updateHighscoreDisplay();
        });
    });

    ui.diffBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            ui.diffBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            state.difficulty = btn.dataset.value;
        });
    });

    // Custom Cursor
    document.addEventListener('mousemove', (e) => {
        ui.crosshair.style.left = e.clientX + 'px';
        ui.crosshair.style.top = e.clientY + 'px';
    });

    // In-Game Clicks (Event Delegation)
    ui.container.addEventListener('mousedown', handleGameClick);
}

// --- GAME LOGIC ---

function updateHighscoreDisplay() {
    const key = `aim_highscore_${state.duration}`;
    ui.highscore.textContent = localStorage.getItem(key) || 0;
}

function showMenu() {
    switchScreen('start');
    updateHighscoreDisplay();
}

function startGame() {
    // Reset Stats
    state.score = 0;
    state.hits = 0;
    state.misses = 0;
    state.clicks = 0;
    state.timeLeft = state.duration;
    state.isPlaying = true;

    // UI Reset
    updateHUD();
    ui.container.innerHTML = ''; // Clear old targets

    switchScreen('game');

    // Start Loop
    state.timerInterval = setInterval(() => {
        state.timeLeft--;
        updateHUD();
        if (state.timeLeft <= 0) {
            endGame();
        }
    }, 1000);

    spawnTarget();
}

function endGame() {
    state.isPlaying = false;
    clearInterval(state.timerInterval);
    clearTimeout(state.targetTimeout);

    // Save High Score
    const key = `aim_highscore_${state.duration}`;
    const currentHigh = parseInt(localStorage.getItem(key) || 0);
    if (state.score > currentHigh) {
        localStorage.setItem(key, state.score);
    }

    // Populate End Screen
    ui.finalScore.textContent = state.score;
    ui.finalAcc.textContent = calculateAccuracy() + '%';
    ui.finalHits.textContent = state.hits;
    ui.finalMisses.textContent = state.misses;

    switchScreen('end');
}

function spawnTarget() {
    if (!state.isPlaying) return;

    ui.container.innerHTML = ''; // Ensure only one target

    const setting = DIFFICULTY_SETTINGS[state.difficulty];
    const target = document.createElement('div');
    target.classList.add('target');
    target.style.width = setting.size + 'px';
    target.style.height = setting.size + 'px';

    // Position (keep fully inside)
    // We assume game-container is full screen
    const maxX = window.innerWidth - setting.size;
    const maxY = window.innerHeight - setting.size; // Leave room for HUD? HUD is overlay
    // HUD takes top ~100px. Let's buffer top.
    const topBuffer = 100;
    const padding = 20;

    const x = Math.floor(Math.random() * (maxX - padding * 2)) + padding;
    const y = Math.floor(Math.random() * (maxY - topBuffer - padding)) + topBuffer;

    target.style.left = x + 'px';
    target.style.top = y + 'px';

    // Data attribute to identify as target
    target.dataset.type = 'target';

    ui.container.appendChild(target);

    // Lifetime
    clearTimeout(state.targetTimeout);
    state.targetTimeout = setTimeout(() => {
        if (state.isPlaying) {
            handleMiss(true); // Miss by timeout
        }
    }, setting.lifetime);
}

function handleGameClick(e) {
    if (!state.isPlaying) return;

    // e.target might be the container or the target
    // Note: 'mousedown' on container acts as the global click listener

    // Logic:
    // If click is on .target -> Hit
    // If click is on container -> Miss (if not target)

    const isTarget = e.target.classList.contains('target');

    if (isTarget) {
        handleHit();
    } else {
        handleMiss(false); // Miss by clicking empty space
    }
}

function handleHit() {
    state.hits++;
    state.clicks++;
    state.score++;

    // Play sound reset
    audio.hit.currentTime = 0;
    audio.hit.play().catch(() => { });

    updateHUD();
    spawnTarget(); // Immediate respawn
}

function handleMiss(timeout) {
    // If timeout is true, it means the target vanished without being clicked
    // If timeout is false, player clicked background

    state.misses++;
    if (!timeout) state.clicks++;

    updateHUD();
    spawnTarget(); // Respawn
}

function calculateAccuracy() {
    if (state.clicks === 0) return 100;
    return Math.round((state.hits / state.clicks) * 100);
}

function updateHUD() {
    ui.timer.textContent = state.timeLeft;
    ui.score.textContent = state.score;
    ui.acc.textContent = calculateAccuracy() + '%';
}

function switchScreen(name) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[name].classList.remove('hidden');
}

// Start
init();
