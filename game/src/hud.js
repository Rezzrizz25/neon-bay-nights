// HUD: health, armor, cash, wanted stars, weapon/ammo, mission tracker, clock
// and day/night indicator, plus a live minimap (player, cars, cops, mission
// marker, north arrow). Drawn in screen space over the world.
import { FONT, MISSION_DEFS, PALETTE, WORLD_H, WORLD_W } from './config.js';
import { isBeach, isWater } from './world.js';

export function drawHud(ctx, state, vw, vh) {
  ctx.textBaseline = 'alphabetic';
  const pad = 16;
  // Top-left: health / armor bars.
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(pad, pad, 240, 86);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('DARIO CRUZ', pad + 12, pad + 22);
  bar(ctx, pad + 12, pad + 30, 216, 12, state.health / 100, '#e5534b', 'HP');
  bar(ctx, pad + 12, pad + 48, 216, 12, state.armor / 100, '#4fc3f7', 'ARMOR');
  ctx.fillStyle = '#3ddc84';
  ctx.font = `700 18px ${FONT}`;
  ctx.fillText(`$${state.cash}`, pad + 12, pad + 80);

  // Top-centre: wanted stars.
  ctx.textAlign = 'center';
  ctx.font = `700 26px ${FONT}`;
  for (let i = 0; i < 5; i += 1) {
    ctx.fillStyle = i < state.wanted ? '#ffd166' : 'rgba(255,255,255,0.25)';
    ctx.fillText('★', vw / 2 - 60 + i * 30, 46);
  }
  if (state.wanted > 0) {
    ctx.fillStyle = '#ff6b6b';
    ctx.font = `700 13px ${FONT}`;
    ctx.fillText('WANTED', vw / 2, 66);
  }

  // Top-right: clock + day/night + weapon.
  const hour = Math.floor(state.time) % 24;
  const min = Math.floor((state.time % 1) * 60);
  const clock = `${String(hour).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
  const dayPart = hour >= 6 && hour < 18 ? 'DAY' : hour >= 18 && hour < 20 ? 'DUSK' : 'NIGHT';
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(vw - 256, pad, 240, 86);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `700 20px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(clock, vw - pad - 12, pad + 30);
  ctx.font = `600 14px ${FONT}`;
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(dayPart, vw - pad - 12, pad + 52);
  const weapon = state.weapon === 'pistol' ? `Pistol  ${state.ammo} ammo` : 'Fists  (Q to switch)';
  ctx.fillStyle = '#f2c94c';
  ctx.fillText(weapon, vw - pad - 12, pad + 76);

  // Mission tracker (left, under health).
  const def = MISSION_DEFS[state.missionIndex];
  ctx.textAlign = 'left';
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(pad, 116, 300, 92);
  ctx.fillStyle = '#f2c94c';
  ctx.font = `700 15px ${FONT}`;
  ctx.fillText(def ? `MISSION ${state.missionIndex + 1}/5: ${def.title}` : 'ALL MISSIONS DONE', pad + 12, 140);
  ctx.fillStyle = PALETTE.text;
  ctx.font = `400 13px ${FONT}`;
  wrapText(ctx, def ? def.hint : 'Free roam Solmar Bay.', pad + 12, 160, 276, 17);
  if (state.missionIndex === 1 && state.mission.timer > 0) {
    ctx.fillStyle = state.mission.timer < 20 ? '#ff6b6b' : '#f2c94c';
    ctx.font = `700 15px ${FONT}`;
    ctx.fillText(`Time left: ${Math.ceil(state.mission.timer)}s`, pad + 12, 196);
  }
  if (state.missionIndex === 3 && state.wanted > 0) {
    ctx.fillStyle = '#ff6b6b';
    ctx.font = `700 15px ${FONT}`;
    ctx.fillText('Hide until the stars fade!', pad + 12, 196);
  }

  // Radio / mute line, bottom-left.
  ctx.fillStyle = PALETTE.panel;
  ctx.fillRect(pad, vh - 44, 300, 28);
  ctx.fillStyle = PALETTE.muted;
  ctx.font = `600 13px ${FONT}`;
  ctx.fillText(`RADIO ${state.radio}  (R radio · M ${state.muted ? 'unmute' : 'mute'})`, pad + 10, vh - 25);

  // Messages (toast log), bottom-centre.
  ctx.textAlign = 'center';
  let y = vh - 70;
  for (let i = state.messages.length - 1; i >= 0; i -= 1) {
    const msg = state.messages[i];
    ctx.globalAlpha = Math.max(0, 1 - msg.t / 6);
    ctx.fillStyle = PALETTE.panel;
    const w = ctx.measureText(msg.text).width + 24;
    ctx.fillRect(vw / 2 - w / 2, y - 18, w, 24);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `600 13px ${FONT}`;
    ctx.fillText(msg.text, vw / 2, y);
    ctx.globalAlpha = 1;
    y -= 28;
  }

  drawMinimap(ctx, state, vw, vh);
}

