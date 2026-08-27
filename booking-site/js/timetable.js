/* Timetable page: week navigation, filters, and booking.
 *
 * The week being viewed is held in the URL (?week=YYYY-MM-DD) so a particular
 * week can be linked, bookmarked and reached with the back button.
 */
(function () {
  "use strict";

  var esc = UI.escapeHtml;

  var state = {
    monday: Schedule.startOfWeek(new Date()),
    classId: "",
    coachId: "",
    timeOfDay: "",
    availability: "",
  };

  /* ---------- Boot ---------- */

  function init() {
    UI.initChrome();
    document.getElementById("year").textContent = String(new Date().getFullYear());
    document.getElementById("storage-warning").innerHTML = UI.storageWarning();

    populateFilters();
    readUrl();
    bindControls();
    render();
  }

  function populateFilters() {
    var classSel = document.getElementById("f-class");
    STUDIO.classes.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      classSel.appendChild(opt);
    });

    var coachSel = document.getElementById("f-coach");
    STUDIO.coaches.forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      coachSel.appendChild(opt);
    });
  }

  /* ---------- URL <-> state ---------- */

  function readUrl() {
    var params = new URLSearchParams(window.location.search);

    var week = params.get("week");
    if (week && /^\d{4}-\d{2}-\d{2}$/.test(week)) {
      var parts = week.split("-");
      var d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
      if (!isNaN(d.getTime())) state.monday = Schedule.startOfWeek(d);
    }

    state.classId = params.get("class") || "";
    state.coachId = params.get("coach") || "";
    state.timeOfDay = params.get("time") || "";
    state.availability = params.get("avail") || "";

    document.getElementById("f-class").value = state.classId;
    document.getElementById("f-coach").value = state.coachId;
    document.getElementById("f-time").value = state.timeOfDay;
    document.getElementById("f-avail").value = state.availability;
  }

  function writeUrl() {
    var params = new URLSearchParams();
    params.set("week", Schedule.isoDate(state.monday));
    if (state.classId) params.set("class", state.classId);
    if (state.coachId) params.set("coach", state.coachId);
    if (state.timeOfDay) params.set("time", state.timeOfDay);
    if (state.availability) params.set("avail", state.availability);

    var url = window.location.pathname + "?" + params.toString();
    try {
      window.history.replaceState(null, "", url);
    } catch (err) {
      /* file:// disallows history rewriting — harmless, filters still work. */
    }
  }

  /* ---------- Controls ---------- */

  function bindControls() {
    document.getElementById("week-prev").addEventListener("click", function () {
      shiftWeek(-7);
    });
    document.getElementById("week-next").addEventListener("click", function () {
      shiftWeek(7);
    });
    document.getElementById("week-today").addEventListener("click", function () {
      state.monday = Schedule.startOfWeek(new Date());
      render();
    });

    bindFilter("f-class", "classId");
    bindFilter("f-coach", "coachId");
    bindFilter("f-time", "timeOfDay");
    bindFilter("f-avail", "availability");

    document.getElementById("f-reset").addEventListener("click", function () {
      state.classId = state.coachId = state.timeOfDay = state.availability = "";
      ["f-class", "f-coach", "f-time", "f-avail"].forEach(function (id) {
        document.getElementById(id).value = "";
      });
      render();
    });
  }

  function bindFilter(elementId, key) {
    document.getElementById(elementId).addEventListener("change", function (e) {
      state[key] = e.target.value;
      render();
    });
  }

  function shiftWeek(days) {
    var target = Schedule.addDays(state.monday, days);
    var thisWeek = Schedule.startOfWeek(new Date());
    // There is nothing to book in the past, so don't navigate there.
    if (target < thisWeek) {
      UI.toast("That week has already been and gone.", "err");
      return;
    }
    state.monday = target;
    render();
  }

  /* ---------- Filtering ---------- */

  function matches(session) {
    if (state.classId && session.classId !== state.classId) return false;
    if (state.coachId && session.coachId !== state.coachId) return false;

    if (state.timeOfDay) {
      var hour = Number(session.time.split(":")[0]);
      if (state.timeOfDay === "morning" && hour >= 12) return false;
      if (state.timeOfDay === "afternoon" && (hour < 12 || hour >= 17)) return false;
      if (state.timeOfDay === "evening" && hour < 17) return false;
    }

    if (state.availability === "open") {
      if (session.isFull || session.isPast || session.isClosed) return false;
    }

    return true;
  }

  /* ---------- Render ---------- */

  function render() {
    writeUrl();

    var thisWeek = Schedule.startOfWeek(new Date());
    var isCurrent = Schedule.isoDate(state.monday) === Schedule.isoDate(thisWeek);

    document.getElementById("week-range").textContent =
      (isCurrent ? "This week · " : "") + Schedule.formatRange(state.monday);
    document.getElementById("week-prev").disabled = state.monday <= thisWeek;

    var booked = Store.bookedIdSet();
    var sessions = Schedule.sessionsForWeek(state.monday, booked).filter(matches);

    document.getElementById("results-live").textContent =
      sessions.length + (sessions.length === 1 ? " class" : " classes") + " shown for " + Schedule.formatRange(state.monday);

    var host = document.getElementById("week");

    if (sessions.length === 0) {
      host.innerHTML =
        '<div class="empty">' +
        "<h3>Nothing matches</h3>" +
        "<p>No classes this week fit those filters. Try widening them or looking at another week.</p>" +
        "</div>";
      return;
    }

    // Group into days, keeping the days in order.
    var days = [];
    var byIso = {};
    sessions.forEach(function (s) {
      if (!byIso[s.dateIso]) {
        byIso[s.dateIso] = { date: s.date, iso: s.dateIso, sessions: [] };
        days.push(byIso[s.dateIso]);
      }
      byIso[s.dateIso].sessions.push(s);
    });

    var today = new Date();
    host.innerHTML = days
      .map(function (day) {
        var isToday = Schedule.sameDay(day.date, today);
        var openCount = day.sessions.filter(function (s) {
          return !s.isFull && !s.isPast && !s.isClosed;
        }).length;

        return (
          '<section class="day' + (isToday ? " day--today" : "") + '">' +
          '  <header class="day__head">' +
          '    <h3 class="day__name">' + esc(Schedule.formatDayLong(day.date)) + (isToday ? " · Today" : "") + "</h3>" +
          '    <span class="day__date">' + esc(Schedule.formatDateShort(day.date)) + "</span>" +
          '    <span class="day__badge">' + esc(openCount) + " bookable</span>" +
          "  </header>" +
          '  <div class="slots">' + day.sessions.map(slotMarkup).join("") + "</div>" +
          "</section>"
        );
      })
      .join("");

    wireButtons(host);
  }

  function slotMarkup(s) {
    var verdict = Store.canBook(s);

    var classes = ["slot"];
    if (s.isBooked) classes.push("slot--booked");
    else if (s.isPast || s.isClosed) classes.push("slot--past");
    else if (s.isFull) classes.push("slot--full");

    // Only render a button when there is something to press. A finished or
    // full class already says so in its chip; a dead button beside it just
    // repeats the word and invites a click that can't work.
    var action = "";
    if (s.isBooked) {
      action =
        '<button class="btn btn--danger btn--sm" type="button" data-cancel="' + esc(s.id) + '" ' +
        'aria-label="Cancel ' + esc(s.className) + " on " + esc(Schedule.formatDayLong(s.date)) + " at " + esc(s.time) + '">Cancel</button>';
    } else if (verdict.ok) {
      action =
        '<button class="btn btn--sm" type="button" data-book="' + esc(s.id) + '" ' +
        'aria-label="Book ' + esc(s.className) + " on " + esc(Schedule.formatDayLong(s.date)) + " at " + esc(s.time) + '">Book</button>';
    }

    return (
      '<article class="' + classes.join(" ") + '">' +
      '  <div class="slot__time">' + esc(s.time) +
      '    <span class="slot__dur">' + esc(s.duration) + " min</span>" +
      "  </div>" +
      '  <div class="slot__body">' +
      '    <h4 class="slot__name"><span class="slot__key" style="background:' + esc(s.colour) + '"></span>' + esc(s.className) + "</h4>" +
      '    <div class="slot__meta">' +
      "      <span>" + UI.icon("user", 14) + " " + esc(s.coachName) + "</span>" +
      "      <span>" + esc(s.intensity) + " intensity</span>" +
      "      <span>" + UI.icon("users", 14) + " " + esc(s.capacity) + " max</span>" +
      "    </div>" +
      "  </div>" +
      '  <div class="slot__action">' + UI.spacesChip(s) + action + "</div>" +
      "</article>"
    );
  }

  function wireButtons(host) {
    host.querySelectorAll("[data-book]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var session = Schedule.sessionById(btn.getAttribute("data-book"), Store.bookedIdSet());
        var verdict = Store.canBook(session);
        if (!verdict.ok) {
          UI.toast(verdict.reason, "err");
          render();
          return;
        }
        UI.openBooking(session, function () {
          UI.refreshNavCount();
          render();
        });
      });
    });

    host.querySelectorAll("[data-cancel]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var id = btn.getAttribute("data-cancel");
        var result = Store.cancel(id);
        if (!result.ok) {
          UI.toast(result.reason, "err");
          return;
        }
        UI.toast("Cancelled " + result.session.className + " on " + Schedule.formatDayLong(result.session.date) + ".", "ok");
        UI.refreshNavCount();
        render();
      });
    });
  }

  document.addEventListener("DOMContentLoaded", init);
})();
