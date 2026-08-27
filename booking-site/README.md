# Pulse Studio — fitness class booking site

Plain HTML, CSS and JavaScript. No framework, no build step, no install.

## Open it

Double-click `index.html`. That's it.

If your browser blocks local storage on `file://`, serve the folder instead:

```bash
cd booking-site
python3 -m http.server 4173
# open http://127.0.0.1:4173
```

## Pages

| File | What it does |
| --- | --- |
| `index.html` | Landing page — classes, coaches, prices, next sessions |
| `timetable.html` | Full weekly timetable, filters, booking |
| `bookings.html` | Your bookings, cancel, training stats |

## What works

- **Book a class** — pick a session, confirm your name, you're in.
- **Live spaces** — each class shows spaces left, fills up, and closes 15 minutes before it starts.
- **Filters** — by class, coach, time of day, or "only classes with spaces".
- **Week navigation** — browse forward; the week is in the URL so it's linkable.
- **Cancel** — free up to 4 hours before; after that it tells you to phone.
- **Rules enforced** — no double-booking, no clashing times, no past classes, no full classes, max 8 upcoming.
- **Persists** — bookings survive reload and browser restart.

## Change the studio

Everything the owner would edit is in **`js/data.js`**: studio name, address, phone,
classes, coaches, the weekly timetable, and membership prices. Nothing else needs
touching.

```js
// Add a class to the timetable — day 1 = Monday, 0 = Sunday
{ day: 3, time: "19:30", classId: "boxing", coachId: "dee", capacity: 16 }
```

Colours and fonts are CSS variables at the top of `css/styles.css`.

## How bookings are stored

In this browser only, via `localStorage`. There is no server, so bookings don't
travel between devices and clearing site data clears them.

Because there's no shared database, each class gets a stable "already taken"
number derived from its own id — so a class that looks nearly full stays nearly
full on every reload, and the UI has something honest to react to. Real
multi-user booking needs a backend.

## Notes

- Fonts load from Google Fonts. Offline, it falls back to system fonts and still
  looks right.
- Tested: no horizontal scroll at 360px and up, all tap targets 44px+, visible
  focus rings, `prefers-reduced-motion` respected, status never shown by colour alone.
