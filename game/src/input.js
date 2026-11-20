// Keyboard and mouse input. Held keys are read every frame; one-shot presses
// (enter car, punch, pause, mute, radio) are queued as bit flags and taken once.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_ENTER = 4;
export const ACTION_PUNCH = 8;
export const ACTION_MUTE = 16;
export const ACTION_RADIO = 32;
export const ACTION_WEAPON = 64;

const KEYMAP = {
  KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right',
  Space: 'brake',
};

export function createInput(canvas) {
  const keys = { up: false, down: false, left: false, right: false, brake: false };
  let actions = 0;
  const mouse = { x: 0, y: 0, down: false, clicked: false };

  window.addEventListener('keydown', (event) => {
    const k = KEYMAP[event.code];
    if (k) { keys[k] = true; event.preventDefault(); return; }
    if (event.repeat) return;
    if (event.code === 'Enter' || event.code === 'Space') actions |= ACTION_CONFIRM;
    else if (event.code === 'Escape' || event.code === 'KeyP') actions |= ACTION_PAUSE;
    else if (event.code === 'KeyE') actions |= ACTION_ENTER;
    else if (event.code === 'KeyF') actions |= ACTION_PUNCH;
    else if (event.code === 'KeyM') actions |= ACTION_MUTE;
    else if (event.code === 'KeyR') actions |= ACTION_RADIO;
    else if (event.code === 'KeyQ') actions |= ACTION_WEAPON;
  });
  window.addEventListener('keyup', (event) => {
    const k = KEYMAP[event.code];
    if (k) keys[k] = false;
  });
  window.addEventListener('blur', () => {
    for (const k of Object.keys(keys)) keys[k] = false;
    mouse.down = false;
  });
  canvas.addEventListener('pointermove', (event) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = event.clientX - r.left;
    mouse.y = event.clientY - r.top;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = event.clientX - r.left;
    mouse.y = event.clientY - r.top;
    mouse.down = true;
    mouse.clicked = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => { mouse.down = false; });

  return {
    keys, mouse,
    takeActions() { const t = actions; actions = 0; return t; },
    takeClick() { const c = mouse.clicked; mouse.clicked = false; return c; },
  };
}
