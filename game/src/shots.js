// Deterministic screenshot staging for ?shot=start|drive|chase|mission&seed=N.
// Each scene sets up a real game state (title, dusk driving, police chase,
// mission in progress) and main.js then plays it forward a few seconds with an
// autopilot, so the frame is what real play looks like — same seed, same frame.
import { startMission } from './missions.js';

export function applyShotSetup(name, state, world) {
  world.reset();
  const p = state.player;
  if (name === 'start') {
    state.time = 18.2; // dusk over the city, title panel on top
    return { screen: 'title', seconds: 3, drive: false };
  }
  if (name === 'drive') {
    state.time = 18.4;
    const car = state.cars.find((c) => c.parked) || state.cars[0];
    p.car = car; p.onFoot = false; car.parked = false; car.ai = false;
    car.x = 600; car.y = 1200 - 14; car.angle = 0; car.speed = 260;
    p.x = car.x; p.y = car.y; p.angle = 0;
    return { screen: 'play', seconds: 5, drive: true };
  }
  if (name === 'chase') {
    state.time = 19.5; // night chase, headlights and wanted stars
    const car = state.cars.find((c) => c.parked) || state.cars[0];
    p.car = car; p.onFoot = false; car.parked = false; car.ai = false;
    car.x = 1400; car.y = 1200 - 14; car.angle = 0; car.speed = 380;
    p.x = car.x; p.y = car.y; p.angle = 0;
    state.wanted = 3;
    state.heat = 90;
    state.weapon = 'pistol';
    state.ammo = 18;
    return { screen: 'play', seconds: 4, drive: true };
  }
  // mission: Bay Runner timed delivery, objective marker + minimap visible.
  state.time = 10.5; // bright morning for a readable mission shot
  startMission(state, 1);
  const car = state.cars.find((c) => c.parked) || state.cars[0];
  p.car = car; p.onFoot = false; car.parked = false; car.ai = false;
  car.x = 900; car.y = 1200 - 14; car.angle = 0; car.speed = 300;
  p.x = car.x; p.y = car.y; p.angle = 0;
  state.weapon = 'pistol';
  state.ammo = 12;
  return { screen: 'play', seconds: 3, drive: true };
}

/** Autopilot keys for the staged drive: hold W, steer gently toward the road. */
export function autopilotKeys(state) {
  const car = state.player.car;
  const keys = { up: true, down: false, left: false, right: false, brake: false };
  if (!car) return keys;
  const laneY = Math.round(car.y / 400) * 400 - 14;
  const targetAngle = car.angle;
  const dy = laneY - car.y;
  if (Math.abs(dy) > 6) {
    const want = Math.atan2(dy, 200);
    if (want > targetAngle + 0.05) keys.left = false, keys.right = true;
    else if (want < targetAngle - 0.05) keys.left = true, keys.right = false;
  }
  return keys;
}
