# Neon Bay Nights

[![gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01)
[![rank](https://make.fun/badge/gta6-01/Rezzrizz25/neon-bay-nights/rank.svg)](https://make.fun/c/gta6-01)
[![reward](https://make.fun/badge/gta6-01/Rezzrizz25/neon-bay-nights/reward.svg)](https://make.fun/c/gta6-01)

An original top-down 2D open-world crime game set in the fictional city of
**Solmar Bay**. You are **Dario Cruz**, back in town with $50 and a debt to pay.
Steal cars, run jobs for Marco, dodge the Solmar Bay PD, and pull off the
Marina Job.

**Honest scope note:** this is a playable mini-game tribute built in a few
days, not a full GTA 6 clone. It is 100% original — its own city, characters,
story, art and synth music. No Rockstar names, assets or music are used
anywhere.

## Features

- Open city on foot and by car: grid roads, blocks of buildings, sidewalks,
  a central plaza, a park, and a beach/marina district — with a day/night cycle.
- Traffic AI driving the roads and pedestrians walking the sidewalks (they flee
  gunfire and crashes).
- Cars to steal: walk up to a parked or traffic car, press **E** to get in or
  out. Stealing in view of police or witnesses raises your wanted level.
- Wanted level (1–5 stars) with police AI: patrol cars chase and ram, foot
  cops chase and try to arrest you. Wanted decays when you break line of
  sight and hide.
- Story: 5 chained missions with briefings, objective markers and cash
  rewards — *First Wheels*, *Bay Runner* (timed delivery), *Debt Collection*,
  *Heat* (lose a 3-star wanted level), and the finale *The Marina Job*.
- Combat: punch (**F**), pistol with ammo (aim with the mouse, click to shoot),
  enemies that react, health + armor, and health/armor/ammo pickups.
- HUD: health, armor, cash, wanted stars, weapon/ammo, mission tracker,
  clock and day/night indicator, plus a live minimap (player, cars, cops,
  mission marker, north arrow).
- Start screen with story blurb, pause (**Esc**/**P**), game over + restart,
  and saving to localStorage (cash, mission, position) with Continue.
- Polish: WebAudio synth engine hum and radio-style music (no audio files),
  mute (**M**) and radio (**R**) toggles, skid marks, muzzle flash, explosion
  particles, screen shake, smooth follow camera, day/night tinting.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Walk / drive |
| Space | Brake / handbrake (drift) |
| E | Enter / exit car |
| F | Punch |
| Mouse aim + click | Shoot pistol |
| Q | Switch weapon |
| R | Change radio station |
| M | Mute / unmute |
| Esc / P | Pause |
| Enter / click | Start / restart |
| C (title screen) | Continue saved game |

## How to run

```sh
node serve.ts
# open http://localhost:8080
```

Or open `game/index.html` directly in a desktop browser. No build step, no
backend, no network requests — everything is inline vanilla JS + canvas.

## Screenshot staging

The game supports `?shot=start|drive|chase|mission&seed=1` for deterministic
staged screenshots (see `shots.json`).

## License

MIT — see [LICENSE](LICENSE).
