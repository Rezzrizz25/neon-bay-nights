// Wanted level (1–5 stars) and the Solmar Bay PD: patrol cars that chase and
// ram, foot cops that chase and arrest, and heat that decays when the player
// breaks line of sight and hides.
import { addMessage, addParticles } from './world.js';

const COP_COLOR = '#1b2a4a';

function lineOfSight(state, x, y) {
  // Simple sight check: distance plus no building between cop and player.
  const px = state.player.x;
  const py = state.player.y;
  const d = Math.hypot(px - x, py - y);
  if (d > 520) return false;
  for (const b of state.buildings) {
    // Segment-rect test via sampling.
    let blocked = false;
    for (let t = 0; t <= 1; t += 0.1) {
      const sx = x + (px - x) * t;
      const sy = y + (py - y) * t;
      if (sx > b.x && sx < b.x + b.w && sy > b.y && sy < b.y + b.h) { blocked = true; break; }
    }
    if (blocked) return false;
  }
  return true;
}

export function updatePolice(state, dt, audio) {
  const p = state.player;
  // Wanted decays only while nobody can see the player.
  const seen = state.cops.some((c) => lineOfSight(state, c.x, c.y));
  if (state.wanted > 0) {
    if (seen) state.heat = Math.min(100, state.heat + 12 * dt);
    else state.heat -= (state.wanted >= 3 ? 4 : 9) * dt;
    if (state.heat <= 0) {
      state.wanted = Math.max(0, state.wanted - 1);
      state.heat = state.wanted > 0 ? 55 : 0;
      if (state.wanted === 0) addMessage(state, 'You lost the cops. Heat is off.');
      else addMessage(state, `Wanted down to ${state.wanted} star${state.wanted > 1 ? 's' : ''}. Keep hiding.`);
    }
  }
  // Spawn cops to match the wanted level.
  const wantCars = state.wanted >= 2 ? Math.min(4, state.wanted) : 0;
  const wantFoot = state.wanted >= 1 ? Math.min(3, state.wanted + 1) : 0;
  const cars = state.cops.filter((c) => c.inCar).length;
  const foot = state.cops.length - cars;
  if (cars < wantCars) {
    const angle = Math.random() * Math.PI * 2;
    const car = {
      x: p.x + Math.cos(angle) * 480, y: p.y + Math.sin(angle) * 480,
      angle: 0, speed: 0, color: COP_COLOR, parked: false, ai: false, cop: true, wrecked: false, hp: 120,
    };
    car.x = Math.max(60, Math.min(3140, car.x));
    car.y = Math.max(60, Math.min(2340, car.y));
    state.cars.push(car);
    state.cops.push({ x: car.x, y: car.y, angle: 0, speed: 0, inCar: true, car, arrestCd: 0 });
  }
  if (foot < wantFoot) {
    const angle = Math.random() * Math.PI * 2;
    state.cops.push({
      x: p.x + Math.cos(angle) * 320, y: p.y + Math.sin(angle) * 320,
      angle: 0, speed: 0, inCar: false, car: null, arrestCd: 0,
    });
  }
  // Despawn cops when the heat is fully off.
  if (state.wanted === 0 && state.cops.length > 0) {
    for (const c of state.cops) {
      if (c.inCar && c.car) { const i = state.cars.indexOf(c.car); if (i >= 0) state.cars.splice(i, 1); }
    }
    state.cops = [];
  }
  // Chase behaviour.
  for (const cop of state.cops) {
    const dx = p.x - cop.x;
    const dy = p.y - cop.y;
    const d = Math.hypot(dx, dy) || 1;
    const targetAngle = Math.atan2(dy, dx);
    if (cop.inCar && cop.car && !cop.car.wrecked) {
      const car = cop.car;
      const diff = ((targetAngle - car.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      car.angle += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
      const targetSpeed = state.wanted >= 4 ? 560 : 480;
      car.speed += Math.max(-500 * dt, Math.min(500 * dt, targetSpeed - car.speed));
      car.x += Math.cos(car.angle) * car.speed * dt;
      car.y += Math.sin(car.angle) * car.speed * dt;
      cop.x = car.x; cop.y = car.y; cop.angle = car.angle;
      if (d < 52 && p.car) {
        // Ram: shove the player's car and damage it.
        p.car.speed *= 0.85;
        state.shake = Math.max(state.shake, 5);
        audio.sfx('crash');
        if (p.car.hp !== undefined) p.car.hp -= 4;
        if (p.car.hp <= 0) { p.car.wrecked = true; }
      }
      if (d < 40 && p.onFoot) arrestAttempt(state, cop, dt);
    } else if (!cop.inCar) {
      const diff = ((targetAngle - cop.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      cop.angle += Math.max(-4 * dt, Math.min(4 * dt, diff));
      const spd = p.onFoot ? 175 : 150;
      cop.x += Math.cos(cop.angle) * spd * dt;
      cop.y += Math.sin(cop.angle) * spd * dt;
      if (d < 34 && p.onFoot) arrestAttempt(state, cop, dt);
      if (d < 34 && !p.onFoot) {
        // Foot cop vs car: knocked aside.
        addParticles(state, cop.x, cop.y, '#e63946', 8, 120);
        cop.x -= Math.cos(cop.angle) * 60;
        cop.y -= Math.sin(cop.angle) * 60;
      }
    }
  }
}

function arrestAttempt(state, cop, dt) {
  cop.arrestCd -= dt;
  if (cop.arrestCd > 0) return;
  cop.arrestCd = 1.2;
  // Arrest: health drains; at 0 the player is busted (game over).
  state.health = Math.max(0, state.health - 12);
  state.shake = Math.max(state.shake, 4);
  addMessage(state, 'A cop is grabbing you! Break away!');
}
