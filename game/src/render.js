// Drawing only: the city, cars, people, effects and screens. The camera follows
// the player smoothly; a day/night tint is painted over the world; skid marks,
// muzzle flash, explosions and screen shake sell the action.
import { FONT, MISSION_DEFS, PALETTE, ROAD, BLOCK, WORLD_H, WORLD_W } from './config.js';
import { isBeach, isRoad, isWater } from './world.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
  }
  resize();
  window.addEventListener('resize', resize);

  function text(value, x, y, size, color, align, weight) {
    ctx.font = `${weight || 400} ${size}px ${FONT}`;
    ctx.fillStyle = color;
    ctx.textAlign = align || 'left';
    ctx.fillText(value, x, y);
  }

  function drawCar(car) {
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    if (car.wrecked) ctx.globalAlpha = 0.75;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(-24, -12, 48, 26);
    ctx.fillStyle = car.cop ? '#16233d' : car.color;
    roundRect(-22, -11, 44, 22, 6);
    ctx.fill();
    ctx.fillStyle = car.cop ? '#fff' : 'rgba(255,255,255,0.75)';
    roundRect(-8, -9, 14, 18, 3);
    ctx.fill();
    if (car.cop) {
      ctx.fillStyle = '#e63946';
      ctx.fillRect(-14, -11, 8, 4);
      ctx.fillStyle = '#4fc3f7';
      ctx.fillRect(-4, -11, 8, 4);
      ctx.fillStyle = '#fff';
      ctx.font = `700 7px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('SBPD', 2, 4);
    }
    ctx.fillStyle = '#111';
    ctx.fillRect(-16, -12, 7, 4);
    ctx.fillRect(-16, 8, 7, 4);
    ctx.fillRect(10, -12, 7, 4);
    ctx.fillRect(10, 8, 7, 4);
    // Headlights at dusk/night.
    ctx.restore();
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawPed(ped) {
    if (ped.dead) {
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(ped.x, ped.y, 12, 6, ped.angle, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    ctx.fillStyle = 'rgba(0,0,0,0.3)';
    ctx.beginPath();
    ctx.ellipse(ped.x, ped.y + 8, 9, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = ped.color;
    ctx.beginPath();
    ctx.arc(ped.x, ped.y, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f2c9a0';
    ctx.beginPath();
    ctx.arc(ped.x, ped.y - 2, 5, 0, Math.PI * 2);
    ctx.fill();
    if (ped.mission) {
      ctx.fillStyle = '#e63946';
      ctx.font = `700 16px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText('!', ped.x, ped.y - 18);
    }
  }

  function drawWorld(state) {
    const vw = canvas.width;
    const vh = canvas.height;
    // Smooth camera, stored on the state so staged shots can snap it.
    const cam = state.camera;
    const tx = Math.max(vw / 2, Math.min(WORLD_W - vw / 2, state.player.x));
    const ty = Math.max(vh / 2, Math.min(WORLD_H - vh / 2, state.player.y));
    cam.x += (tx - cam.x) * 0.08;
    cam.y += (ty - cam.y) * 0.08;
    const shx = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    const shy = state.shake > 0 ? (Math.random() - 0.5) * state.shake : 0;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0a0e18';
    ctx.fillRect(0, 0, vw, vh);
    ctx.save();
    ctx.translate(-cam.x + vw / 2 + shx, -cam.y + vh / 2 + shy);
    const view = { x0: cam.x - vw / 2 - 60, y0: cam.y - vh / 2 - 60, x1: cam.x + vw / 2 + 60, y1: cam.y + vh / 2 + 60 };

    // Ground, beach, water.
    ctx.fillStyle = '#2c3a2e';
    ctx.fillRect(view.x0, view.y0, view.x1 - view.x0, view.y1 - view.y0);
    ctx.fillStyle = '#d9b380';
    ctx.fillRect(2880, view.y0, WORLD_W - 2880 - 40, view.y1 - view.y0);
    ctx.fillStyle = '#1e5f8a';
    ctx.fillRect(WORLD_W - 40, view.y0, 40, view.y1 - view.y0);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let y = Math.floor(view.y0 / 90) * 90; y < view.y1; y += 90) {
      ctx.fillRect(WORLD_W - 40 + Math.sin(y * 0.01 + state.elapsed) * 6, y, 10, 3);
    }
    // Marina docks.
    ctx.fillStyle = '#6b4a2f';
    ctx.fillRect(2920, 1400, 120, 16);
    ctx.fillRect(2920, 1700, 120, 16);
    ctx.fillStyle = '#e9c46a';
    ctx.fillRect(2960, 1420, 26, 10);
    ctx.fillRect(3010, 1720, 26, 10);

    // Roads.
    ctx.fillStyle = '#232a38';
    for (let i = 0; i <= 8; i += 1) {
      ctx.fillRect(i * BLOCK - ROAD / 2, view.y0, ROAD, view.y1 - view.y0);
      ctx.fillRect(view.x0, i * BLOCK - ROAD / 2, view.x1 - view.x0, ROAD);
    }
    // Sidewalks.
    ctx.fillStyle = '#3a4356';
    for (let i = 0; i <= 8; i += 1) {
      ctx.fillRect(i * BLOCK - ROAD / 2 - 14, view.y0, 14, view.y1 - view.y0);
      ctx.fillRect(i * BLOCK + ROAD / 2, view.y0, 14, view.y1 - view.y0);
      ctx.fillRect(view.x0, i * BLOCK - ROAD / 2 - 14, view.x1 - view.x0, 14);
      ctx.fillRect(view.x0, i * BLOCK + ROAD / 2, view.x1 - view.x0, 14);
    }
    // Lane dashes.
    ctx.fillStyle = '#f2c94c';
    for (let i = 0; i <= 8; i += 1) {
      for (let d = 0; d < WORLD_W; d += 64) ctx.fillRect(d, i * BLOCK - 2, 30, 4);
      for (let d = 0; d < WORLD_H; d += 64) ctx.fillRect(i * BLOCK - 2, d, 4, 30);
    }
    // Central plaza + park.
    ctx.fillStyle = '#7a6a4f';
    ctx.fillRect(1200 + 48, 800 + 48, BLOCK - ROAD - 96, BLOCK - ROAD - 96);
    ctx.fillStyle = '#2f6b4f';
    ctx.beginPath();
    ctx.arc(1400, 1000, 60, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2f5d50';
    ctx.fillRect(400 + 48, 1600 + 48, BLOCK - ROAD - 96, BLOCK - ROAD - 96);
    ctx.fillStyle = '#3f8f5f';
    ctx.beginPath();
    ctx.arc(500, 1750, 26, 0, Math.PI * 2);
    ctx.arc(680, 1700, 30, 0, Math.PI * 2);
    ctx.fill();

    // Buildings (with lit windows at night).
    const night = state.time < 6 || state.time >= 18;
    for (const b of state.buildings) {
      if (b.x > view.x1 || b.x + b.w < view.x0 || b.y > view.y1 || b.y + b.h < view.y0) continue;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(b.x + 6, b.y + 8, b.w, b.h);
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      ctx.fillRect(b.x, b.y, b.w, 6);
      ctx.fillStyle = night ? '#ffd166' : '#20293a';
      const cols = Math.max(1, Math.floor(b.w / 26));
      const rows = Math.max(1, Math.floor(b.h / 30));
      for (let r = 0; r < rows; r += 1) {
        for (let c = 0; c < cols; c += 1) {
          if (((r * 7 + c * 3 + b.height) % 5) < 3) ctx.fillRect(b.x + 8 + c * 26, b.y + 10 + r * 30, 12, 16);
        }
      }
    }

    // Skid marks.
    ctx.strokeStyle = 'rgba(10,10,10,0.5)';
    ctx.lineWidth = 4;
    for (const s of state.skids) {
      ctx.globalAlpha = Math.min(1, s.life / 2.5);
      ctx.beginPath();
      ctx.moveTo(s.x - Math.cos(s.angle) * 14, s.y - Math.sin(s.angle) * 14);
      ctx.lineTo(s.x + Math.cos(s.angle) * 14, s.y + Math.sin(s.angle) * 14);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;

    // Pickups.
    for (const pk of state.pickups) {
      if (pk.taken) continue;
      const col = pk.kind === 'health' ? '#3ddc84' : pk.kind === 'armor' ? '#4fc3f7' : pk.kind === 'ammo' ? '#f2c94c' : '#ffd166';
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(pk.x, pk.y, 14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0c101c';
      ctx.font = `700 12px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(pk.kind === 'health' ? '+' : pk.kind === 'armor' ? 'A' : pk.kind === 'ammo' ? '•' : '$', pk.x, pk.y + 4);
    }

    // Mission marker (pulsing column + ground ring).
    const m = state.mission;
    if (m.target) {
      const pulse = 1 + Math.sin(state.elapsed * 5) * 0.15;
      ctx.strokeStyle = m.target.color || '#4fc3f7';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(m.target.x, m.target.y, 52 * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = m.target.color || '#4fc3f7';
      ctx.beginPath();
      ctx.arc(m.target.x, m.target.y, 52 * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = m.target.color || '#4fc3f7';
      ctx.font = `700 14px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(m.target.label || '', m.target.x, m.target.y - 64);
      // Direction arrow at screen edge handled by HUD minimap; draw a beacon line.
      ctx.strokeStyle = m.target.color || '#4fc3f7';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(m.target.x, m.target.y - 120);
      ctx.lineTo(m.target.x, m.target.y - 40);
      ctx.stroke();
    }

    for (const car of state.cars) {
      if (car.x < view.x0 - 60 || car.x > view.x1 + 60 || car.y < view.y0 - 60 || car.y > view.y1 + 60) continue;
      drawCar(car);
    }
    for (const ped of state.peds) drawPed(ped);
    // Foot cops.
    for (const cop of state.cops) {
      if (cop.inCar) continue;
      ctx.fillStyle = '#16233d';
      ctx.beginPath();
      ctx.arc(cop.x, cop.y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2c9a0';
      ctx.beginPath();
      ctx.arc(cop.x, cop.y - 2, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#16233d';
      ctx.fillRect(cop.x - 6, cop.y - 12, 12, 4);
    }
    // Bullets.
    ctx.fillStyle = '#ffe066';
    for (const b of state.bullets) {
      ctx.beginPath();
      ctx.arc(b.x, b.y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    // Particles.
    for (const pt of state.particles) {
      ctx.globalAlpha = Math.max(0, pt.life / pt.max);
      ctx.fillStyle = pt.color;
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    // Player.
    const p = state.player;
    if (p.onFoot) {
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y + 9, 10, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0ea5e9';
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#f2c9a0';
      ctx.beginPath();
      ctx.arc(p.x, p.y - 2, 6, 0, Math.PI * 2);
      ctx.fill();
      // Aim direction.
      ctx.strokeStyle = 'rgba(255,255,255,0.7)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(p.angle) * 24, p.y + Math.sin(p.angle) * 24);
      ctx.stroke();
      if (state.weapon === 'pistol') {
        ctx.fillStyle = '#222';
        ctx.fillRect(p.x + Math.cos(p.angle) * 12 - 3, p.y + Math.sin(p.angle) * 12 - 3, 8, 5);
      }
    }
    ctx.restore();

    // Day/night tint.
    const hour = state.time % 24;
    let tint = null;
    let alpha = 0;
    if (hour >= 18 && hour < 20) { tint = '#ff7b2f'; alpha = 0.12; } // dusk
    else if (hour >= 20 || hour < 6) { tint = '#16233d'; alpha = 0.34; } // night
    else if (hour >= 6 && hour < 7.5) { tint = '#ffb347'; alpha = 0.1; } // dawn
    if (tint) {
      ctx.fillStyle = tint;
      ctx.globalAlpha = alpha;
      ctx.fillRect(0, 0, vw, vh);
      ctx.globalAlpha = 1;
    }
    // Vignette.
    const grad = ctx.createRadialGradient(vw / 2, vh / 2, Math.min(vw, vh) * 0.45, vw / 2, vh / 2, Math.max(vw, vh) * 0.75);
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, vw, vh);
    return { camX: cam.x, camY: cam.y, vw, vh };
  }

  function drawPanel(title, lines, prompt, accent) {
    const vw = canvas.width;
    const vh = canvas.height;
    ctx.fillStyle = 'rgba(5,8,16,0.72)';
    ctx.fillRect(0, 0, vw, vh);
    const w = Math.min(680, vw - 60);
    const h = 200 + lines.length * 30;
    const x = (vw - w) / 2;
    const y = (vh - h) / 2;
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = accent || '#f2c94c';
    ctx.lineWidth = 3;
    ctx.strokeRect(x, y, w, h);
    ctx.textAlign = 'center';
    text(title, vw / 2, y + 62, 44, PALETTE.text, 'center', 800);
    lines.forEach((line, i) => text(line, vw / 2, y + 108 + i * 30, 17, PALETTE.muted, 'center'));
    text(prompt, vw / 2, y + h - 34, 20, '#f2c94c', 'center', 700);
  }

  function draw(state, screen, saveExists) {
    const view = drawWorld(state);
    if (screen === SCREEN_PLAY) {
      // HUD is drawn by the caller (hud.js) — see main.js.
      return view;
    }
    if (screen === SCREEN_TITLE) {
      drawPanel('NEON BAY NIGHTS', [
        'Solmar Bay, 2026. Dario Cruz is back in town with $50, a debt to pay',
        'and a city that never sleeps. Steal cars, run jobs for Marco, dodge the',
        'Solmar Bay PD — and pull off the Marina Job before the heat finds you.',
        '',
        'WASD / arrows — walk & drive   ·   Space — brake / handbrake',
        'E — enter / exit car   ·   F — punch   ·   Mouse aim + click — shoot',
        'Q — switch weapon   ·   R — radio   ·   M — mute   ·   Esc — pause',
      ], saveExists ? 'Press Enter / click to Start — or C to Continue your save' : 'Press Enter or click to Start', '#f2c94c');
      return view;
    }
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', [
        'The city waits. Your progress is saved when you quit to the title screen.',
        '',
        'Missions done: ' + state.missionsDone + ' / 5      Cash: $' + state.cash,
      ], 'Press P / Esc to resume', '#4fc3f7');
      return view;
    }
    if (screen === SCREEN_OVER) {
      drawPanel(state.health <= 0 ? 'BUSTED / WASTED' : 'GAME OVER', [
        'Dario went down in Solmar Bay. The city keeps its neon on without you.',
        '',
        `Missions done: ${state.missionsDone} / 5      Cash: $${state.cash}`,
      ], 'Press Enter or click to try again', '#e5534b');
      return view;
    }
    return view;
  }

  return { draw, drawWorld, resize, canvas, ctx };
}
