// The city of Solmar Bay: grid roads, blocks of buildings, a beach and marina
// district on the east edge, plazas and a park. Also owns the shared game state
// and the geometry helpers (road checks, building collision) every module uses.
import { BLOCK, CAR_COLORS, PED_COLORS, ROAD, WORLD_H, WORLD_W } from './config.js';

export function isRoad(x, y) {
  if (x < 0 || y < 0 || x > WORLD_W || y > WORLD_H) return false;
  const rx = ((x % BLOCK) + BLOCK) % BLOCK;
  const ry = ((y % BLOCK) + BLOCK) % BLOCK;
  return rx < ROAD / 2 || rx > BLOCK - ROAD / 2 || ry < ROAD / 2 || ry > BLOCK - ROAD / 2;
}

export function isBeach(x, y) { return x > 2880 && x < WORLD_W - 40; }
export function isWater(x, y) { return x >= WORLD_W - 40; }

export function nearestRoadCenter(v) {
  return Math.round(v / BLOCK) * BLOCK;
}

export function buildCity(random) {
  const buildings = [];
  const palette = ['#3a4a6b', '#5b4a7a', '#6b4a3a', '#2f5d50', '#7a5b2f', '#4a3a5b', '#33506b', '#6b3350'];
  for (let bx = 0; bx < 8; bx += 1) {
    for (let by = 0; by < 6; by += 1) {
      const cx = bx * BLOCK + BLOCK / 2;
      const cy = by * BLOCK + BLOCK / 2;
      if (cx > 2800) continue; // beach district: no buildings
      if (bx === 3 && by === 2) continue; // central plaza
      if (bx === 1 && by === 4) continue; // park
      const n = 1 + Math.floor(random() * 2);
      for (let i = 0; i < n; i += 1) {
        const w = 90 + random() * 90;
        const h = 90 + random() * 90;
        const x = cx - w / 2 + (random() - 0.5) * (BLOCK - ROAD - w);
        const y = cy - h / 2 + (random() - 0.5) * (BLOCK - ROAD - h);
        buildings.push({
          x, y, w, h,
          color: palette[Math.floor(random() * palette.length)],
          height: 30 + Math.floor(random() * 70),
          windows: 3 + Math.floor(random() * 4),
        });
      }
    }
  }
  return buildings;
}

function makeCar(random, x, y, angle, parked) {
  return {
    x, y, angle, speed: 0, color: CAR_COLORS[Math.floor(random() * CAR_COLORS.length)],
    parked: !!parked, ai: !parked, cop: false, wrecked: false, dir: Math.floor(random() * 4),
    targetSpeed: 120 + random() * 60, wait: 0, hp: 100,
  };
}

