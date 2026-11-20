// Neon Bay Nights — shared constants. Original fictional city Solmar Bay,
// protagonist Dario Cruz. No Rockstar names, assets or music anywhere.
export const STEP = 1 / 60;
export const WORLD_W = 3200;
export const WORLD_H = 2400;
export const ROAD = 96;
export const BLOCK = 400; // road-centre pitch
export const SAVE_KEY = 'neon-bay-nights-save-v1';
export const DAY_LENGTH = 240; // seconds per full day/night cycle

export const CAR_COLORS = ['#e63946', '#f4a261', '#2a9d8f', '#457b9d', '#e9c46a', '#9b5de5', '#f15bb5', '#c0c0c0', '#222831', '#00b4d8'];
export const PED_COLORS = ['#ffbe0b', '#fb5607', '#8338ec', '#3a86ff', '#06d6a0', '#ef476f', '#ffd166', '#118ab2'];

export const WEAPONS = {
  fists: { name: 'Fists', damage: 14, rate: 0.35, range: 52 },
  pistol: { name: 'Pistol', damage: 34, rate: 0.22, range: 460 },
};

export const MISSION_DEFS = [
  {
    id: 'first-wheels', title: 'First Wheels', reward: 150,
    brief: 'Marco needs a car, fast. Steal any parked car and deliver it to the blue marker at the marina garage.',
    hint: 'Walk to a parked car and press E to get in. Drive to the blue marker.',
  },
  {
    id: 'bay-runner', title: 'Bay Runner', reward: 300,
    brief: 'A package for the north docks — and the clock is ticking. Deliver it to the east beach marker in 90 seconds.',
    hint: 'Follow the blue marker. Drive fast, but cops notice reckless driving.',
  },
  {
    id: 'debt-collection', title: 'Debt Collection', reward: 400,
    brief: 'Tomas owes Marco $400 and is hiding near the central plaza. Find him, walk up and press F to make him pay.',
    hint: 'Tomas is the red-shirted man by the plaza. Get close and press F.',
  },
  {
    id: 'heat', title: 'Heat', reward: 500,
    brief: 'The Solmar Bay PD is onto you — 3 stars! Lose the heat: break line of sight and stay hidden until the stars fade.',
    hint: 'Drive away fast, then hide behind buildings until wanted drops to 0.',
  },
  {
    id: 'marina-job', title: 'The Marina Job', reward: 1200,
    brief: 'The finale: grab the cash bag at the marina, then escape to the north safehouse with the cops on your tail.',
    hint: 'Walk to the gold bag at the marina, then reach the green safehouse marker. Survive!',
  },
];

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const PALETTE = {
  panel: 'rgba(12,16,28,0.88)', text: '#f2f5f9', muted: '#9aa5b5',
  gold: '#f2c94c', red: '#e5534b', green: '#3ddc84', blue: '#4fc3f7',
};
