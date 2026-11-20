// Neon Bay Nights — boot and the one loop. Fixed 1/60 s steps, four screens
// (title, play, paused, game over), save/continue via localStorage, and the
// ?shot=start|drive|chase|mission staging used for screenshots.
//
// ?seed=N fixes the city layout. ?shot=… stages that scene instead of running
// the loop, paints it twice and sets window.__shotReady for a screenshot.
import { DAY_LENGTH, SAVE_KEY, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld } from './world.js';
import { ACTION_CONFIRM, ACTION_ENTER, ACTION_MUTE, ACTION_PAUSE, ACTION_PUNCH, ACTION_RADIO, ACTION_WEAPON, createInput } from './input.js';
import { createAudio } from './audio.js';
import { updatePlayer } from './player.js';
import { updatePeds, updateTraffic } from './traffic.js';
import { updatePolice } from './police.js';
import { startMission, updateMissions } from './missions.js';
import { spawnPickups, updateCombat } from './combat.js';
import { drawHud } from './hud.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { applyShotSetup, autopilotKeys } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const state = world.state;
const renderer = createRenderer(canvas);
const audio = createAudio();

function readSave() {
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function writeSave() {
  try {
    window.localStorage.setItem(SAVE_KEY, JSON.stringify({
      cash: state.cash, missionIndex: state.missionIndex, missionsDone: state.missionsDone,
      health: state.health, armor: state.armor, weapon: state.weapon, ammo: state.ammo,
      x: state.player.x, y: state.player.y, time: state.time,
    }));
  } catch { /* storage off: progress lasts this visit only */ }
}

function loadSave(save) {
  state.cash = save.cash ?? 50;
  state.missionsDone = save.missionsDone ?? 0;
  state.health = save.health ?? 100;
  state.armor = save.armor ?? 0;
  state.weapon = save.weapon ?? 'fists';
  state.ammo = save.ammo ?? 0;
  state.time = save.time ?? 17.4;
  state.player.x = save.x ?? 1400;
  state.player.y = save.y ?? 1000;
  state.player.onFoot = true;
  state.player.car = null;
  state.camera.x = state.player.x;
  state.camera.y = state.player.y;
  startMission(state, save.missionIndex ?? 0);
}

function announce(message) { status.textContent = message; }

/** One fixed simulation step. `input` is the live input or a synthetic autopilot. */
function stepGame(dt, input, actions) {
  state.elapsed += dt;
  state.time = (state.time + dt * 24 / DAY_LENGTH) % 24;
  if (state.shake > 0) state.shake = Math.max(0, state.shake - 30 * dt);
  for (const msg of state.messages) msg.t += dt;
  state.messages = state.messages.filter((m) => m.t < 6);
  for (let i = state.particles.length - 1; i >= 0; i -= 1) {
    const pt = state.particles[i];
    pt.x += pt.vx * dt;
    pt.y += pt.vy * dt;
    pt.life -= dt;
    if (pt.life <= 0) state.particles.splice(i, 1);
  }
  for (let i = state.skids.length - 1; i >= 0; i -= 1) {
    state.skids[i].life -= dt;
    if (state.skids[i].life <= 0) state.skids.splice(i, 1);
  }
  const scale = canvas.width / window.innerWidth;
  const view = { camX: state.camera.x, camY: state.camera.y };
  const mouseWorld = {
    x: input.mouse.x * scale + view.camX - canvas.width / 2,
    y: input.mouse.y * scale + view.camY - canvas.height / 2,
  };
  updatePlayer(state, dt, input, actions, audio);
  updateTraffic(state, dt);
  updatePeds(state, dt);
  updatePolice(state, dt, audio);
  updateMissions(state, dt, audio);
  updateCombat(state, dt, input, actions, audio, mouseWorld);
  const speedRatio = state.player.car ? Math.abs(state.player.car.speed) / 520 : 0;
  audio.update(dt, speedRatio, state.wanted);
  if (state.health <= 0 && !state.gameOver) state.gameOver = true;
}

function runShot(name) {
  const setup = applyShotSetup(name, state, world);
  spawnPickups(state);
  const fakeInput = {
    keys: { up: false, down: false, left: false, right: false, brake: false },
    mouse: { x: 640, y: 400, down: false, clicked: false },
  };
  for (let i = 0; i < setup.seconds / STEP; i += 1) {
    if (setup.drive) fakeInput.keys = autopilotKeys(state);
    stepGame(STEP, fakeInput, 0);
  }
  // Snap the camera onto the player: the smooth camera only lerps while painting,
  // and the staged sim runs before the first paint.
  state.camera.x = state.player.x;
  state.camera.y = state.player.y;
  let painted = 0;
  function paint() {
    const view = renderer.draw(state, setup.screen, false);
    if (setup.screen === SCREEN_PLAY) drawHud(renderer.ctx, state, view.vw, view.vh);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let save = readSave();
  let accumulator = 0;
  let last = performance.now();
  spawnPickups(state);
  startMission(state, 0);

  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyC' && screen === SCREEN_TITLE && save) {
      audio.unlock();
      loadSave(save);
      screen = SCREEN_PLAY;
      announce('Continued your saved game.');
    }
  });

  function startGame() {
    audio.unlock();
    world.reset();
    spawnPickups(state);
    startMission(state, 0);
    save = null;
    screen = SCREEN_PLAY;
    announce('Playing. Steal a car and deliver it to the marina garage.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    writeSave();
    announce('Game over. Press Enter to try again.');
  }

  function handleActions() {
    const actions = input.takeActions();
    if (actions & ACTION_MUTE) {
      state.muted = audio.toggleMute();
      announce(state.muted ? 'Muted.' : 'Sound on.');
    }
    if (actions & ACTION_RADIO && screen === SCREEN_PLAY) {
      state.radio = audio.toggleRadio();
      announce(`Radio: ${state.radio}`);
    }
    if (actions & ACTION_CONFIRM && screen === SCREEN_TITLE) startGame();
    else if (actions & ACTION_CONFIRM && screen === SCREEN_OVER) startGame();
    else if (actions & ACTION_PAUSE && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      writeSave();
      announce('Paused. Progress saved.');
    } else if (actions & (ACTION_PAUSE | ACTION_CONFIRM) && screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      announce('Playing.');
    }
    return actions;
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const actions = handleActions();
    if (screen === SCREEN_TITLE) {
      while (accumulator >= STEP) {
        state.elapsed += STEP;
        state.time = (state.time + STEP * 24 / DAY_LENGTH) % 24;
        updateTraffic(state, STEP);
        updatePeds(state, STEP);
        accumulator -= STEP;
      }
    } else if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        stepGame(STEP, input, actions);
        accumulator -= STEP;
        if (state.gameOver) endGame();
      }
    } else {
      accumulator = 0;
    }
    const view = renderer.draw(state, screen, !!save);
    if (screen === SCREEN_PLAY) drawHud(renderer.ctx, state, view.vw, view.vh);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      writeSave();
      announce('Paused.');
    }
  });

  announce('Neon Bay Nights. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
