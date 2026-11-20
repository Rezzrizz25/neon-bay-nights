// The player, Dario Cruz: walking on foot and driving. Driving is simple arcade
// physics — acceleration, steering that scales with speed, handbrake drift with
// skid marks, and collisions with buildings, traffic and pedestrians.
import { WORLD_H, WORLD_W } from './config.js';
import { addParticles, collideBuildings, explode, isWater, moveWithCollision } from './world.js';
import { ACTION_ENTER } from './input.js';

const WALK_SPEED = 210;
const CAR_ACCEL = 420;
const CAR_MAX = 520;
const CAR_REVERSE = 180;

export function nearestCar(state, maxDist) {
  const p = state.player;
  let best = null;
  let bestD = maxDist;
  for (const car of state.cars) {
    if (car.wrecked) continue;
    const d = Math.hypot(car.x - p.x, car.y - p.y);
    if (d < bestD) { bestD = d; best = car; }
  }
  return best;
}

function damageCar(state, car, amount) {
  car.hp -= amount;
  if (car.hp <= 0 && !car.wrecked) {
    car.wrecked = true;
    explode(state, car.x, car.y);
    if (state.player.car === car) {
      state.player.car = null;
      state.player.onFoot = true;
      state.player.x = car.x + 40;
      state.player.y = car.y;
    }
  }
}

export function updatePlayer(state, dt, input, actions, audio) {
  const p = state.player;
  const k = input.keys;
  if (p.punchCd > 0) p.punchCd -= dt;
  if (p.shootCd > 0) p.shootCd -= dt;
  if (p.hurtCd > 0) p.hurtCd -= dt;

  if (actions & ACTION_ENTER) {
    if (p.onFoot) {
      const car = nearestCar(state, 70);
      if (car) {
        p.car = car;
        p.onFoot = false;
        car.parked = false;
        car.ai = false;
        audio.sfx('enter');
        if (state.wanted < 1) {
          // Stealing in view of a cop (or a nearby ped who calls it in) raises heat.
          const seen = state.cops.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 500)
            || state.peds.some((pd) => !pd.dead && Math.hypot(pd.x - p.x, pd.y - p.y) < 220);
          if (seen && !car.stolen) { state.wanted = Math.max(state.wanted, 1); state.heat = 60; }
        }
        car.stolen = true;
      }
    } else if (p.car) {
      const car = p.car;
      p.car = null;
      p.onFoot = true;
      p.x = car.x + Math.cos(car.angle + Math.PI / 2) * 34;
      p.y = car.y + Math.sin(car.angle + Math.PI / 2) * 34;
      p.speed = 0;
      car.speed = 0;
      car.ai = false;
      car.parked = true;
      audio.sfx('enter');
    }
  }

  if (p.onFoot) {
    let dx = (k.right ? 1 : 0) - (k.left ? 1 : 0);
    let dy = (k.down ? 1 : 0) - (k.up ? 1 : 0);
    if (dx || dy) {
      const len = Math.hypot(dx, dy);
      dx /= len; dy /= len;
      p.angle = Math.atan2(dy, dx);
      moveWithCollision(state, p, p.x + dx * WALK_SPEED * dt, p.y + dy * WALK_SPEED * dt, 14);
    }
    return;
  }

  // Driving.
  const car = p.car;
  if (!car) { p.onFoot = true; return; }
  const forward = k.up ? 1 : 0;
  const back = k.down ? 1 : 0;
  const steer = (k.left ? 1 : 0) - (k.right ? 1 : 0);
  const handbrake = k.brake;
  if (forward) car.speed += CAR_ACCEL * dt;
  else if (back) car.speed -= (car.speed > 0 ? CAR_ACCEL * 1.4 : CAR_ACCEL * 0.6) * dt;
  else car.speed *= Math.max(0, 1 - 0.6 * dt);
  if (handbrake) car.speed *= Math.max(0, 1 - 3.5 * dt);
  car.speed = Math.max(-CAR_REVERSE, Math.min(CAR_MAX, car.speed));
  const steerFactor = Math.min(1, Math.abs(car.speed) / 120);
  car.angle += steer * 2.4 * steerFactor * dt * (car.speed >= 0 ? 1 : -1) * (handbrake ? 1.5 : 1);
  if (handbrake && Math.abs(car.speed) > 200 && Math.random() < 0.6) {
    state.skids.push({ x: car.x, y: car.y, angle: car.angle, life: 2.5 });
    if (state.skids.length > 200) state.skids.shift();
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  const hitBuilding = collideBuildings(state, nx, ny, 22);
  if (hitBuilding) {
    if (Math.abs(car.speed) > 240) {
      addParticles(state, nx, ny, '#ffd166', 12, 160);
      state.shake = Math.max(state.shake, 6);
      audio.sfx('crash');
      damageCar(state, car, 18);
      state.health = Math.max(0, state.health - 4);
    }
    car.speed *= 0.4;
  } else {
    car.x = nx;
    car.y = ny;
  }
  car.x = Math.max(20, Math.min(WORLD_W - 20, car.x));
  car.y = Math.max(20, Math.min(WORLD_H - 20, car.y));
  if (isWater(car.x, car.y)) { car.speed = 0; }
  p.x = car.x;
  p.y = car.y;
  p.angle = car.angle;
  p.speed = car.speed;

  // Bump traffic cars.
  for (const other of state.cars) {
    if (other === car || other.wrecked) continue;
    const d = Math.hypot(other.x - car.x, other.y - car.y);
    if (d < 44 && d > 0.01) {
      const push = (44 - d) / 2;
      const ux = (other.x - car.x) / d;
      const uy = (other.y - car.y) / d;
      other.x += ux * push;
      other.y += uy * push;
      const impact = Math.abs(car.speed);
      if (impact > 200) {
        audio.sfx('crash');
        state.shake = Math.max(state.shake, 4);
        damageCar(state, other, 12);
        damageCar(state, car, 6);
        if (state.cops.some((c) => Math.hypot(c.x - car.x, c.y - car.y) < 420)) {
          state.wanted = Math.max(state.wanted, 1);
          state.heat = 50;
        }
      }
      other.speed *= 0.5;
      car.speed *= 0.7;
    }
  }
  // Running over pedestrians is noticed.
  for (const ped of state.peds) {
    if (ped.dead) continue;
    const d = Math.hypot(ped.x - car.x, ped.y - car.y);
    if (d < 30 && Math.abs(car.speed) > 60) {
      ped.dead = true;
      ped.hp = 0;
      addParticles(state, ped.x, ped.y, '#e63946', 14, 140);
      state.wanted = Math.max(state.wanted, 2);
      state.heat = 80;
    }
  }
}
