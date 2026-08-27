/* Shared UI helpers: inline SVG icons, toasts, the booking dialog, and the
 * bits of chrome every page shares.
 *
 * Icons are inline SVG (never emoji), and every one that carries no meaning of
 * its own is aria-hidden so screen readers hear the label instead.
 */
window.UI = (function () {
  "use strict";

  /* ---------- Icons ---------- */

  var ICONS = {
    bolt: '<path d="M13 2 4.09 12.6a1 1 0 0 0 .77 1.64H11l-1 8 8.91-10.6a1 1 0 0 0-.77-1.64H12l1-8Z"/>',
    check: '<path d="m20 6-11 11-5-5"/>',
    x: '<path d="M18 6 6 18M6 6l12 12"/>',
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
    users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/>',
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.2a2 2 0 0 1 2.1-.5c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2Z"/>',
    left: '<path d="m15 18-6-6 6-6"/>',
    right: '<path d="m9 18 6-6-6-6"/>',
    alert: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4M12 16h.01"/>',
    ticket: '<path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/><path d="M13 5v14"/>',
    flame: '<path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1 .5-2 .5-2S6 11 6 14a6 6 0 0 0 12 0c0-5-6-12-6-12Z"/>',
  };

  /**
   * An inline SVG icon. Decorative by default: pass a label only when the icon
   * is the sole carrier of meaning.
   */
  function icon(name, size, label) {
    var path = ICONS[name];
    if (!path) return "";
    var s = size || 18;
    var a11y = label
      ? 'role="img" aria-label="' + escapeHtml(label) + '"'
      : 'aria-hidden="true" focusable="false"';
    return (
      '<svg ' + a11y + ' width="' + s + '" height="' + s + '" viewBox="0 0 24 24" fill="none" ' +
      'stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
      path +
      "</svg>"
    );
  }

  /* ---------- Escaping ---------- */

  /** Anything that reaches innerHTML goes through here first. */
  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /* ---------- Toasts ---------- */

  function toastHost() {
    var host = document.querySelector(".toasts");
    if (!host) {
      host = document.createElement("div");
      host.className = "toasts";
      // Announcements, not alerts: they never steal focus.
      host.setAttribute("role", "status");
      host.setAttribute("aria-live", "polite");
      document.body.appendChild(host);
    }
    return host;
  }

  function toast(message, kind) {
    var host = toastHost();
    var el = document.createElement("div");
    el.className = "toast toast--" + (kind === "err" ? "err" : "ok");
    el.innerHTML =
      icon(kind === "err" ? "alert" : "check", 18) + "<span>" + escapeHtml(message) + "</span>";
    host.appendChild(el);

    window.setTimeout(function () {
      el.remove();
    }, kind === "err" ? 6000 : 4000);
  }

  /* ---------- Spaces-left label ---------- */

  /**
   * Availability always says it in words as well as colour — colour alone
   * would leave the state unreadable for anyone who can't distinguish it.
   */
  function spacesChip(session) {
    if (session.isBooked) {
      return '<span class="chip chip--booked">' + icon("check", 14) + "You're in</span>";
    }
    if (session.isPast) {
      return '<span class="chip chip--full">Finished</span>';
    }
    if (session.isFull) {
      return '<span class="chip chip--full">Class full</span>';
    }
    if (session.isClosed) {
      return '<span class="chip chip--full">Booking closed</span>';
    }
    if (session.spacesLeft <= 3) {
      return (
        '<span class="chip chip--warn">' +
        session.spacesLeft +
        (session.spacesLeft === 1 ? " space left" : " spaces left") +
        "</span>"
      );
    }
    return '<span class="chip chip--ok">' + session.spacesLeft + " spaces</span>";
  }

  /* ---------- Booking dialog ---------- */

  var dialogEl = null;
  var pendingSession = null;

  function ensureDialog() {
    if (dialogEl) return dialogEl;

    dialogEl = document.createElement("dialog");
    dialogEl.id = "book-dialog";
    dialogEl.innerHTML =
      '<form method="dialog" class="book-form">' +
      '  <div class="dialog__head">' +
      '    <h2>Book your spot</h2>' +
      '    <p id="book-dialog-sub"></p>' +
      "  </div>" +
      '  <div class="dialog__body">' +
      '    <dl class="dialog__summary" id="book-dialog-summary"></dl>' +
      '    <div class="field">' +
      '      <label for="book-name">Your name</label>' +
      '      <input type="text" id="book-name" name="name" autocomplete="name" ' +
      '             placeholder="So the coach can greet you" />' +
      '      <p class="error" id="book-error" role="alert"></p>' +
      "    </div>" +
      "  </div>" +
      '  <div class="dialog__foot">' +
      '    <button type="button" class="btn btn--ghost" data-close>Cancel</button>' +
      '    <button type="button" class="btn" data-confirm>Confirm</button>' +
      "  </div>" +
      "</form>";

    document.body.appendChild(dialogEl);

    dialogEl.querySelector("[data-close]").addEventListener("click", function () {
      closeDialog();
    });
    dialogEl.querySelector("[data-confirm]").addEventListener("click", function () {
      confirmDialog();
    });
    // Enter in the name field should confirm, not silently close the dialog.
    dialogEl.querySelector("#book-name").addEventListener("keydown", function (e) {
      if (e.key === "Enter") {
        e.preventDefault();
        confirmDialog();
      }
    });

    return dialogEl;
  }

  var onBooked = null;

  function openBooking(session, done) {
    var el = ensureDialog();
    pendingSession = session;
    onBooked = done;

    el.querySelector("#book-dialog-sub").textContent =
      session.className + " with " + session.coachName + ".";

    el.querySelector("#book-dialog-summary").innerHTML =
      row("When", Schedule.formatDayLong(session.date) + " " + Schedule.formatDateShort(session.date)) +
      row("Time", session.time + " – " + endTime(session)) +
      row("Length", session.duration + " minutes") +
      row("Spaces left", String(session.spacesLeft));

    var nameInput = el.querySelector("#book-name");
    nameInput.value = Store.memberName();
    el.querySelector("#book-error").textContent = "";

    if (typeof el.showModal === "function") {
      el.showModal();
    } else {
      // Very old browsers: fall back to booking without the confirm step.
      confirmDialog();
      return;
    }
    nameInput.focus();
  }

  function row(label, value) {
    return "<div><dt>" + escapeHtml(label) + "</dt><dd>" + escapeHtml(value) + "</dd></div>";
  }

  function endTime(session) {
    var h = String(session.end.getHours()).padStart(2, "0");
    var m = String(session.end.getMinutes()).padStart(2, "0");
    return h + ":" + m;
  }

  function closeDialog() {
    if (dialogEl && dialogEl.open) dialogEl.close();
    pendingSession = null;
  }

  function confirmDialog() {
    if (!pendingSession) return;

    var el = ensureDialog();
    var nameInput = el.querySelector("#book-name");
    var errorEl = el.querySelector("#book-error");
    var name = nameInput.value.trim();

    if (!name) {
      errorEl.textContent = "Please add a name so the coach knows who to expect.";
      nameInput.focus();
      return;
    }

    var result = Store.book(pendingSession.id, name);
    if (!result.ok) {
      // The rule may have changed since the dialog opened (class filled up,
      // booking window closed) — say so in place rather than failing silently.
      errorEl.textContent = result.reason;
      return;
    }

    Store.setMemberName(name);
    var booked = pendingSession;
    closeDialog();
    toast("Booked — " + booked.className + " on " + Schedule.formatDayLong(booked.date) + " at " + booked.time + ".", "ok");
    if (onBooked) onBooked(booked);
  }

  /* ---------- Chrome ---------- */

  /** Marks the current page in the nav and keeps the booking count fresh. */
  function initChrome() {
    var here = document.body.getAttribute("data-page");
    document.querySelectorAll(".nav a[data-nav]").forEach(function (a) {
      if (a.getAttribute("data-nav") === here) {
        a.setAttribute("aria-current", "page");
      }
    });
    refreshNavCount();
  }

  function refreshNavCount() {
    var count = Store.upcomingCount();
    document.querySelectorAll("[data-booking-count]").forEach(function (el) {
      if (count > 0) {
        el.textContent = String(count);
        el.hidden = false;
      } else {
        el.hidden = true;
      }
    });
  }

  /** A one-line warning when the browser refuses to persist anything. */
  function storageWarning() {
    if (Store.available) return "";
    return (
      '<p class="note" role="status">' +
      icon("alert", 15) +
      " This browser is blocking local storage, so bookings won't be remembered. " +
      "Private windows and blocked cookies usually cause this.</p>"
    );
  }

  return {
    icon: icon,
    escapeHtml: escapeHtml,
    toast: toast,
    spacesChip: spacesChip,
    openBooking: openBooking,
    endTime: endTime,
    initChrome: initChrome,
    refreshNavCount: refreshNavCount,
    storageWarning: storageWarning,
  };
})();
