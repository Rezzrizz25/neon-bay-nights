// Combat: fists (F), pistol (mouse aim, click to shoot), bullets, muzzle flash,
// enemy reactions, and pickups (health, armor, ammo) scattered around the city.
import { WEAPONS } from './config.js';
import { ACTION_PUNCH, ACTION_WEAPON } from './input.js';
import { addMessage, addParticles, collideBuildings, explode } from './world.js';

export function spawnPickups(state) {
  const spots = [
    { x: 1200, y: 800, kind: 'health' }, { x: 2200, y: 1400, kind: 'armor' },
    { x: 600, y: 1800, kind: 'ammo' }, { x: 2600, y: 600, kind: 'health' },
    { x: 1800, y: 2000, kind: 'ammo' }, { x: 3000, y: 900, kind: 'armor' },
  ];
  for (const s of spots) state.pickups.push({ ...s, taken: false });
}

export function updateCombat(state, dt, input, actions, audio, mouseWorld) {
  const p = state.player;
  if (actions & ACTION_WEAPON) {
    if (state.weapon === 'fists' && state.ammo > 0) { state.weapon = 'pistol'; addMessage(state, 'Pistol equipped.'); }
    else { state.weapon = 'fists'; addMessage(state, 'Fists equipped.'); }
  }
  if (!p.onFoot) return;
  // Punch.
  if ((actions & ACTION_PUNCH) && p.punchCd <= 0) {
    p.punchCd = WEAPONS.fists.rate;
    audio.sfx('punch');
    const range = WEAPONS.fists.range;
    let hit = null;
    for (const ped of state.peds) {
      if (ped.dead) continue;
      const d = Math.hypot(ped.x - p.x, ped.y - p.y);
      if (d < range) {
        const ang = Math.atan2(ped.y - p.y, ped.x - p.x);
        let diff = Math.abs(((ang - p.angle + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
        if (diff < 1.2) { hit = ped; break; }
      }
    }
    if (hit) {
      hit.hp -= WEAPONS.fists.damage;
      hit.flee = 2;
      addParticles(state, hit.x, hit.y, '#ffd166', 8, 120);
      if (hit.mission && hit.hp <= 0) { hit.paid = true; state.cash += 400; addMessage(state, 'Tomas paid up — $400 collected.'); }
      else if (hit.hp <= 0) { hit.dead = true; addParticles(state, hit.x, hit.y, '#e63946', 14, 140); }
      if (hit.mission && hit.hp > 0 && hit.hp <= 40) { hit.paid = true; state.cash += 400; addMessage(state, 'Tomas paid up — $400 collected.'); }
    }
    // Punching a cop car window / nearby cop raises heat.
    for (const cop of state.cops) {
      if (!cop.inCar && Math.hypot(cop.x - p.x, cop.y - p.y) < range) {
        state.wanted = Math.max(state.wanted, 2);
        state.heat = 80;
      }
    }
  }
  // Shoot.
  if (input.mouse.down && state.weapon === 'pistol' && p.shootCd <= 0) {
    if (state.ammo <= 0) { p.shootCd = 0.3; addMessage(state, 'No ammo — find an ammo pickup (blue crates).'); return; }
    p.shootCd = WEAPONS.pistol.rate;
    state.ammo -= 1;
    const ang = Math.atan2(mouseWorld.y - p.y, mouseWorld.x - p.x);
    p.angle = ang;
    state.bullets.push({ x: p.x + Math.cos(ang) * 22, y: p.y + Math.sin(ang) * 22, vx: Math.cos(ang) * 900, vy: Math.sin(ang) * 900, life: 0.6, fromPlayer: true });
    addParticles(state, p.x + Math.cos(ang) * 26, p.y + Math.sin(ang) * 26, '#ffe066', 5, 160);
    state.shake = Math.max(state.shake, 1.5);
    audio.sfx('shot');
    // Gunfire is noticed.
    if (state.cops.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 600) || state.peds.some((pd) => !pd.dead && Math.hypot(pd.x - p.x, pd.y - p.y) < 300)) {
      state.wanted = Math.max(state.wanted, 2);
      state.heat = 80;
    }
  }
  // Bullets fly.
  for (let i = state.bullets.length - 1; i >= 0; i -= 1) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let dead = b.life <= 0 || collideBuildings(state, b.x, b.y, 2);
    if (!dead && b.fromPlayer) {
      for (const ped of state.peds) {
        if (ped.dead) continue;
        if (Math.hypot(ped.x - b.x, ped.y - b.y) < 16) {
          ped.hp -= WEAPONS.pistol.damage;
          ped.flee = 2;
          addParticles(state, ped.x, ped.y, '#e63946', 10, 140);
          if (ped.mission && ped.hp <= 0) { ped.paid = true; state.cash += 400; addMessage(state, 'Tomas paid up — $400 collected.'); }
          else if (ped.hp <= 0) ped.dead = true;
          dead = true;
          break;
        }
      }
      if (!dead) {
        for (const cop of state.cops) {
          if (Math.hypot(cop.x - b.x, cop.y - b.y) < 16) {
            state.wanted = Math.max(state.wanted, 3);
            state.heat = 90;
            addParticles(state, cop.x, cop.y, '#e63946', 10, 140);
            if (cop.inCar && cop.car) { cop.car.hp -= 34; if (cop.car.hp <= 0) { cop.car.wrecked = true; explode(state, cop.car.x, cop.car.y); } }
            else { const idx = state.cops.indexOf(cop); if (idx >= 0) state.cops.splice(idx, 1); }
            dead = true;
            break;
          }
        }
      }
      if (!dead) {
        for (const car of state.cars) {
          if (car.wrecked || car === p.car) continue;
          if (Math.hypot(car.x - b.x, car.y - b.y) < 24) {
            car.hp -= WEAPONS.pistol.damage;
            addParticles(state, b.x, b.y, '#ffd166', 6, 120);
            if (car.hp <= 0) { car.wrecked = true; explode(state, car.x, car.y); }
            dead = true;
            break;
          }
        }
      }
    }
    if (dead) state.bullets.splice(i, 1);
  }
  // Pickups.
  for (const pk of state.pickups) {
    if (pk.taken) continue;
    if (Math.hypot(pk.x - p.x, pk.y - p.y) < 40) {
      pk.taken = true;
      audio.sfx('pickup');
      if (pk.kind === 'health') { state.health = Math.min(100, state.health + 40); addMessage(state, 'Health +40'); }
      else if (pk.kind === 'armor') { state.armor = Math.min(100, state.armor + 50); addMessage(state, 'Armor +50'); }
      else if (pk.kind === 'ammo') { state.ammo += 24; state.weapon = 'pistol'; addMessage(state, 'Pistol +24 ammo'); }
      else if (pk.kind === 'bag') { /* handled by missions */ }
    }
  }
}

/** Damage the player, armor absorbing first. */
export function hurtPlayer(state, amount) {
  const p = state.player;
  if (p.hurtCd > 0) return;
  p.hurtCd = 0.5;
  let left = amount;
  if (state.armor > 0) {
    const absorbed = Math.min(state.armor, left);
    state.armor -= absorbed;
    left -= absorbed;
  }
  state.health = Math.max(0, state.health - left);
}
