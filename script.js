/**
 * ============================================================================
 * SMART MEMORY GAME - VANILLA JAVASCRIPT ENGINE
 * ============================================================================
 * Features:
 * - Web Audio API Synthesizer (custom pitch generation for each tile)
 * - Canvas Particle Confetti FX Engine
 * - Dynamic Grid (3x3 for Levels 1-5, 4x4 Advanced Mode for Level 6+)
 * - State Machine: Idle, Countdown, Sequence Playback, User Turn, Pause, Game Over
 * - 3 Lives System with Level Retry & Hearts Display
 * - Hint System (3 per game with pattern replay)
 * - Accelerating Level Countdown Timer
 * - 5 Random Board Themes (Neon, Ocean, Sunset, Forest, Dark)
 * - Real-time Click Accuracy Calculation (%)
 * - Milestone Achievements System (Levels 5, 10, 15, 20) with Popups
 * - Lifetime Statistics Storage (Games Played, Best Score, Avg Score, Best Accuracy, Wins/Losses)
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

      gain.gain.setValueAtTime(0, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.25, this.ctx.currentTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + duration);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch (err) {}
  }

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
      p.vy += 0.25;
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

/* --- Main Smart Memory Game Engine --- */
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
      lives: document.getElementById('lives-display'),
      accuracy: document.getElementById('accuracy-display'),
      statusText: document.getElementById('status-text'),
      timerBar: document.getElementById('timer-bar'),
      startBtn: document.getElementById('start-btn'),
      restartBtn: document.getElementById('restart-btn'),
      hintBtn: document.getElementById('hint-btn'),
      hintCount: document.getElementById('hint-count'),
      pauseBtn: document.getElementById('pause-btn'),
      soundBtn: document.getElementById('sound-btn'),
      soundIconOn: document.getElementById('sound-icon-on'),
      soundIconOff: document.getElementById('sound-icon-off'),
      helpBtn: document.getElementById('help-btn'),
      statsBtn: document.getElementById('stats-btn'),
      difficultySelect: document.getElementById('difficulty-select'),
      countdownOverlay: document.getElementById('countdown-overlay'),
      countdownText: document.getElementById('countdown-text'),
      unlockOverlay: document.getElementById('unlock-overlay'),
      keyLegendTiles: document.getElementById('key-legend-tiles'),
      themeBadge: document.getElementById('theme-badge'),
      themeName: document.getElementById('theme-name'),
      achievementToast: document.getElementById('achievement-toast'),
      achievementIcon: document.getElementById('achievement-icon'),
      achievementTitle: document.getElementById('achievement-title'),
      
      // Modals
      gameOverModal: document.getElementById('game-over-modal'),
      pauseModal: document.getElementById('pause-modal'),
      helpModal: document.getElementById('help-modal'),
      statsModal: document.getElementById('stats-modal'),
      
      // Modal stats & actions
      finalLevel: document.getElementById('final-level'),
      finalScore: document.getElementById('final-score'),
      finalAccuracy: document.getElementById('final-accuracy'),
      finalBest: document.getElementById('final-best'),
      newBestBadge: document.getElementById('new-best-badge'),
      gameOverReason: document.getElementById('game-over-reason'),
      modalRestartBtn: document.getElementById('modal-restart-btn'),
      resumeBtn: document.getElementById('resume-btn'),
      pauseRestartBtn: document.getElementById('pause-restart-btn'),
      closeHelpBtn: document.getElementById('close-help-btn'),
      closeStatsBtn: document.getElementById('close-stats-btn'),

      // Lifetime Statistics Elements
      statGames: document.getElementById('stat-games'),
      statHighLevel: document.getElementById('stat-high-level'),
      statAvgScore: document.getElementById('stat-avg-score'),
      statBestAcc: document.getElementById('stat-best-acc'),
      statWins: document.getElementById('stat-wins'),
      statLosses: document.getElementById('stat-losses')
    };

    // State Variables
    this.state = 'IDLE'; // 'IDLE', 'COUNTDOWN', 'PLAYING_SEQUENCE', 'USER_TURN', 'PAUSED', 'GAME_OVER'
    this.difficulty = 'medium';
    this.isAdvancedMode = false;
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.hintsRemaining = 3;
    this.totalClicks = 0;
    this.correctClicks = 0;
    this.sequence = [];
    this.userStep = 0;
    
    // Timer Variables
    this.timerInterval = null;
    this.turnDuration = 0;
    this.timeRemaining = 0;

    // Theme Config
    this.themes = ['neon', 'ocean', 'sunset', 'forest', 'dark'];
    this.themeNames = {
      neon: 'Neon Theme',
      ocean: 'Ocean Theme',
      sunset: 'Sunset Theme',
      forest: 'Forest Theme',
      dark: 'Dark Theme'
    };

    // Achievements Config
    this.achievementsConfig = {
      5: { id: 'ach-badge-5', title: 'Memory Beginner', desc: 'Reached Level 5!', icon: '🏅' },
      10: { id: 'ach-badge-10', title: 'Memory Master', desc: 'Reached Level 10!', icon: '🏆' },
      15: { id: 'ach-badge-15', title: 'Memory Expert', desc: 'Reached Level 15!', icon: '👑' },
      20: { id: 'ach-badge-20', title: 'Memory Legend', desc: 'Reached Level 20!', icon: '🌌' }
    };

    // Persistent Storage (localStorage)
    this.highScores = this.loadHighScores();
    this.stats = this.loadStats();
    this.unlockedAchievements = this.loadAchievements();

    this.init();
  }

  /* --- Initialization --- */
  init() {
    this.bindEvents();
    this.selectRandomTheme();
    this.updateDifficulty();
    this.updateHighScoresDisplay();
    this.renderLives();
    this.renderHints();
    this.updateAccuracyDisplay();
  }

  /* --- Theme System --- */
  selectRandomTheme() {
    const randomIdx = Math.floor(Math.random() * this.themes.length);
    const theme = this.themes[randomIdx];
    document.body.dataset.theme = theme;
    if (this.dom.themeName) {
      this.dom.themeName.textContent = this.themeNames[theme] || 'Neon Theme';
    }
  }

  /* --- Storage Helpers --- */
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

  loadStats() {
    try {
      const saved = localStorage.getItem('smart_memory_stats');
      return saved ? JSON.parse(saved) : {
        gamesPlayed: 0,
        highestLevel: 1,
        totalScore: 0,
        bestScore: 0,
        totalClicks: 0,
        totalCorrectClicks: 0,
        totalWins: 0,
        totalLosses: 0
      };
    } catch (e) {
      return { gamesPlayed: 0, highestLevel: 1, totalScore: 0, bestScore: 0, totalClicks: 0, totalCorrectClicks: 0, totalWins: 0, totalLosses: 0 };
    }
  }

  recordGameStats(isWin = false) {
    this.stats.gamesPlayed++;
    this.stats.totalScore += this.score;
    this.stats.highestLevel = Math.max(this.stats.highestLevel, this.level);
    this.stats.bestScore = Math.max(this.stats.bestScore, this.score);
    this.stats.totalClicks += this.totalClicks;
    this.stats.totalCorrectClicks += this.correctClicks;
    if (isWin || this.level >= 5) {
      this.stats.totalWins++;
    } else {
      this.stats.totalLosses++;
    }

    try {
      localStorage.setItem('smart_memory_stats', JSON.stringify(this.stats));
    } catch (e) {}

    this.renderStatsModal();
  }

  loadAchievements() {
    try {
      const saved = localStorage.getItem('smart_memory_achievements');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  }

  checkAchievements(level) {
    const ach = this.achievementsConfig[level];
    if (ach && !this.unlockedAchievements.includes(level)) {
      this.unlockedAchievements.push(level);
      try {
        localStorage.setItem('smart_memory_achievements', JSON.stringify(this.unlockedAchievements));
      } catch (e) {}

      this.showAchievementToast(ach);
      this.updateAchievementsModalDisplay();
    }
  }

  showAchievementToast(ach) {
    if (!this.dom.achievementToast) return;
    if (this.dom.achievementIcon) this.dom.achievementIcon.textContent = ach.icon;
    if (this.dom.achievementTitle) this.dom.achievementTitle.textContent = ach.title;

    this.dom.achievementToast.classList.remove('hidden');
    this.sound.playSuccessFanfare();
    this.confetti.burst(65);

    setTimeout(() => {
      this.dom.achievementToast.classList.add('hidden');
    }, 3200);
  }

  updateAchievementsModalDisplay() {
    Object.keys(this.achievementsConfig).forEach(lvlStr => {
      const lvl = parseInt(lvlStr, 10);
      const elem = document.getElementById(`ach-badge-${lvl}`);
      if (elem) {
        if (this.unlockedAchievements.includes(lvl)) {
          elem.classList.remove('locked');
          elem.classList.add('unlocked');
        } else {
          elem.classList.remove('unlocked');
          elem.classList.add('locked');
        }
      }
    });
  }

  renderStatsModal() {
    if (this.dom.statGames) this.dom.statGames.textContent = this.stats.gamesPlayed;
    if (this.dom.statHighLevel) this.dom.statHighLevel.textContent = this.stats.highestLevel;
    if (this.dom.statAvgScore) {
      const avg = this.stats.gamesPlayed === 0 ? 0 : Math.round(this.stats.totalScore / this.stats.gamesPlayed);
      this.dom.statAvgScore.textContent = avg;
    }
    if (this.dom.statBestAcc) {
      const bestAcc = this.stats.totalClicks === 0 ? 100 : Math.round((this.stats.totalCorrectClicks / this.stats.totalClicks) * 100);
      this.dom.statBestAcc.textContent = `${bestAcc}%`;
    }
    if (this.dom.statWins) this.dom.statWins.textContent = this.stats.totalWins;
    if (this.dom.statLosses) this.dom.statLosses.textContent = this.stats.totalLosses;

    this.updateAchievementsModalDisplay();
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

    this.dom.hintBtn.addEventListener('click', () => {
      this.sound.playClickSound();
      this.useHint();
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

    this.dom.statsBtn.addEventListener('click', () => {
      this.sound.playClickSound();
      this.renderStatsModal();
      this.openModal(this.dom.statsModal);
    });

    this.dom.closeStatsBtn.addEventListener('click', () => {
      this.sound.playClickSound();
      this.closeModal(this.dom.statsModal);
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
    const gridSize = this.isAdvancedMode ? 4 : config.gridSize;
    this.updateGridBoard(gridSize);
    this.updateHighScoresDisplay();
  }

  updateGridBoard(gridSize, animateNew = false) {
    const totalTiles = gridSize === 4 ? 16 : 9;
    this.dom.grid.innerHTML = '';
    
    if (gridSize === 4) {
      this.dom.grid.className = 'tile-grid grid-4x4';
    } else {
      this.dom.grid.className = 'tile-grid grid-3x3';
    }

    const keyLabels = gridSize === 4 
      ? ['1','2','3','4','5','6','7','8','9','0','Q','W','E','R','T','Y']
      : ['7','8','9','4','5','6','1','2','3'];

    for (let i = 0; i < totalTiles; i++) {
      const tile = document.createElement('div');
      tile.className = `tile tile-${i + 1} disabled`;
      if (animateNew && i >= 9) {
        tile.classList.add('tile-pop-in');
        tile.style.animationDelay = `${(i - 9) * 0.08}s`;
      }
      tile.dataset.index = i;
      tile.dataset.key = keyLabels[i] || (i + 1);
      
      tile.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.handleTileInput(i);
      });

      this.dom.grid.appendChild(tile);
    }

    if (this.dom.keyLegendTiles) {
      this.dom.keyLegendTiles.innerHTML = gridSize === 4 
        ? '<kbd>1-9, 0, Q-Y</kbd> Grid Tiles' 
        : '<kbd>1-9</kbd> Grid Tiles';
    }
  }

  updateHighScoresDisplay() {
    const best = this.highScores[this.difficulty] || 0;
    this.dom.best.textContent = best;
  }

  renderLives() {
    if (this.dom.lives) {
      const hearts = '❤️'.repeat(Math.max(0, this.lives)) + '🖤'.repeat(Math.max(0, 3 - this.lives));
      this.dom.lives.textContent = hearts;
    }
  }

  renderHints() {
    if (this.dom.hintCount) {
      this.dom.hintCount.textContent = this.hintsRemaining;
    }
    if (this.dom.hintBtn) {
      this.dom.hintBtn.disabled = this.hintsRemaining <= 0 || this.state !== 'USER_TURN';
    }
  }

  updateAccuracyDisplay() {
    const percent = this.totalClicks === 0 ? 100 : Math.round((this.correctClicks / this.totalClicks) * 100);
    if (this.dom.accuracy) {
      this.dom.accuracy.textContent = `${percent}%`;
    }
  }

  /* --- Game Flow & State Handlers --- */
  resetToIdle() {
    this.state = 'IDLE';
    this.isAdvancedMode = false;
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.hintsRemaining = 3;
    this.totalClicks = 0;
    this.correctClicks = 0;
    this.sequence = [];
    this.userStep = 0;
    this.clearTimer();

    this.selectRandomTheme();
    this.dom.level.textContent = '1';
    this.dom.score.textContent = '0';
    this.renderLives();
    this.renderHints();
    this.updateAccuracyDisplay();

    this.dom.statusText.textContent = 'Press "Start Game" to begin';
    this.dom.timerBar.style.width = '0%';
    
    this.dom.startBtn.classList.remove('hidden');
    this.dom.restartBtn.classList.add('hidden');
    this.dom.pauseBtn.disabled = true;
    this.dom.difficultySelect.disabled = false;

    this.updateGridBoard(3);
    this.setBoardInteractive(false);
  }

  startGame() {
    this.sound.init();
    this.selectRandomTheme();
    this.isAdvancedMode = false;
    this.level = 1;
    this.score = 0;
    this.lives = 3;
    this.hintsRemaining = 3;
    this.totalClicks = 0;
    this.correctClicks = 0;
    this.sequence = [];
    
    this.dom.level.textContent = '1';
    this.dom.score.textContent = '0';
    this.renderLives();
    this.renderHints();
    this.updateAccuracyDisplay();

    this.dom.startBtn.classList.add('hidden');
    this.dom.restartBtn.classList.remove('hidden');
    this.dom.pauseBtn.disabled = false;
    this.dom.difficultySelect.disabled = true;

    this.updateGridBoard(3);
    this.startRound();
  }

  startRound() {
    this.userStep = 0;
    this.clearTimer();
    this.dom.timerBar.style.width = '0%';
    this.dom.level.textContent = this.level;

    const totalTiles = this.isAdvancedMode ? 16 : CONFIG.difficulties[this.difficulty].totalTiles;
    const nextRandomTile = Math.floor(Math.random() * totalTiles);
    this.sequence.push(nextRandomTile);

    this.runCountdown(() => {
      this.playSequence();
    });
  }

  /* --- 3-2-1 Countdown --- */
  runCountdown(onComplete) {
    this.state = 'COUNTDOWN';
    this.setBoardInteractive(false);
    this.renderHints();
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
    this.renderHints();

    const config = CONFIG.difficulties[this.difficulty];
    const speed = Math.max(
      config.minSpeed, 
      config.baseSpeed - ((this.level - 1) * config.speedStep)
    );
    const gap = Math.max(100, Math.floor(speed * 0.35));

    let step = 0;
    const playStep = () => {
      if (this.state !== 'PLAYING_SEQUENCE') return;

      if (step < this.sequence.length) {
        const tileIdx = this.sequence[step];
        this.flashTile(tileIdx, speed, () => {
          step++;
          setTimeout(playStep, gap);
        });
      } else {
        setTimeout(() => {
          this.startUserTurn(true);
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
  startUserTurn(resetStep = true) {
    this.state = 'USER_TURN';
    if (resetStep) {
      this.userStep = 0;
    }
    this.dom.statusText.textContent = 'Your turn! Repeat the pattern.';
    this.setBoardInteractive(true);
    this.renderHints();

    // Accelerating Turn Timer
    const config = CONFIG.difficulties[this.difficulty];
    const timeMultiplier = Math.max(900, config.timeMultiplier - ((this.level - 1) * 60));
    this.maxTurnTime = this.sequence.length * timeMultiplier;
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

  /* --- Hint System --- */
  useHint() {
    if (this.hintsRemaining <= 0 || this.state !== 'USER_TURN') return;
    this.hintsRemaining--;
    this.renderHints();
    this.clearTimer();

    this.state = 'PLAYING_SEQUENCE';
    this.dom.statusText.textContent = '💡 Hint Replay: Watch pattern again!';
    this.setBoardInteractive(false);

    const config = CONFIG.difficulties[this.difficulty];
    const speed = Math.max(config.minSpeed, config.baseSpeed - ((this.level - 1) * config.speedStep));
    const gap = Math.max(100, Math.floor(speed * 0.35));

    let step = 0;
    const replayStep = () => {
      if (step < this.sequence.length) {
        const tileIdx = this.sequence[step];
        this.flashTile(tileIdx, speed, () => {
          step++;
          setTimeout(replayStep, gap);
        });
      } else {
        setTimeout(() => {
          this.startUserTurn(false);
        }, 300);
      }
    };

    setTimeout(replayStep, 300);
  }

  /* --- Tile Input Handler --- */
  handleTileInput(tileIndex) {
    if (this.state !== 'USER_TURN') return;

    this.totalClicks++;
    const expectedTile = this.sequence[this.userStep];

    this.flashTile(tileIndex, 200);

    if (tileIndex === expectedTile) {
      // CORRECT TILE
      this.correctClicks++;
      this.updateAccuracyDisplay();
      this.userStep++;

      if (this.userStep === this.sequence.length) {
        this.clearTimer();
        this.handleRoundSuccess();
      }
    } else {
      // INCORRECT TILE
      this.updateAccuracyDisplay();
      this.clearTimer();
      this.handleWrongInput('Wrong sequence step!');
    }
  }

  /* --- Round Victory --- */
  handleRoundSuccess() {
    this.state = 'IDLE';
    this.setBoardInteractive(false);
    this.renderHints();
    
    // Calculate Points
    const timeBonus = Math.floor((this.timeRemaining / this.maxTurnTime) * 20);
    const addedScore = (this.level * 10) + timeBonus;
    this.score += addedScore;
    
    this.dom.score.textContent = this.score;

    // Check Achievements
    this.checkAchievements(this.level);

    // High Score
    const currentBest = this.highScores[this.difficulty] || 0;
    if (this.score > currentBest) {
      this.saveHighScore(this.difficulty, this.score);
      this.updateHighScoresDisplay();
    }

    this.sound.playSuccessFanfare();
    this.dom.grid.classList.add('success-glow');
    this.dom.level.classList.add('text-bounce');

    if (this.level % 3 === 0 || this.score > currentBest) {
      this.confetti.burst(75);
    }

    this.dom.statusText.textContent = `Excellent! +${addedScore} Points`;

    setTimeout(() => {
      this.dom.grid.classList.remove('success-glow');
      this.dom.level.classList.remove('text-bounce');
      this.level++;

      // Auto Advanced Mode at Level 6
      if (this.level === 6 && !this.isAdvancedMode) {
        this.unlockAdvancedMode(() => {
          this.startRound();
        });
      } else {
        this.startRound();
      }
    }, 1200);
  }

  /* --- Advanced Mode Unlock FX --- */
  unlockAdvancedMode(onComplete) {
    this.isAdvancedMode = true;
    this.state = 'IDLE';
    this.sound.playSuccessFanfare();
    this.confetti.burst(120);

    const boardContainer = this.dom.grid.parentElement;
    if (boardContainer) {
      boardContainer.classList.add('expansion-glow');
      setTimeout(() => boardContainer.classList.remove('expansion-glow'), 1000);
    }

    this.updateGridBoard(4, true);

    if (this.dom.unlockOverlay) {
      this.dom.unlockOverlay.classList.remove('hidden');
    }
    this.dom.statusText.textContent = '🎉 Advanced Mode Unlocked! 4×4 Board Activated.';

    setTimeout(() => {
      if (this.dom.unlockOverlay) {
        this.dom.unlockOverlay.classList.add('hidden');
      }
      onComplete();
    }, 2800);
  }

  /* --- Failure & Life Deduction --- */
  handleWrongInput(reasonText) {
    this.clearTimer();
    this.sound.playFailSound();
    this.lives--;
    this.renderLives();

    this.dom.grid.classList.add('shake-wrong', 'flash-red');

    setTimeout(() => {
      this.dom.grid.classList.remove('shake-wrong', 'flash-red');

      if (this.lives > 0) {
        // Retry Level with remaining lives
        this.dom.statusText.textContent = `⚠️ ${reasonText} (-1 Life! ${this.lives} left)`;
        setTimeout(() => {
          this.userStep = 0;
          this.startUserTurn(true);
        }, 1200);
      } else {
        // Game Over - 0 Lives left
        this.state = 'GAME_OVER';
        this.setBoardInteractive(false);
        this.renderHints();
        this.recordGameStats(false);
        this.showGameOverModal(reasonText);
      }
    }, 700);
  }

  showGameOverModal(reasonText) {
    const currentBest = this.highScores[this.difficulty] || 0;
    const isNewHigh = this.score > currentBest || (this.score > 0 && this.score === currentBest);

    if (this.score > currentBest) {
      this.saveHighScore(this.difficulty, this.score);
      this.updateHighScoresDisplay();
    }

    if (this.dom.gameOverReason) {
      this.dom.gameOverReason.textContent = `${reasonText} All 3 lives lost!`;
    }
    this.dom.finalLevel.textContent = this.level;
    this.dom.finalScore.textContent = this.score;
    if (this.dom.finalAccuracy) {
      const finalAcc = this.totalClicks === 0 ? 100 : Math.round((this.correctClicks / this.totalClicks) * 100);
      this.dom.finalAccuracy.textContent = `${finalAcc}%`;
    }
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
    this.renderHints();
    this.openModal(this.dom.pauseModal);
  }

  resumeGame() {
    this.closeModal(this.dom.pauseModal);
    this.state = this.previousState;

    if (this.state === 'USER_TURN') {
      this.setBoardInteractive(true);
      this.renderHints();
      this.startTurnTimer();
    } else if (this.state === 'PLAYING_SEQUENCE' || this.state === 'COUNTDOWN') {
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

    // H key: Hint
    if (key === 'h') {
      if (this.state === 'USER_TURN' && this.hintsRemaining > 0) {
        this.useHint();
      }
      return;
    }

    // M key: Mute toggle
    if (key === 'm') {
      this.dom.soundBtn.click();
      return;
    }

    // Active player turn tile mapping
    if (this.state === 'USER_TURN') {
      const is4x4 = this.isAdvancedMode || (CONFIG.difficulties[this.difficulty].gridSize === 4);
      const keyMap = is4x4 ? CONFIG.keyMap4x4 : CONFIG.keyMap3x3;
      const totalTiles = is4x4 ? 16 : 9;

      if (key in keyMap) {
        e.preventDefault();
        const tileIdx = keyMap[key];
        if (tileIdx < totalTiles) {
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
    if (modalElem) modalElem.classList.remove('hidden');
  }

  closeModal(modalElem) {
    if (modalElem) modalElem.classList.add('hidden');
  }
}

/* --- Initialize Application on DOM Ready --- */
document.addEventListener('DOMContentLoaded', () => {
  window.gameApp = new MemoryGame();
});
