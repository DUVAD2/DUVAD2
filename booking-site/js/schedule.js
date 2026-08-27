/* Turns the recurring weekly timetable into concrete, dated sessions, and
 * works out how many spaces each one has left.
 *
 * Bookings live only in this browser (localStorage), so there is no shared
 * count of who else is coming. Rather than pretend every class is empty, each
 * session gets a stable, deterministic "already taken" figure derived from its
 * own id — the same session always shows the same number, on every reload, so
 * a class that is nearly full stays nearly full and the UI has something
 * honest to react to.
 */
window.Schedule = (function () {
  "use strict";

  var DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  var DAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  var MONTH_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

  /* ---------- Date helpers ---------- */

  function startOfDay(date) {
    var d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  }

  /** Monday of the week containing `date`. */
  function startOfWeek(date) {
    var d = startOfDay(date);
    var dow = d.getDay();
    var back = dow === 0 ? 6 : dow - 1; // Treat Monday as the first day.
    d.setDate(d.getDate() - back);
    return d;
  }

  function addDays(date, n) {
    var d = new Date(date);
    d.setDate(d.getDate() + n);
    return d;
  }

  /** Local YYYY-MM-DD. Deliberately not toISOString(), which shifts to UTC. */
  function isoDate(date) {
    var m = String(date.getMonth() + 1).padStart(2, "0");
    var day = String(date.getDate()).padStart(2, "0");
    return date.getFullYear() + "-" + m + "-" + day;
  }

  function sameDay(a, b) {
    return isoDate(a) === isoDate(b);
  }

  function formatDayLong(date) {
    return DAY_NAMES[date.getDay()];
  }

  function formatDateShort(date) {
    return date.getDate() + " " + MONTH_SHORT[date.getMonth()];
  }

  function formatRange(monday) {
    var sunday = addDays(monday, 6);
    var left = monday.getDate() + " " + MONTH_SHORT[monday.getMonth()];
    var right = sunday.getDate() + " " + MONTH_SHORT[sunday.getMonth()];
    return left + " – " + right;
  }

  /** "18:45" + a date -> a real Date in local time. */
  function at(date, time) {
    var parts = time.split(":");
    var d = startOfDay(date);
    d.setHours(Number(parts[0]), Number(parts[1]), 0, 0);
    return d;
  }

  function minutesBetween(a, b) {
    return (b.getTime() - a.getTime()) / 60000;
  }

  /* ---------- Deterministic "already booked" figure ---------- */

  /** Small string hash (FNV-1a). Same id always gives the same number. */
  function hash(str) {
    var h = 2166136261;
    for (var i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i);
      h = (h * 16777619) >>> 0;
    }
    return h >>> 0;
  }

  /**
   * How full a session already is before this visitor books anything.
   * Peak slots (early morning and after work) run fuller than midday.
   */
  function baselineTaken(id, capacity, time) {
    var hour = Number(time.split(":")[0]);
    var peak = hour <= 7 || (hour >= 17 && hour <= 19);
    var floorPct = peak ? 0.62 : 0.28;
    var spread = peak ? 0.42 : 0.5;
    var pct = floorPct + (hash(id) % 1000) / 1000 * spread;
    var taken = Math.round(capacity * pct);
    return Math.max(0, Math.min(capacity, taken));
  }

  /* ---------- Session building ---------- */

  /**
   * Every session in the week beginning `monday`, in chronological order.
   * `bookedIds` is the set of session ids this visitor already holds.
   */
  function sessionsForWeek(monday, bookedIds) {
    var out = [];
    bookedIds = bookedIds || {};

    for (var i = 0; i < 7; i++) {
      var date = addDays(monday, i);
      var dow = date.getDay();

      STUDIO.timetable
        .filter(function (slot) {
          return slot.day === dow;
        })
        .forEach(function (slot) {
          out.push(buildSession(slot, date, bookedIds));
        });
    }

    out.sort(function (a, b) {
      return a.start - b.start;
    });
    return out;
  }

  function buildSession(slot, date, bookedIds) {
    var id = slot.classId + "|" + slot.time + "|" + isoDate(date);
    var cls = STUDIO.getClass(slot.classId);
    var coach = STUDIO.getCoach(slot.coachId);
    var start = at(date, slot.time);
    var end = new Date(start.getTime() + cls.duration * 60000);

    var taken = baselineTaken(id, slot.capacity, slot.time);
    var isBooked = Boolean(bookedIds[id]);
    if (isBooked) taken = Math.min(slot.capacity, taken + 1);

    var spacesLeft = slot.capacity - taken;
    var now = new Date();
    // Booking closes shortly before the class starts.
    var closesAt = new Date(start.getTime() - STUDIO.studio.bookingClosesMin * 60000);

    return {
      id: id,
      classId: slot.classId,
      className: cls.name,
      classKey: cls.key,
      colour: cls.colour,
      description: cls.description,
      intensity: cls.intensity,
      duration: cls.duration,
      coachId: slot.coachId,
      coachName: coach.name,
      capacity: slot.capacity,
      spacesLeft: spacesLeft,
      time: slot.time,
      date: date,
      dateIso: isoDate(date),
      start: start,
      end: end,
      isBooked: isBooked,
      isPast: now >= start,
      isClosed: now >= closesAt,
      isFull: spacesLeft <= 0,
    };
  }

  /** Rebuilds a single session from its id, or null if it no longer exists. */
  function sessionById(id, bookedIds) {
    var parts = id.split("|");
    if (parts.length !== 3) return null;

    var classId = parts[0];
    var time = parts[1];
    var dateParts = parts[2].split("-");
    if (dateParts.length !== 3) return null;

    var date = new Date(Number(dateParts[0]), Number(dateParts[1]) - 1, Number(dateParts[2]));
    if (isNaN(date.getTime())) return null;

    var slot = null;
    for (var i = 0; i < STUDIO.timetable.length; i++) {
      var s = STUDIO.timetable[i];
      if (s.classId === classId && s.time === time && s.day === date.getDay()) {
        slot = s;
        break;
      }
    }
    if (!slot || !STUDIO.getClass(classId)) return null;

    return buildSession(slot, date, bookedIds || {});
  }

  /** The next `count` sessions from now, for the "what's on today" preview. */
  function upcomingSessions(count, bookedIds) {
    var out = [];
    var monday = startOfWeek(new Date());

    for (var week = 0; week < 3 && out.length < count; week++) {
      var sessions = sessionsForWeek(addDays(monday, week * 7), bookedIds);
      for (var i = 0; i < sessions.length && out.length < count; i++) {
        if (!sessions[i].isPast) out.push(sessions[i]);
      }
    }
    return out;
  }

  return {
    DAY_SHORT: DAY_SHORT,
    startOfDay: startOfDay,
    startOfWeek: startOfWeek,
    addDays: addDays,
    isoDate: isoDate,
    sameDay: sameDay,
    formatDayLong: formatDayLong,
    formatDateShort: formatDateShort,
    formatRange: formatRange,
    minutesBetween: minutesBetween,
    sessionsForWeek: sessionsForWeek,
    sessionById: sessionById,
    upcomingSessions: upcomingSessions,
  };
})();
