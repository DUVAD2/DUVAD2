/* Home page: renders the studio's classes, coaches, plans and the next few
 * bookable sessions straight from data.js.
 */
(function () {
  "use strict";

  var esc = UI.escapeHtml;

  function init() {
    UI.initChrome();
    document.getElementById("year").textContent = String(new Date().getFullYear());

    renderStats();
    renderNext();
    renderClasses();
    renderCoaches();
    renderPlans();
    renderVisit();

    var warning = UI.storageWarning();
    if (warning) {
      document.getElementById("hero-lead").insertAdjacentHTML("afterend", warning);
    }
  }

  function renderStats() {
    var weekly = STUDIO.timetable.length;
    var biggest = STUDIO.timetable.reduce(function (max, s) {
      return Math.max(max, s.capacity);
    }, 0);

    var stats = [
      { value: String(weekly), label: "classes a week" },
      { value: String(STUDIO.classes.length), label: "class types" },
      { value: String(biggest), label: "people max" },
      { value: String(STUDIO.coaches.length), label: "coaches" },
    ];

    document.getElementById("hero-stats").innerHTML = stats
      .map(function (s) {
        return (
          '<div class="stat"><div class="stat__value">' +
          esc(s.value) +
          '</div><div class="stat__label">' +
          esc(s.label) +
          "</div></div>"
        );
      })
      .join("");
  }

  function renderNext() {
    var host = document.getElementById("next-sessions");
    var sessions = Schedule.upcomingSessions(4, Store.bookedIdSet());

    if (sessions.length === 0) {
      host.innerHTML =
        '<div class="empty"><h3>Nothing scheduled</h3><p>The timetable is empty right now.</p></div>';
      return;
    }

    host.innerHTML = sessions.map(sessionRow).join("");
    wireBookButtons(host, renderNext);
  }

  function sessionRow(s) {
    var canBook = Store.canBook(s);
    var classes = ["slot"];
    if (s.isBooked) classes.push("slot--booked");
    if (s.isFull && !s.isBooked) classes.push("slot--full");

    // As on the timetable: no dead buttons — the chip already carries the state.
    var action = "";
    if (s.isBooked) {
      action = '<a class="btn btn--quiet btn--sm" href="bookings.html">View booking</a>';
    } else if (canBook.ok) {
      action =
        '<button class="btn btn--sm" type="button" data-book="' + esc(s.id) + '" ' +
        'aria-label="Book ' + esc(s.className) + " on " + esc(Schedule.formatDayLong(s.date)) + " at " + esc(s.time) + '">Book</button>';
    }

    return (
      '<article class="' + classes.join(" ") + '">' +
      '  <div class="slot__time">' + esc(s.time) +
      '    <span class="slot__dur">' + esc(Schedule.DAY_SHORT[s.date.getDay()]) + " " + esc(Schedule.formatDateShort(s.date)) + "</span>" +
      "  </div>" +
      '  <div class="slot__body">' +
      '    <h3 class="slot__name"><span class="slot__key" style="background:' + esc(s.colour) + '"></span>' + esc(s.className) + "</h3>" +
      '    <div class="slot__meta">' +
      "      <span>" + UI.icon("user", 14) + " " + esc(s.coachName) + "</span>" +
      "      <span>" + UI.icon("clock", 14) + " " + esc(s.duration) + " min</span>" +
      "      <span>" + esc(s.intensity) + " intensity</span>" +
      "    </div>" +
      "  </div>" +
      '  <div class="slot__action">' + UI.spacesChip(s) + action + "</div>" +
      "</article>"
    );
  }

  function wireBookButtons(host, rerender) {
    host.querySelectorAll("[data-book]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var session = Schedule.sessionById(btn.getAttribute("data-book"), Store.bookedIdSet());
        var verdict = Store.canBook(session);
        if (!verdict.ok) {
          UI.toast(verdict.reason, "err");
          rerender();
          return;
        }
        UI.openBooking(session, function () {
          UI.refreshNavCount();
          rerender();
        });
      });
    });
  }

  function renderClasses() {
    document.getElementById("class-grid").innerHTML = STUDIO.classes
      .map(function (c) {
        var perWeek = STUDIO.timetable.filter(function (s) {
          return s.classId === c.id;
        }).length;

        return (
          '<article class="card card--link">' +
          '  <div class="card__bar ' + esc(c.key) + '"></div>' +
          "  <h3>" + esc(c.name) + "</h3>" +
          "  <p>" + esc(c.description) + "</p>" +
          '  <div class="card__meta">' +
          '    <span class="chip">' + UI.icon("clock", 14) + " " + esc(c.duration) + " min</span>" +
          '    <span class="chip">' + esc(c.intensity) + " intensity</span>" +
          '    <span class="chip">' + esc(perWeek) + "&times; a week</span>" +
          "  </div>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderCoaches() {
    document.getElementById("coach-grid").innerHTML = STUDIO.coaches
      .map(function (c) {
        var initials = c.name
          .split(" ")
          .map(function (part) {
            return part.charAt(0);
          })
          .join("")
          .slice(0, 2);

        return (
          '<article class="card coach">' +
          '  <div class="coach__ring" aria-hidden="true">' + esc(initials) + "</div>" +
          "  <h3>" + esc(c.name) + "</h3>" +
          '  <p class="coach__role">' + esc(c.role) + "</p>" +
          "  <p>" + esc(c.bio) + "</p>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderPlans() {
    document.getElementById("plan-grid").innerHTML = STUDIO.plans
      .map(function (p) {
        return (
          '<article class="plan' + (p.featured ? " plan--featured" : "") + '">' +
          '  <span class="chip plan__tag' + (p.featured ? " chip--booked" : "") + '">' + esc(p.tag) + "</span>" +
          "  <h3>" + esc(p.name) + "</h3>" +
          '  <p class="plan__price">' + esc(p.price) + " <span>" + esc(p.per) + "</span></p>" +
          "  <ul>" +
          p.perks
            .map(function (perk) {
              return "<li>" + UI.icon("check", 16) + "<span>" + esc(perk) + "</span></li>";
            })
            .join("") +
          "  </ul>" +
          '  <a class="btn' + (p.featured ? "" : " btn--ghost") + '" href="timetable.html">Book a class</a>' +
          "</article>"
        );
      })
      .join("");
  }

  function renderVisit() {
    var s = STUDIO.studio;
    var tiles = [
      { icon: "pin", label: "Address", value: s.address },
      { icon: "phone", label: "Phone", value: s.phone, href: "tel:" + s.phone.replace(/\s/g, "") },
      { icon: "clock", label: "Staffed hours", value: "Mon–Fri 06:00–21:00 · Sat–Sun 08:00–13:00" },
    ];

    document.getElementById("visit-grid").innerHTML = tiles
      .map(function (t) {
        var inner =
          '<div class="coach__role">' + UI.icon(t.icon, 15) + " " + esc(t.label) + "</div>" +
          "<p style=\"margin-top:8px\">" + esc(t.value) + "</p>";
        return t.href
          ? '<a class="card card--link" href="' + esc(t.href) + '">' + inner + "</a>"
          : '<div class="card">' + inner + "</div>";
      })
      .join("");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
