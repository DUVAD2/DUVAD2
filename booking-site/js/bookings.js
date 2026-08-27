/* "My bookings": what's coming up, what's been and gone, and cancelling. */
(function () {
  "use strict";

  var esc = UI.escapeHtml;

  function init() {
    UI.initChrome();
    document.getElementById("year").textContent = String(new Date().getFullYear());
    document.getElementById("storage-warning").innerHTML = UI.storageWarning();

    document.getElementById("clear-history").addEventListener("click", onClearHistory);
    render();
  }

  function render() {
    var upcoming = Store.upcoming();
    var past = Store.past();

    renderStats(upcoming, past);
    renderUpcoming(upcoming);
    renderHistory(past);
    UI.refreshNavCount();
  }

  /* ---------- Stats ---------- */

  function renderStats(upcoming, past) {
    var thisWeekMonday = Schedule.startOfWeek(new Date());
    var nextMonday = Schedule.addDays(thisWeekMonday, 7);

    var thisWeek = upcoming.filter(function (s) {
      return s.start >= thisWeekMonday && s.start < nextMonday;
    }).length;

    var minutes = past.reduce(function (total, s) {
      return total + s.duration;
    }, 0);

    var next = upcoming[0];

    var stats = [
      { value: String(upcoming.length), label: "classes booked" },
      { value: String(thisWeek), label: "this week" },
      { value: String(past.length), label: "classes done" },
      { value: Math.round(minutes / 60) + "h", label: "time trained" },
    ];

    if (next) {
      stats.unshift({
        value: next.time,
        label: Schedule.DAY_SHORT[next.date.getDay()] + " · " + next.className,
      });
    }

    document.getElementById("booking-stats").innerHTML = stats
      .map(function (s) {
        return (
          '<div class="stat"><div class="stat__value">' + esc(s.value) +
          '</div><div class="stat__label">' + esc(s.label) + "</div></div>"
        );
      })
      .join("");
  }

  /* ---------- Upcoming ---------- */

  function renderUpcoming(list) {
    var host = document.getElementById("upcoming");

    if (list.length === 0) {
      host.innerHTML =
        '<div class="empty">' +
        "<h3>Nothing booked yet</h3>" +
        "<p>Pick a class from the timetable and you'll see it here.</p>" +
        '<p style="margin-top:18px"><a class="btn" href="timetable.html">Browse the timetable</a></p>' +
        "</div>";
      return;
    }

    host.innerHTML = list.map(bookingMarkup).join("");

    host.querySelectorAll("[data-cancel]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var result = Store.cancel(btn.getAttribute("data-cancel"));
        if (!result.ok) {
          UI.toast(result.reason, "err");
          return;
        }
        UI.toast(
          "Cancelled " + result.session.className + " on " + Schedule.formatDayLong(result.session.date) + ".",
          "ok",
        );
        render();
      });
    });
  }

  function bookingMarkup(s) {
    var verdict = Store.canCancel(s);
    var hoursAway = Schedule.minutesBetween(new Date(), s.start) / 60;

    var action = verdict.ok
      ? '<button class="btn btn--danger btn--sm" type="button" data-cancel="' + esc(s.id) + '" ' +
        'aria-label="Cancel ' + esc(s.className) + " on " + esc(Schedule.formatDayLong(s.date)) + '">Cancel</button>'
      : '<span class="chip chip--warn">Call to cancel</span>';

    return (
      '<article class="booking">' +
      '  <div class="booking__date">' +
      '    <div class="booking__dow">' + esc(Schedule.DAY_SHORT[s.date.getDay()]) + "</div>" +
      '    <div class="booking__day">' + esc(s.date.getDate()) + "</div>" +
      "  </div>" +
      '  <div class="slot__body">' +
      '    <h4 class="slot__name"><span class="slot__key" style="background:' + esc(s.colour) + '"></span>' + esc(s.className) + "</h4>" +
      '    <div class="slot__meta">' +
      "      <span>" + UI.icon("clock", 14) + " " + esc(s.time) + "–" + esc(UI.endTime(s)) + "</span>" +
      "      <span>" + UI.icon("user", 14) + " " + esc(s.coachName) + "</span>" +
      (s.memberName ? "      <span>Booked for " + esc(s.memberName) + "</span>" : "") +
      "    </div>" +
      (hoursAway < 24 && hoursAway > 0
        ? '    <p class="note">' + UI.icon("alert", 14) + " In " + describeHours(hoursAway) + ".</p>"
        : "") +
      "  </div>" +
      '  <div class="booking__actions slot__action">' + action + "</div>" +
      "</article>"
    );
  }

  function describeHours(hours) {
    if (hours < 1) {
      var mins = Math.max(1, Math.round(hours * 60));
      return mins + (mins === 1 ? " minute" : " minutes");
    }
    var whole = Math.round(hours);
    return whole + (whole === 1 ? " hour" : " hours");
  }

  /* ---------- History ---------- */

  function renderHistory(list) {
    var section = document.getElementById("history-section");
    var host = document.getElementById("history");

    if (list.length === 0) {
      section.hidden = true;
      host.innerHTML = "";
      return;
    }

    section.hidden = false;
    host.innerHTML = list
      .map(function (s) {
        return (
          '<article class="booking booking--past">' +
          '  <div class="booking__date">' +
          '    <div class="booking__dow">' + esc(Schedule.DAY_SHORT[s.date.getDay()]) + "</div>" +
          '    <div class="booking__day">' + esc(s.date.getDate()) + "</div>" +
          "  </div>" +
          '  <div class="slot__body">' +
          '    <h4 class="slot__name"><span class="slot__key" style="background:' + esc(s.colour) + '"></span>' + esc(s.className) + "</h4>" +
          '    <div class="slot__meta">' +
          "      <span>" + esc(Schedule.formatDateShort(s.date)) + " · " + esc(s.time) + "</span>" +
          "      <span>" + UI.icon("user", 14) + " " + esc(s.coachName) + "</span>" +
          "      <span>" + esc(s.duration) + " min</span>" +
          "    </div>" +
          "  </div>" +
          '  <div class="booking__actions slot__action"><span class="chip">Attended</span></div>' +
          "</article>"
        );
      })
      .join("");
  }

  function onClearHistory() {
    var past = Store.past();
    if (past.length === 0) return;

    var ok = window.confirm(
      "Remove " + past.length + " past " + (past.length === 1 ? "booking" : "bookings") +
        " from this browser? Your upcoming classes are kept.",
    );
    if (!ok) return;

    // Keep everything still in the future; drop the rest.
    var keep = {};
    Store.upcoming().forEach(function (s) {
      keep[s.id] = true;
    });

    var remaining = Store.all().filter(function (b) {
      return keep[b.sessionId];
    });

    Store.clearAll();
    remaining.forEach(function (b) {
      Store.book(b.sessionId, b.memberName);
    });

    UI.toast("Booking history cleared.", "ok");
    render();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
