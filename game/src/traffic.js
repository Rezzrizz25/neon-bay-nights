// Traffic AI (cars following the road grid, stopping for cars ahead) and
// pedestrians (sidewalk wanderers who flee gunfire and crashes).
import { BLOCK, ROAD, WORLD_H, WORLD_W } from './config.js';
import { isRoad, moveWithCollision } from './world.js';

const DIRS = [[1, 0], [0, 1], [-1, 0], [0, -1]];

function onIntersection(car) {
  const rx = ((car.x % BLOCK) + BLOCK) % BLOCK;
  const ry = ((car.y % BLOCK) + BLOCK) % BLOCK;
  return (rx < ROAD / 2 || rx > BLOCK - ROAD / 2) && (ry < ROAD / 2 || ry > BLOCK - ROAD / 2);
}

export function updateTraffic(state, dt) {
  for (const car of state.cars) {
    if (!car.ai || car.wrecked || car.parked) continue;
    // Slow down for a car ahead.
    let blocked = false;
    for (const other of state.cars) {
      if (other === car || other.wrecked) continue;
      const dx = other.x - car.x;
      const dy = other.y - car.y;
      const ahead = dx * Math.cos(car.angle) + dy * Math.sin(car.angle);
      const side = Math.abs(-dx * Math.sin(car.angle) + dy * Math.cos(car.angle));
      if (ahead > 0 && ahead < 70 && side < 26) { blocked = true; break; }
    }
    const target = blocked ? 0 : car.targetSpeed;
    car.speed += Math.max(-260 * dt, Math.min(160 * dt, target - car.speed));
    // At intersections, sometimes turn onto the crossing road.
    if (onIntersection(car) && Math.random() < 0.004) {
      const turn = Math.random() < 0.5 ? 1 : -1;
      car.dir = (car.dir + turn + 4) % 4;
      car.angle = Math.atan2(DIRS[car.dir][1], DIRS[car.dir][0]);
    }
    // Keep the car glued to its road centre line.
    const d = DIRS[car.dir];
    const targetLine = car.dir % 2 === 0
      ? Math.round(car.y / BLOCK) * BLOCK + (car.dir === 0 ? -14 : 14)
      : Math.round(car.x / BLOCK) * BLOCK + (car.dir === 1 ? -14 : 14);
    if (car.dir % 2 === 0) car.y += (targetLine - car.y) * Math.min(1, 2 * dt);
    else car.x += (targetLine - car.x) * Math.min(1, 2 * dt);
    car.x += d[0] * car.speed * dt;
    car.y += d[1] * car.speed * dt;
    if (car.x < 40 || car.x > WORLD_W - 40 || car.y < 40 || car.y > WORLD_H - 40) {
      car.dir = (car.dir + 2) % 4;
      car.angle = Math.atan2(DIRS[car.dir][1], DIRS[car.dir][0]);
      car.x = Math.max(40, Math.min(WORLD_W - 40, car.x));
      car.y = Math.max(40, Math.min(WORLD_H - 40, car.y));
    }
    car.angle = Math.atan2(DIRS[car.dir][1], DIRS[car.dir][0]);
  }
}

export function updatePeds(state, dt) {
  for (const ped of state.peds) {
    if (ped.dead) continue;
    ped.wander -= dt;
    const danger = state.bullets.length > 0
      || (state.player.car && Math.abs(state.player.speed) > 200 && Math.hypot(ped.x - state.player.x, ped.y - state.player.y) < 200);
    if (danger || ped.flee > 0) {
      ped.flee = Math.max(ped.flee, danger ? 1.5 : ped.flee - dt);
      const away = Math.atan2(ped.y - state.player.y, ped.x - state.player.x);
      ped.angle = away;
      moveWithCollision(state, ped, ped.x + Math.cos(away) * 120 * dt, ped.y + Math.sin(away) * 120 * dt, 12);
      continue;
    }
    if (ped.wander <= 0) {
      ped.wander = 2 + Math.random() * 4;
      ped.angle = Math.random() * Math.PI * 2;
    }
    const nx = ped.x + Math.cos(ped.angle) * ped.speed * dt;
    const ny = ped.y + Math.sin(ped.angle) * ped.speed * dt;
    if (isRoad(nx, ny) && Math.random() < 0.5) {
      ped.angle += Math.PI / 2; // prefer sidewalks; cross roads only sometimes
    } else {
      moveWithCollision(state, ped, nx, ny, 12);
    }
    ped.x = Math.max(30, Math.min(WORLD_W - 30, ped.x));
    ped.y = Math.max(30, Math.min(WORLD_H - 30, ped.y));
  }
}
