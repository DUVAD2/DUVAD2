/* Booking storage and the rules around it.
 *
 * Everything is kept in this browser's localStorage — there is no server, so
 * bookings do not travel between devices, and clearing site data clears them.
 * Every read is defensive: storage can be unavailable (private windows, cookies
 * blocked) or hold nonsense written by an older version of the site.
 */
window.Store = (function () {
  "use strict";

  var KEY = "pulse-studio.bookings.v1";
  var MEMBER_KEY = "pulse-studio.member.v1";

  /* ---------- Safe storage access ---------- */

  function canStore() {
    try {
      var probe = "__pulse_probe__";
      window.localStorage.setItem(probe, "1");
      window.localStorage.removeItem(probe);
      return true;
    } catch (err) {
      return false;
    }
  }

  var available = canStore();

  function readRaw() {
    if (!available) return [];
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return [];
      var parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch (err) {
      return [];
    }
  }

  function writeRaw(list) {
    if (!available) return false;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(list));
      return true;
    } catch (err) {
      return false;
    }
  }

  /* ---------- Bookings ---------- */

  /** Stored bookings, discarding any malformed rows. */
  function all() {
    return readRaw().filter(function (b) {
      return b && typeof b.sessionId === "string";
    });
  }

  /** { sessionId: true } — the shape Schedule wants. */
  function bookedIdSet() {
    var set = {};
    all().forEach(function (b) {
      set[b.sessionId] = true;
    });
    return set;
  }

  function has(sessionId) {
    return all().some(function (b) {
      return b.sessionId === sessionId;
    });
  }

  /**
   * Every stored booking rebuilt into a live session, newest first.
   * Bookings whose class has since been removed from the timetable are
   * dropped rather than rendered as broken rows.
   */
  function bookedSessions() {
    var set = bookedIdSet();
    return all()
      .map(function (b) {
        var session = Schedule.sessionById(b.sessionId, set);
        if (!session) return null;
        session.bookedAt = b.bookedAt;
        session.memberName = b.memberName || "";
        return session;
      })
      .filter(Boolean)
      .sort(function (a, b) {
        return a.start - b.start;
      });
  }

  function upcoming() {
    return bookedSessions().filter(function (s) {
      return !s.isPast;
    });
  }

  function past() {
    return bookedSessions()
      .filter(function (s) {
        return s.isPast;
      })
      .reverse();
  }

  function upcomingCount() {
    return upcoming().length;
  }

  /* ---------- Rules ---------- */

  /**
   * Whether this session can be booked right now, and why not if it can't.
   * The UI calls this to decide what the button says, and book() calls it
   * again so the rule is enforced even if the UI is stale.
   */
  function canBook(session) {
    if (!available) {
      return { ok: false, reason: "This browser is blocking local storage, so bookings can't be saved." };
    }
    if (!session) {
      return { ok: false, reason: "That class is no longer on the timetable." };
    }
    if (session.isBooked) {
      return { ok: false, reason: "You're already booked onto this class." };
    }
    if (session.isPast) {
      return { ok: false, reason: "That class has already started." };
    }
    if (session.isClosed) {
      return {
        ok: false,
        reason:
          "Booking closed " + STUDIO.studio.bookingClosesMin + " minutes before the class. Come down and ask at the desk.",
      };
    }
    if (session.isFull) {
      return { ok: false, reason: "This class is full." };
    }
    if (upcomingCount() >= STUDIO.studio.maxUpcoming) {
      return {
        ok: false,
        reason: "You're holding " + STUDIO.studio.maxUpcoming + " upcoming classes, which is the limit. Cancel one to book another.",
      };
    }

    // Two classes that overlap in time can't both be attended.
    var clash = upcoming().find(function (b) {
      return b.start < session.end && session.start < b.end;
    });
    if (clash) {
      return {
        ok: false,
        reason: "That clashes with " + clash.className + " at " + clash.time + " on the same day.",
      };
    }

    return { ok: true };
  }

  /** Whether a held booking can still be cancelled online. */
  function canCancel(session) {
    if (!session) return { ok: false, reason: "Unknown booking." };
    if (session.isPast) {
      return { ok: false, reason: "This class has already happened." };
    }
    var hoursAway = Schedule.minutesBetween(new Date(), session.start) / 60;
    if (hoursAway < STUDIO.studio.cancelWindowHours) {
      return {
        ok: false,
        reason:
          "Free cancellation closed " +
          STUDIO.studio.cancelWindowHours +
          " hours before the class. Call the studio on " +
          STUDIO.studio.phone +
          " if you can't make it.",
      };
    }
    return { ok: true };
  }

  /* ---------- Mutations ---------- */

  function book(sessionId, memberName) {
    var session = Schedule.sessionById(sessionId, bookedIdSet());
    var verdict = canBook(session);
    if (!verdict.ok) return verdict;

    var list = all();
    list.push({
      sessionId: sessionId,
      memberName: (memberName || "").trim(),
      bookedAt: new Date().toISOString(),
    });

    if (!writeRaw(list)) {
      return { ok: false, reason: "Couldn't save that booking — this browser refused to store it." };
    }
    return { ok: true, session: session };
  }

  function cancel(sessionId) {
    var session = Schedule.sessionById(sessionId, bookedIdSet());
    var verdict = canCancel(session);
    if (!verdict.ok) return verdict;

    var list = all().filter(function (b) {
      return b.sessionId !== sessionId;
    });
    if (!writeRaw(list)) {
      return { ok: false, reason: "Couldn't update your bookings — this browser refused to store them." };
    }
    return { ok: true, session: session };
  }

  function clearAll() {
    writeRaw([]);
  }

  /* ---------- Member name ---------- */

  function memberName() {
    if (!available) return "";
    try {
      return window.localStorage.getItem(MEMBER_KEY) || "";
    } catch (err) {
      return "";
    }
  }

  function setMemberName(name) {
    if (!available) return;
    try {
      window.localStorage.setItem(MEMBER_KEY, (name || "").trim());
    } catch (err) {
      /* Nothing we can do; the booking itself still carries the name. */
    }
  }

  return {
    available: available,
    all: all,
    bookedIdSet: bookedIdSet,
    has: has,
    bookedSessions: bookedSessions,
    upcoming: upcoming,
    past: past,
    upcomingCount: upcomingCount,
    canBook: canBook,
    canCancel: canCancel,
    book: book,
    cancel: cancel,
    clearAll: clearAll,
    memberName: memberName,
    setMemberName: setMemberName,
  };
})();
