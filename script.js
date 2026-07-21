/**
 * ============================================================================
 * PATTERN MEMORY GAME - VANILLA JAVASCRIPT ENGINE
 * ============================================================================
 * Features:
 * - Web Audio API Synthesizer (custom pitch generation for each tile)
 * - Canvas Particle Confetti FX Engine
 * - Dynamic Grid (3x3 for Easy/Medium, 4x4 for Hard)
 * - State Machine: Idle, Countdown, Sequence Playback, User Turn, Pause, Game Over
 * - LocalStorage High Score System per Difficulty
 * - Keyboard & Touch Controls
 */

'use strict';

/* --- Game Configuration & Settings --- */
const CONFIG = {
  difficulties: {
    easy: {
      gridSize: 3,
      totalTiles: 9,
      baseSpeed: 700,      // Sequence tile glow duration in ms
      speedStep: 15,       // Speedup per level in ms
      minSpeed: 400,
      timeMultiplier: 2500 // Turn time per tile in ms
    },
    medium: {
      gridSize: 3,
      totalTiles: 9,
      baseSpeed: 500,
      speedStep: 20,
      minSpeed: 250,
      timeMultiplier: 1800
    },
    hard: {
      gridSize: 4,
      totalTiles: 16,
      baseSpeed: 380,
      speedStep: 25,
      minSpeed: 180,
      timeMultiplier: 1400
    }
  },
  
  // Frequency scale (Hz) for sound generation matching tile indices
  tileFrequencies: [
    261.63, // C4 (Tile 1)
    293.66, // D4 (Tile 2)
    329.63, // E4 (Tile 3)
    349.23, // F4 (Tile 4)
    392.00, // G4 (Tile 5)
    440.00, // A4 (Tile 6)
    493.88, // B4 (Tile 7)
    523.25, // C5 (Tile 8)
    587.33, // D5 (Tile 9)
    659.25, // E5 (Tile 10 - 4x4)
    698.46, // F5 (Tile 11 - 4x4)
    783.99, // G5 (Tile 12 - 4x4)
    880.00, // A5 (Tile 13 - 4x4)
    987.77, // B5 (Tile 14 - 4x4)
    1046.50,// C6 (Tile 15 - 4x4)
    1174.66 // D6 (Tile 16 - 4x4)
  ],

  // Keybindings mapping
  keyMap3x3: {
    '7': 0, '8': 1, '9': 2,
    '4': 3, '5': 4, '6': 5,
    '1': 6, '2': 7, '3': 8,
    'q': 0, 'w': 1, 'e': 2,
    'a': 3, 's': 4, 'd': 5,
    'z': 6, 'x': 7, 'c': 8
  },
  keyMap4x4: {
    '1': 0,  '2': 1,  '3': 2,  '4': 3,
    '5': 4,  '6': 5,  '7': 6,  '8': 7,
    '9': 8,  '0': 9,  'q': 10, 'w': 11,
    'e': 12, 'r': 13, 't': 14, 'y': 15
  }
};

/* --- Audio Synthesizer Class (Web Audio API) --- */
class SoundEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
  }

  // Lazy init audio context on user gesture
  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    return this.isMuted;
  }

  // Play tile musical note
  playTileSound(tileIndex, duration = 0.3) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const freq = CONFIG.tileFrequencies[tileIndex] || 440;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Smooth attack & decay envelope
      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (err) {
      console.warn('Audio play error:', err);
    }
  }

  // Play victory fanfare (Major Arpeggio)
  playSuccessFanfare() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((freq, idx) => {
      setTimeout(() => {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

          gain.gain.setValueAtTime(0.18, this.ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

          osc.connect(gain);
          gain.connect(this.ctx.destination);

          osc.start();
          osc.stop(this.ctx.currentTime + 0.4);
        } catch (e) {}
      }, idx * 90);
    });
  }

  // Play game over descending tone
  playFailSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, this.ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.5);

      gain.gain.setValueAtTime(0.2, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.5);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.5);
    } catch (e) {}
  }

  // Short click blip sound
  playClickSound() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.05);
    } catch (e) {}
  }

  // Countdown beep
  playBeep(isHigh = false) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(isHigh ? 880 : 440, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.12);
    } catch (e) {}
  }
}

/* --- Particle Confetti Canvas Engine --- */
class ParticleConfetti {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.particles = [];
    this.animating = false;