function bar(ctx, x, y, w, h, frac, color, label) {
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
  ctx.fillStyle = '#0c101c';
  ctx.font = `700 9px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText(label, x + 4, y + h - 3);
}

function wrapText(ctx, text, x, y, maxW, lineH) {
  const words = text.split(' ');
  let line = '';
  let yy = y;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line, x, yy);
      line = word;
      yy += lineH;
    } else line = test;
  }
  ctx.fillText(line, x, yy);
}

function drawMinimap(ctx, state, vw, vh) {
  const mw = 200;
  const mh = 150;
  const mx = vw - mw - 16;
  const my = vh - mh - 16;
  const sx = mw / WORLD_W;
  const sy = mh / WORLD_H;
  ctx.fillStyle = 'rgba(10,14,24,0.85)';
  ctx.fillRect(mx - 4, my - 4, mw + 8, mh + 8);
  ctx.fillStyle = '#1d2b45';
  ctx.fillRect(mx, my, mw, mh);
  // Beach strip.
  ctx.fillStyle = '#d9b380';
  ctx.fillRect(mx + 2880 * sx, my, (WORLD_W - 2880) * sx, mh);
  ctx.fillStyle = '#2a6f9e';
  ctx.fillRect(mx + (WORLD_W - 40) * sx, my, 40 * sx, mh);
  // Roads.
  ctx.fillStyle = '#3a4356';
  for (let i = 0; i <= 8; i += 1) {
    ctx.fillRect(mx + i * 400 * sx - 2, my, 4, mh);
    ctx.fillRect(mx, my + i * 400 * sy - 2, mw, 4);
  }
  // Buildings.
  ctx.fillStyle = '#5b6b8c';
  for (const b of state.buildings) ctx.fillRect(mx + b.x * sx, my + b.y * sy, Math.max(2, b.w * sx), Math.max(2, b.h * sy));
  // Mission marker.
  const m = state.mission;
  if (m.target) {
    const pulse = 3 + Math.sin(state.elapsed * 5) * 1.5;
    ctx.fillStyle = m.target.color || '#4fc3f7';
    ctx.beginPath();
    ctx.arc(mx + m.target.x * sx, my + m.target.y * sy, pulse + 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Cars, cops, peds.
  ctx.fillStyle = '#e9c46a';
  for (const car of state.cars) {
    if (car.wrecked) continue;
    ctx.fillRect(mx + car.x * sx - 1.5, my + car.y * sy - 1.5, 3, 3);
  }
  ctx.fillStyle = '#ff4d4d';
  for (const cop of state.cops) {
    ctx.beginPath();
    ctx.arc(mx + cop.x * sx, my + cop.y * sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  // Player arrow.
  const px = mx + state.player.x * sx;
  const py = my + state.player.y * sy;
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(state.player.angle);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(7, 0); ctx.lineTo(-5, -5); ctx.lineTo(-5, 5); ctx.closePath();
  ctx.fill();
  ctx.restore();
  // North arrow.
  ctx.fillStyle = '#fff';
  ctx.font = `700 12px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.fillText('N ↑', mx + 4, my + 14);
}
