/* Pulse Studio — studio configuration.
 *
 * Everything the studio owner would realistically change lives here: the
 * classes, the coaches, the weekly timetable and the membership plans.
 * Edit this file and the whole site follows.
 *
 * Classic script (no ES modules) so the site works when index.html is opened
 * straight from disk, with no server and no build step.
 */
window.STUDIO = (function () {
  "use strict";

  var studio = {
    name: "Pulse Studio",
    tagline: "Strength, sweat and a room full of people doing it with you.",
    address: "14 Mill Lane, Manchester M4 1HN",
    phone: "0161 496 0117",
    email: "hello@pulsestudio.example",
    /** Bookings close this many minutes before a class starts. */
    bookingClosesMin: 15,
    /** Free cancellation up to this many hours before the class. */
    cancelWindowHours: 4,
    /** A member may hold at most this many upcoming bookings at once. */
    maxUpcoming: 8,
  };

  /* ---------- Class types ---------- */
  var classes = [
    {
      id: "hiit",
      name: "HIIT 45",
      key: "k-hiit",
      colour: "#f97316",
      duration: 45,
      intensity: "High",
      description:
        "Forty-five minutes of intervals on the bike, rower and floor. Short efforts, short rests, nowhere to hide.",
    },
    {
      id: "strength",
      name: "Strength Club",
      key: "k-strength",
      colour: "#eab308",
      duration: 60,
      intensity: "High",
      description:
        "Barbell work in small groups. Squat, hinge, press and pull, coached properly and loaded to your level.",
    },
    {
      id: "spin",
      name: "Ride",
      key: "k-spin",
      colour: "#38bdf8",
      duration: 45,
      intensity: "High",
      description:
        "Lights down, music up, 45 minutes on the bike. Climbs, sprints and a finish line you'll feel.",
    },
    {
      id: "yoga",
      name: "Yoga Flow",
      key: "k-yoga",
      colour: "#a78bfa",
      duration: 60,
      intensity: "Low",
      description:
        "A warm, steady vinyasa. Breath first, shapes second. Suitable if you have never done a class before.",
    },
    {
      id: "boxing",
      name: "Boxing Fundamentals",
      key: "k-boxing",
      colour: "#f43f5e",
      duration: 50,
      intensity: "Medium",
      description:
        "Stance, footwork and combinations on the pads and bags. Technique-led, no sparring, wraps provided.",
    },
    {
      id: "pilates",
      name: "Reformer Pilates",
      key: "k-pilates",
      colour: "#2dd4bf",
      duration: 50,
      intensity: "Medium",
      description:
        "Small group reformer work for control and core strength. Six beds, so it books out fast.",
    },
    {
      id: "mobility",
      name: "Mobility & Recovery",
      key: "k-mobility",
      colour: "#94a3b8",
      duration: 40,
      intensity: "Low",
      description:
        "Loaded stretching, breathing and soft tissue work. The session that keeps the other six going.",
    },
  ];

  /* ---------- Coaches ---------- */
  var coaches = [
    { id: "mara", name: "Mara Okafor", role: "Head Coach", bio: "Strength and conditioning, 12 years. Believes everyone should be able to pick up their own suitcase." },
    { id: "tom", name: "Tom Reilly", role: "Conditioning", bio: "Ex-rower. Runs the hardest intervals on the timetable and apologises for none of it." },
    { id: "sana", name: "Sana Iqbal", role: "Yoga & Mobility", bio: "Trained in Mysore and Leeds. Teaches breath before shape, always." },
    { id: "dee", name: "Dee Lawson", role: "Boxing", bio: "Amateur champion turned coach. Obsessive about footwork and grip." },
  ];

  /* ---------- Weekly timetable ----------
   * day: 1 = Monday … 0 = Sunday, matching Date.getDay().
   */
  var timetable = [
    // Monday
    { day: 1, time: "06:30", classId: "hiit", coachId: "tom", capacity: 18 },
    { day: 1, time: "09:30", classId: "pilates", coachId: "sana", capacity: 6 },
    { day: 1, time: "12:15", classId: "hiit", coachId: "tom", capacity: 18 },
    { day: 1, time: "17:30", classId: "strength", coachId: "mara", capacity: 12 },
    { day: 1, time: "18:45", classId: "spin", coachId: "tom", capacity: 22 },
    { day: 1, time: "20:00", classId: "yoga", coachId: "sana", capacity: 20 },
    // Tuesday
    { day: 2, time: "06:30", classId: "spin", coachId: "tom", capacity: 22 },
    { day: 2, time: "09:30", classId: "yoga", coachId: "sana", capacity: 20 },
    { day: 2, time: "12:15", classId: "boxing", coachId: "dee", capacity: 16 },
    { day: 2, time: "17:30", classId: "boxing", coachId: "dee", capacity: 16 },
    { day: 2, time: "18:45", classId: "strength", coachId: "mara", capacity: 12 },
    { day: 2, time: "20:00", classId: "mobility", coachId: "sana", capacity: 20 },
    // Wednesday
    { day: 3, time: "06:30", classId: "hiit", coachId: "tom", capacity: 18 },
    { day: 3, time: "09:30", classId: "pilates", coachId: "sana", capacity: 6 },
    { day: 3, time: "12:15", classId: "spin", coachId: "tom", capacity: 22 },
    { day: 3, time: "17:30", classId: "spin", coachId: "tom", capacity: 22 },
    { day: 3, time: "18:45", classId: "strength", coachId: "mara", capacity: 12 },
    { day: 3, time: "20:00", classId: "yoga", coachId: "sana", capacity: 20 },
    // Thursday
    { day: 4, time: "06:30", classId: "strength", coachId: "mara", capacity: 12 },
    { day: 4, time: "09:30", classId: "mobility", coachId: "sana", capacity: 20 },
    { day: 4, time: "12:15", classId: "hiit", coachId: "tom", capacity: 18 },
    { day: 4, time: "17:30", classId: "boxing", coachId: "dee", capacity: 16 },
    { day: 4, time: "18:45", classId: "pilates", coachId: "sana", capacity: 6 },
    { day: 4, time: "20:00", classId: "hiit", coachId: "tom", capacity: 18 },
    // Friday
    { day: 5, time: "06:30", classId: "spin", coachId: "tom", capacity: 22 },
    { day: 5, time: "09:30", classId: "yoga", coachId: "sana", capacity: 20 },
    { day: 5, time: "12:15", classId: "strength", coachId: "mara", capacity: 12 },
    { day: 5, time: "17:30", classId: "hiit", coachId: "tom", capacity: 18 },
    { day: 5, time: "18:45", classId: "boxing", coachId: "dee", capacity: 16 },
    // Saturday
    { day: 6, time: "08:00", classId: "strength", coachId: "mara", capacity: 12 },
    { day: 6, time: "09:15", classId: "hiit", coachId: "tom", capacity: 18 },
    { day: 6, time: "10:30", classId: "spin", coachId: "tom", capacity: 22 },
    { day: 6, time: "11:45", classId: "yoga", coachId: "sana", capacity: 20 },
    // Sunday
    { day: 0, time: "09:00", classId: "yoga", coachId: "sana", capacity: 20 },
    { day: 0, time: "10:15", classId: "pilates", coachId: "sana", capacity: 6 },
    { day: 0, time: "11:30", classId: "mobility", coachId: "sana", capacity: 20 },
  ];

  /* ---------- Membership plans ---------- */
  var plans = [
    {
      id: "drop-in",
      name: "Drop-in",
      price: "£14",
      per: "per class",
      featured: false,
      tag: "No commitment",
      perks: ["Any single class", "Book up to 2 weeks ahead", "Mat and gloves included", "No joining fee"],
    },
    {
      id: "four",
      name: "Four a month",
      price: "£46",
      per: "per month",
      featured: true,
      tag: "Most popular",
      perks: [
        "Four classes every month",
        "Unused classes roll over one month",
        "Priority booking 14 days ahead",
        "Free mobility workshops",
        "Cancel any time",
      ],
    },
    {
      id: "unlimited",
      name: "Unlimited",
      price: "£89",
      per: "per month",
      featured: false,
      tag: "Best value",
      perks: [
        "Every class, every day",
        "Bring a friend once a month",
        "Priority booking 21 days ahead",
        "Two guest passes a quarter",
        "Cancel any time",
      ],
    },
  ];

  /* ---------- Lookups ---------- */
  var classById = {};
  classes.forEach(function (c) {
    classById[c.id] = c;
  });

  var coachById = {};
  coaches.forEach(function (c) {
    coachById[c.id] = c;
  });

  return {
    studio: studio,
    classes: classes,
    coaches: coaches,
    timetable: timetable,
    plans: plans,
    getClass: function (id) {
      return classById[id];
    },
    getCoach: function (id) {
      return coachById[id];
    },
  };
})();