    if (this.canvas) {
      this.resize();
      window.addEventListener('resize', () => this.resize());
    }
  }

  resize() {
    if (!this.canvas) return;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  burst(count = 60) {
    if (!this.ctx) return;
    this.resize();

    const colors = ['#00f2fe', '#ff007f', '#ffb703', '#00f5d4', '#9d4edd', '#ffffff'];
    const originX = this.canvas.width / 2;
    const originY = this.canvas.height / 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 12 + 4;
      this.particles.push({
        x: originX,
        y: originY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 3,
        size: Math.random() * 8 + 4,
        color: colors[Math.floor(Math.random() * colors.length)],
        rotation: Math.random() * Math.PI * 2,
        vRot: (Math.random() - 0.5) * 0.2,
        life: 1.0,
        decay: Math.random() * 0.02 + 0.015
      });
    }

    if (!this.animating) {
      this.animating = true;
      this.render();
    }
  }

  render() {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.25; // Gravity
      p.rotation += p.vRot;
      p.life -= p.decay;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate(p.rotation);
      this.ctx.globalAlpha = Math.max(0, p.life);
      this.ctx.fillStyle = p.color;
      this.ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.render());
    } else {
      this.animating = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

/* --- Main Game Engine --- */
class MemoryGame {
  constructor() {
    // Sound & FX Systems
    this.sound = new SoundEngine();
    this.confetti = new ParticleConfetti('confetti-canvas');

    // DOM Element References
    this.dom = {
      grid: document.getElementById('tile-grid'),
      level: document.getElementById('level-display'),
      score: document.getElementById('score-display'),
      best: document.getElementById('best-display'),
      statusText: document.getElementById('status-text'),
      timerBar: document.getElementById('timer-bar'),
      startBtn: document.getElementById('start-btn'),
      restartBtn: document.getElementById('restart-btn'),
      pauseBtn: document.getElementById('pause-btn'),
      soundBtn: document.getElementById('sound-btn'),
      soundIconOn: document.getElementById('sound-icon-on'),
      soundIconOff: document.getElementById('sound-icon-off'),
      helpBtn: document.getElementById('help-btn'),
      difficultySelect: document.getElementById('difficulty-select'),
      countdownOverlay: document.getElementById('countdown-overlay'),
      countdownText: document.getElementById('countdown-text'),
      
      // Modals
      gameOverModal: document.getElementById('game-over-modal'),
      pauseModal: document.getElementById('pause-modal'),
      helpModal: document.getElementById('help-modal'),
      
      // Modal stats & actions
      finalLevel: document.getElementById('final-level'),
      finalScore: document.getElementById('final-score'),
      finalBest: document.getElementById('final-best'),
      newBestBadge: document.getElementById('new-best-badge'),
      modalRestartBtn: document.getElementById('modal-restart-btn'),
      resumeBtn: document.getElementById('resume-btn'),
      pauseRestartBtn: document.getElementById('pause-restart-btn'),
      closeHelpBtn: document.getElementById('close-help-btn')
    };

    // State Variables
    this.state = 'IDLE'; // 'IDLE', 'COUNTDOWN', 'PLAYING_SEQUENCE', 'USER_TURN', 'PAUSED', 'GAME_OVER'
    this.difficulty = 'medium';
    this.level = 1;
    this.score = 0;
    this.sequence = [];
    this.userStep = 0;
    
    // Timer Variables
    this.timerInterval = null;
    this.turnDuration = 0;
    this.timeRemaining = 0;

    // High Scores (localStorage)
    this.highScores = this.loadHighScores();

    // Bound methods for callbacks
    this.init();
  }

  /* --- Initialization --- */
  init() {
    this.bindEvents();
    this.updateDifficulty();
    this.updateHighScoresDisplay();
  }

  // Storage helper
  loadHighScores() {
    try {
      const saved = localStorage.getItem('neon_pattern_memory_bests');
      return saved ? JSON.parse(saved) : { easy: 0, medium: 0, hard: 0 };
    } catch (e) {
      return { easy: 0, medium: 0, hard: 0 };
    }
  }

  saveHighScore(diff, newScore) {
    this.highScores[diff] = newScore;
    try {
      localStorage.setItem('neon_pattern_memory_bests', JSON.stringify(this.highScores));
    } catch (e) {}
  }

  /* --- Event Bindings --- */
  bindEvents() {
    // Buttons
    this.dom.startBtn.addEventListener('click', () => {
      this.sound.playClickSound();
      this.startGame();
    });

    this.dom.restartBtn.addEventListener('click', () => {
      this.sound.playClickSound();
      this.startGame();
    });

    this.dom.pauseBtn.addEventListener('click', () => {
      this.sound.playClickSound();
      this.togglePause();
    });

    this.dom.soundBtn.addEventListener('click', () => {
      const isMuted = this.sound.toggleMute();
      this.dom.soundIconOn.classList.toggle('hidden', isMuted);
      this.dom.soundIconOff.classList.toggle('hidden', !isMuted);
    });

    this.dom.helpBtn.addEventListener('click', () => {
      this.sound.playClickSound();
      this.openModal(this.dom.helpModal);
    });

    this.dom.closeHelpBtn.addEventListener('click', () => {
      this.sound.playClickSound();
      this.closeModal(this.dom.helpModal);
    });

    this.dom.difficultySelect.addEventListener('change', (e) => {
      this.sound.playClickSound();
      this.difficulty = e.target.value;
      this.updateDifficulty();
      if (this.state !== 'IDLE') {
        this.resetToIdle();
      }
    });

    // Modal Action Buttons
    this.dom.modalRestartBtn.addEventListener('click', () => {
      this.sound.playClickSound();
      this.closeModal(this.dom.gameOverModal);
      this.startGame();
    });

    this.dom.resumeBtn.addEventListener('click', () => {
      this.sound.playClickSound();
      this.togglePause();
    });

    this.dom.pauseRestartBtn.addEventListener('click', () => {
      this.sound.playClickSound();
      this.closeModal(this.dom.pauseModal);
      this.resetToIdle();
      this.startGame();
    });

    // Global Keyboard Listeners
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  /* --- Dynamic Board Generation --- */
  updateDifficulty() {
    const config = CONFIG.difficulties[this.difficulty];
    this.dom.grid.innerHTML = '';
    
    // Set CSS grid class
    if (config.gridSize === 4) {
      this.dom.grid.className = 'tile-grid grid-4x4';
    } else {
      this.dom.grid.className = 'tile-grid grid-3x3';
    }

    const keyLabels = config.gridSize === 4 
      ? ['1','2','3','4','5','6','7','8','9','0','Q','W','E','R','T','Y']
      : ['7','8','9','4','5','6','1','2','3'];

    // Generate Tile Elements
    for (let i = 0; i < config.totalTiles; i++) {
      const tile = document.createElement('div');
      tile.className = `tile tile-${i + 1} disabled`;
      tile.dataset.index = i;
      tile.dataset.key = keyLabels[i] || (i + 1);
      
      // Touch & Click Event
      tile.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.handleTileInput(i);
      });

      this.dom.grid.appendChild(tile);
    }

    this.updateHighScoresDisplay();
  }

  updateHighScoresDisplay() {
    const best = this.highScores[this.difficulty] || 0;
    this.dom.best.textContent = best;
  }

  /* --- Game Flow & State Handlers --- */
  resetToIdle() {
    this.state = 'IDLE';
    this.level = 1;
    this.score = 0;
    this.sequence = [];
    this.userStep = 0;
    this.clearTimer();

    this.dom.level.textContent = '1';
    this.dom.score.textContent = '0';
    this.dom.statusText.textContent = 'Press "Start Game" to begin';
    this.dom.timerBar.style.width = '0%';
    
    this.dom.startBtn.classList.remove('hidden');
    this.dom.restartBtn.classList.add('hidden');
    this.dom.pauseBtn.disabled = true;
    this.dom.difficultySelect.disabled = false;

    this.setBoardInteractive(false);
  }

  startGame() {
    this.sound.init();
    this.level = 1;
    this.score = 0;
    this.sequence = [];
    
    this.dom.level.textContent = '1';
    this.dom.score.textContent = '0';
    this.dom.startBtn.classList.add('hidden');
    this.dom.restartBtn.classList.remove('hidden');
    this.dom.pauseBtn.disabled = false;
    this.dom.difficultySelect.disabled = true;

    this.startRound();
  }

  startRound() {
    this.userStep = 0;
    this.clearTimer();
    this.dom.timerBar.style.width = '0%';
    this.dom.level.textContent = this.level;

    // Generate next tile for sequence
    const config = CONFIG.difficulties[this.difficulty];
    const nextRandomTile = Math.floor(Math.random() * config.totalTiles);
    this.sequence.push(nextRandomTile);

    // Run Countdown Phase
    this.runCountdown(() => {
      this.playSequence();
    });
  }

  /* --- 3-2-1 Countdown --- */
  runCountdown(onComplete) {
    this.state = 'COUNTDOWN';
    this.setBoardInteractive(false);
    this.dom.statusText.textContent = 'Get Ready...';
    this.dom.countdownOverlay.classList.remove('hidden');

    let count = 3;
    this.dom.countdownText.textContent = count;
    this.sound.playBeep(false);

    const interval = setInterval(() => {
      count--;
      if (count > 0) {
        this.dom.countdownText.textContent = count;
        this.sound.playBeep(false);
      } else if (count === 0) {
        this.dom.countdownText.textContent = 'WATCH!';
        this.sound.playBeep(true);
      } else {
        clearInterval(interval);
        this.dom.countdownOverlay.classList.add('hidden');
        onComplete();
      }
    }, 650);
  }

  /* --- Sequence Playback --- */
  playSequence() {
    this.state = 'PLAYING_SEQUENCE';
    this.dom.statusText.textContent = 'Watch the pattern closely...';
    this.setBoardInteractive(false);

    const config = CONFIG.difficulties[this.difficulty];
    // Calculate playback speed (accelerates as levels advance)
    const speed = Math.max(
      config.minSpeed, 
      config.baseSpeed - ((this.level - 1) * config.speedStep)
    );
    const gap = Math.max(100, Math.floor(speed * 0.35));

    let step = 0;
    const playStep = () => {
      if (this.state !== 'PLAYING_SEQUENCE') return; // Handles pause/quit edge case

      if (step < this.sequence.length) {
        const tileIdx = this.sequence[step];
        this.flashTile(tileIdx, speed, () => {
          step++;
          setTimeout(playStep, gap);
        });
      } else {
        // Playback finished -> Start player turn!
        setTimeout(() => {
          this.startUserTurn();
        }, 200);
      }
    };

    setTimeout(playStep, 300);
  }

  /* --- Flash Single Tile --- */
  flashTile(index, duration = 300, callback = null) {
    const tiles = this.dom.grid.children;
    const tile = tiles[index];
    if (!tile) return;

    tile.classList.add('active');
    this.sound.playTileSound(index, duration / 1000);

    setTimeout(() => {
      tile.classList.remove('active');
      if (callback) callback();
    }, duration);
  }

  /* --- Player Turn & Input Verification --- */
  startUserTurn() {
    this.state = 'USER_TURN';
    this.userStep = 0;
    this.dom.statusText.textContent = 'Your turn! Repeat the pattern.';
    this.setBoardInteractive(true);

    // Calculate Turn Timer
    const config = CONFIG.difficulties[this.difficulty];
    this.maxTurnTime = this.sequence.length * config.timeMultiplier;
    this.timeRemaining = this.maxTurnTime;
    
    this.startTurnTimer();
  }

  startTurnTimer() {
    this.clearTimer();
    const startTime = Date.now();

    this.timerInterval = setInterval(() => {
      if (this.state !== 'USER_TURN') return;

      const elapsed = Date.now() - startTime;
      this.timeRemaining = Math.max(0, this.maxTurnTime - elapsed);
      const percent = (this.timeRemaining / this.maxTurnTime) * 100;
      
      this.dom.timerBar.style.width = `${percent}%`;

      if (this.timeRemaining <= 0) {
        this.clearTimer();
        this.handleWrongInput('Time expired!');
      }
    }, 50);
  }

  clearTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  handleTileInput(tileIndex) {
    if (this.state !== 'USER_TURN') return;

    const expectedTile = this.sequence[this.userStep];

    // User clicked tile
    this.flashTile(tileIndex, 200);

    if (tileIndex === expectedTile) {
      // CORRECT TILE CLICKED
      this.userStep++;

      // Check if full sequence matched
      if (this.userStep === this.sequence.length) {
        this.clearTimer();
        this.handleRoundSuccess();
      }
    } else {
      // INCORRECT TILE CLICKED
      this.clearTimer();
      this.handleWrongInput('Wrong pattern sequence!');
    }
  }

  /* --- Round Victory --- */
  handleRoundSuccess() {
    this.state = 'IDLE';
    this.setBoardInteractive(false);
    
    // Add Points: Level x 10 + Time bonus
    const timeBonus = Math.floor((this.timeRemaining / this.maxTurnTime) * 20);
    const addedScore = (this.level * 10) + timeBonus;
    this.score += addedScore;
    
    this.dom.score.textContent = this.score;

    // Check & Update High Score
    const currentBest = this.highScores[this.difficulty] || 0;
    if (this.score > currentBest) {
      this.saveHighScore(this.difficulty, this.score);
      this.updateHighScoresDisplay();
    }

    // Audio & Visual Effects
    this.sound.playSuccessFanfare();
    this.dom.grid.classList.add('success-glow');
    this.dom.level.classList.add('text-bounce');

    // Launch Confetti on milestone levels (every 3 levels or score > 100)
    if (this.level % 3 === 0 || this.score > currentBest) {
      this.confetti.burst(75);
    }

    this.dom.statusText.textContent = `Excellent! +${addedScore} Points`;

    setTimeout(() => {
      this.dom.grid.classList.remove('success-glow');
      this.dom.level.classList.remove('text-bounce');
      this.level++;
      this.startRound();
    }, 1200);
  }

  /* --- Game Over Handlers --- */
  handleWrongInput(reasonText) {
    this.state = 'GAME_OVER';
    this.setBoardInteractive(false);
    this.sound.playFailSound();

    // Trigger visual shake & flash red
    this.dom.grid.classList.add('shake-wrong', 'flash-red');

    setTimeout(() => {
      this.dom.grid.classList.remove('shake-wrong', 'flash-red');
      this.showGameOverModal(reasonText);
    }, 700);
  }

  showGameOverModal(reasonText) {
    const currentBest = this.highScores[this.difficulty] || 0;
    const isNewHigh = this.score > currentBest || (this.score > 0 && this.score === currentBest);

    if (this.score > currentBest) {
      this.saveHighScore(this.difficulty, this.score);
      this.updateHighScoresDisplay();
    }

    this.dom.finalLevel.textContent = this.level;
    this.dom.finalScore.textContent = this.score;
    this.dom.finalBest.textContent = Math.max(currentBest, this.score);

    if (isNewHigh && this.score > 0) {
      this.dom.newBestBadge.classList.remove('hidden');
      this.confetti.burst(90);
    } else {
      this.dom.newBestBadge.classList.add('hidden');
    }

    this.openModal(this.dom.gameOverModal);
  }

  /* --- Pause / Resume --- */
  togglePause() {
    if (this.state === 'PAUSED') {
      this.resumeGame();
    } else if (this.state === 'USER_TURN' || this.state === 'PLAYING_SEQUENCE' || this.state === 'COUNTDOWN') {
      this.pauseGame();
    }
  }

  pauseGame() {
    this.previousState = this.state;
    this.state = 'PAUSED';
    this.clearTimer();
    this.setBoardInteractive(false);
    this.openModal(this.dom.pauseModal);
  }

  resumeGame() {
    this.closeModal(this.dom.pauseModal);
    this.state = this.previousState;

    if (this.state === 'USER_TURN') {
      this.setBoardInteractive(true);
      this.startTurnTimer();
    } else if (this.state === 'PLAYING_SEQUENCE' || this.state === 'COUNTDOWN') {
      // Re-run round safely if paused mid-sequence
      this.startRound();
    }
  }

  /* --- Keyboard Listener --- */
  handleKeyDown(e) {
    const key = e.key.toLowerCase();

    // Spacebar: Start / Pause
    if (e.code === 'Space') {
      e.preventDefault();
      if (this.state === 'IDLE') {
        this.startGame();
      } else {
        this.togglePause();
      }
      return;
    }

    // M key: Mute toggle
    if (key === 'm') {
      this.dom.soundBtn.click();
      return;
    }

    // If active player turn, map keypad / number keys to grid index
    if (this.state === 'USER_TURN') {
      const config = CONFIG.difficulties[this.difficulty];
      const keyMap = config.gridSize === 4 ? CONFIG.keyMap4x4 : CONFIG.keyMap3x3;

      if (key in keyMap) {
        e.preventDefault();
        const tileIdx = keyMap[key];
        if (tileIdx < config.totalTiles) {
          this.handleTileInput(tileIdx);
        }
      }
    }
  }

  /* --- UI Helpers --- */
  setBoardInteractive(enabled) {
    const tiles = this.dom.grid.children;
    for (let tile of tiles) {
      if (enabled) {
        tile.classList.remove('disabled');
      } else {
        tile.classList.add('disabled');
      }
    }
  }

  openModal(modalElem) {
    modalElem.classList.remove('hidden');
  }

  closeModal(modalElem) {
    modalElem.classList.add('hidden');
  }
}

/* --- Initialize Application on DOM Ready --- */
document.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new MemoryGame();
});
