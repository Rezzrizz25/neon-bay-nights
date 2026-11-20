// The story: five chained missions for Dario Cruz, each with a briefing, an
// objective marker, a timer where it fits, and a cash reward on completion.
import { MISSION_DEFS } from './config.js';
import { addMessage } from './world.js';

export function missionDef(state) {
  return MISSION_DEFS[state.missionIndex] || null;
}

export function startMission(state, index) {
  const def = MISSION_DEFS[index];
  if (!def) return;
  state.missionIndex = index;
  state.mission = { stage: 'go', timer: 0, target: null, targetPed: null, text: def.brief };
  if (index === 0) state.mission.target = { x: 2950, y: 2050, label: 'Marina garage', color: '#4fc3f7' };
  if (index === 1) { state.mission.target = { x: 3050, y: 300, label: 'North docks', color: '#4fc3f7' }; state.mission.timer = 90; }
  if (index === 2) {
    const tomas = state.peds.find((pd) => !pd.dead) || null;
    if (tomas) {
      tomas.x = 1400; tomas.y = 1000; tomas.color = '#e63946'; tomas.mission = true; tomas.hp = 80;
      state.mission.targetPed = tomas;
      state.mission.target = { x: 1400, y: 1000, label: 'Tomas', color: '#e63946' };
    }
  }
  if (index === 3) { state.wanted = 3; state.heat = 90; state.mission.target = null; }
  if (index === 4) {
    state.mission.target = { x: 2980, y: 1500, label: 'Cash bag', color: '#f2c94c' };
    state.pickups.push({ x: 2980, y: 1500, kind: 'bag', taken: false });
  }
  addMessage(state, `${def.title}: ${def.brief}`);
}

export function completeMission(state, audio) {
  const def = MISSION_DEFS[state.missionIndex];
  if (!def) return;
  state.cash += def.reward;
  state.missionsDone += 1;
  addMessage(state, `Mission complete: ${def.title} — +$${def.reward}`);
  audio.sfx('mission');
  if (state.missionIndex + 1 < MISSION_DEFS.length) {
    startMission(state, state.missionIndex + 1);
  } else {
    state.mission = { stage: 'done', timer: 0, target: null, targetPed: null, text: 'Story complete! Solmar Bay is yours, Dario.' };
    addMessage(state, 'All missions complete! Free roam — Solmar Bay is yours.');
  }
}

export function updateMissions(state, dt, audio) {
  const m = state.mission;
  const def = missionDef(state);
  if (!def || m.stage === 'done') return;
  const p = state.player;
  if (state.missionIndex === 0) {
    // Deliver a stolen car to the marina garage.
    if (!p.onFoot && p.car && p.car.stolen && m.target) {
      const d = Math.hypot(p.x - m.target.x, p.y - m.target.y);
      if (d < 90) completeMission(state, audio);
    }
  } else if (state.missionIndex === 1) {
    m.timer -= dt;
    if (m.timer <= 0) {
      addMessage(state, 'Too slow — the buyer walked. Try again: drive to the marker.');
      startMission(state, 1);
      return;
    }
    if (m.target && Math.hypot(p.x - m.target.x, p.y - m.target.y) < 90) completeMission(state, audio);
  } else if (state.missionIndex === 2) {
    if (m.targetPed && (m.targetPed.dead || m.targetPed.paid)) completeMission(state, audio);
    else if (m.targetPed) { m.target.x = m.targetPed.x; m.target.y = m.targetPed.y; }
  } else if (state.missionIndex === 3) {
    if (state.wanted === 0) completeMission(state, audio);
  } else if (state.missionIndex === 4) {
    if (m.stage === 'go') {
      const bag = state.pickups.find((pk) => pk.kind === 'bag' && !pk.taken);
      if (bag && p.onFoot && Math.hypot(p.x - bag.x, p.y - bag.y) < 46) {
        bag.taken = true;
        m.stage = 'escape';
        m.target = { x: 700, y: 300, label: 'Safehouse', color: '#3ddc84' };
        state.wanted = Math.max(state.wanted, 3);
        state.heat = 90;
        addMessage(state, 'Bag grabbed! Lose the cops and reach the safehouse.');
        audio.sfx('pickup');
      }
    } else if (m.stage === 'escape') {
      if (m.target && Math.hypot(p.x - m.target.x, p.y - m.target.y) < 90) completeMission(state, audio);
    }
  }
}