export function createWorld(random) {
  const buildings = buildCity(random);
  const state = {
    time: 17.4, elapsed: 0, cash: 50, wanted: 0, heat: 0, health: 100, armor: 0,
    weapon: 'fists', ammo: 0, missionIndex: 0, missionsDone: 0, gameOver: false,
    shake: 0, muted: false, radio: 'NEON FM',
    player: { x: 1400, y: 1000, angle: -Math.PI / 2, speed: 0, onFoot: true, car: null, punchCd: 0, shootCd: 0, hurtCd: 0 },
    camera: { x: 1400, y: 1000 },
    cars: [], peds: [], cops: [], bullets: [], particles: [], skids: [], pickups: [],
    mission: { stage: 'go', timer: 0, target: null, targetPed: null, text: '' },
    messages: [], buildings, seed: 0,
  };

  function spawnTraffic() {
    state.cars.length = 0;
    for (let i = 0; i < 26; i += 1) {
      const horizontal = random() < 0.5;
      const line = Math.floor(random() * 8) * BLOCK;
      const along = 100 + random() * (WORLD_W - 200);
      const angle = horizontal ? (random() < 0.5 ? 0 : Math.PI) : (random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
      const car = makeCar(random, horizontal ? along : line, horizontal ? line : along, angle, false);
      car.speed = car.targetSpeed;
      state.cars.push(car);
    }
    // Parked cars along roads for stealing.
    for (let i = 0; i < 14; i += 1) {
      const line = Math.floor(random() * 7 + 1) * BLOCK;
      const along = 200 + random() * (WORLD_W - 600);
      const horizontal = random() < 0.5;
      const car = makeCar(random, horizontal ? along : line + 34, horizontal ? line + 34 : along, horizontal ? 0 : Math.PI / 2, true);
      state.cars.push(car);
    }
  }

  function spawnPeds() {
    state.peds.length = 0;
    for (let i = 0; i < 34; i += 1) {
      const x = 150 + random() * (WORLD_W - 500);
      const y = 150 + random() * (WORLD_H - 300);
      state.peds.push({
        x, y, angle: random() * Math.PI * 2, speed: 28 + random() * 22,
        color: PED_COLORS[Math.floor(random() * PED_COLORS.length)],
        hp: 40, flee: 0, target: null, mission: false, dead: false, wander: random() * 5,
      });
    }
  }

  function reset() {
    state.time = 17.4;
    state.elapsed = 0;
    state.cash = 50;
    state.wanted = 0;
    state.heat = 0;
    state.health = 100;
    state.armor = 0;
    state.weapon = 'fists';
    state.ammo = 0;
    state.missionIndex = 0;
    state.missionsDone = 0;
    state.gameOver = false;
    state.shake = 0;
    state.player = { x: 1400, y: 1000, angle: -Math.PI / 2, speed: 0, onFoot: true, car: null, punchCd: 0, shootCd: 0, hurtCd: 0 };
    state.camera = { x: 1400, y: 1000 };
    state.cops = [];
    state.bullets = [];
    state.particles = [];
    state.skids = [];
    state.pickups = [];
    state.messages = [];
    state.mission = { stage: 'go', timer: 0, target: null, targetPed: null, text: '' };
    spawnTraffic();
    spawnPeds();
  }

  reset();
  return { state, reset, buildings };
}

/** Push a circle out of every building it overlaps; returns true on a hit. */
export function collideBuildings(state, x, y, r) {
  let hit = false;
  for (const b of state.buildings) {
    const cx = Math.max(b.x, Math.min(x, b.x + b.w));
    const cy = Math.max(b.y, Math.min(y, b.y + b.h));
    const dx = x - cx;
    const dy = y - cy;
    const d2 = dx * dx + dy * dy;
    if (d2 < r * r) hit = true;
  }
  return hit;
}

/** Resolve a moving circle against buildings by axis-separated sliding. */
export function moveWithCollision(state, obj, nx, ny, r) {
  if (!collideBuildings(state, nx, obj.y, r)) obj.x = nx;
  if (!collideBuildings(state, obj.x, ny, r)) obj.y = ny;
  obj.x = Math.max(20, Math.min(WORLD_W - 20, obj.x));
  obj.y = Math.max(20, Math.min(WORLD_H - 20, obj.y));
}

export function addParticles(state, x, y, color, n, speed) {
  for (let i = 0; i < n; i += 1) {
    const a = Math.random() * Math.PI * 2;
    const s = (speed || 120) * (0.4 + Math.random() * 0.8);
    state.particles.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s, life: 0.5 + Math.random() * 0.5, max: 1, color, size: 2 + Math.random() * 4 });
  }
  if (state.particles.length > 400) state.particles.splice(0, state.particles.length - 400);
}

export function addMessage(state, text) {
  state.messages.push({ text, t: 0 });
  if (state.messages.length > 4) state.messages.shift();
}

export function explode(state, x, y) {
  addParticles(state, x, y, '#ff9f1c', 40, 260);
  addParticles(state, x, y, '#e63946', 30, 180);
  addParticles(state, x, y, '#888', 20, 90);
  state.shake = Math.max(state.shake, 14);
}
