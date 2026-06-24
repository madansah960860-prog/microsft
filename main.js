/* ============================================================
   COMSOL — interactions
   Vanilla JS, zero dependencies. Fast, accessible, reduced-motion aware.
   ============================================================ */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Year ---------- */
  var yearEl = document.querySelector("[data-year]");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ---------- Nav: shadow on scroll ---------- */
  var nav = document.querySelector("[data-nav]");
  if (nav) {
    var onScroll = function () {
      if (window.scrollY > 8) nav.setAttribute("data-scrolled", "");
      else nav.removeAttribute("data-scrolled");
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile menu ---------- */
  var toggle = document.querySelector("[data-nav-toggle]");
  var mobile = document.querySelector("[data-nav-mobile]");
  if (toggle && mobile) {
    var setMenu = function (open) {
      toggle.setAttribute("aria-expanded", String(open));
      if (open) {
        mobile.hidden = false;
        mobile.setAttribute("data-open", "");
        toggle.setAttribute("aria-label", "Close menu");
      } else {
        mobile.removeAttribute("data-open");
        toggle.setAttribute("aria-label", "Open menu");
        // allow transition-less hide
        mobile.hidden = true;
      }
    };
    toggle.addEventListener("click", function () {
      setMenu(toggle.getAttribute("aria-expanded") !== "true");
    });
    mobile.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    window.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && toggle.getAttribute("aria-expanded") === "true") {
        setMenu(false); toggle.focus();
      }
    });
  }

  /* ---------- Accordion (KB + FAQ) ---------- */
  document.querySelectorAll("[data-kb-item]").forEach(function (item) {
    var head = item.querySelector(".kb__head");
    if (!head) return;
    head.addEventListener("click", function () {
      var open = item.hasAttribute("data-open");
      if (open) {
        item.removeAttribute("data-open");
        head.setAttribute("aria-expanded", "false");
      } else {
        item.setAttribute("data-open", "");
        head.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- Scroll reveals (content visible by default, enhanced) ---------- */
  var revealEls = document.querySelectorAll("[data-reveal]");
  var revealAll = function () {
    revealEls.forEach(function (el) { el.classList.add("is-in"); });
  };
  if (reduceMotion || !("IntersectionObserver" in window)) {
    revealAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          // stagger siblings sharing a parent group
          var sibs = Array.prototype.slice.call(
            el.parentElement ? el.parentElement.querySelectorAll(":scope > [data-reveal]") : [el]
          );
          var idx = sibs.indexOf(el);
          el.style.transitionDelay = (idx > 0 ? Math.min(idx * 70, 280) : 0) + "ms";
          el.classList.add("is-in");
          io.unobserve(el);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    revealEls.forEach(function (el) { io.observe(el); });

    // Hard safety net: nothing may stay hidden. Headless renderers, hidden
    // tabs, and non-scrolling crawlers never fire IntersectionObserver, so
    // reveal everything outright after a short grace period. Real users who
    // scroll within this window still get the staggered entrance.
    setTimeout(revealAll, 1800);
    document.addEventListener("visibilitychange", function () {
      if (document.visibilityState === "visible") revealAll();
    });
  }

  /* ---------- Contact form -> mailto compose ---------- */
  var form = document.querySelector("[data-form]");
  if (form) {
    var hint = form.querySelector("[data-form-hint]");
    var defaultHint = hint ? hint.textContent : "";
    var topicToInbox = {
      "Windows Fix subscription": "support@inkassist.net",
      "Buying Windows licenses": "licenses@inkassist.net",
      "Selling Windows licenses": "licenses@inkassist.net",
      "Managed / multi-site plan": "hello@inkassist.net",
      "Something else": "hello@inkassist.net"
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) {
        form.reportValidity();
        if (hint) { hint.textContent = "Please complete the required fields."; hint.setAttribute("data-state", "error"); }
        return;
      }

      var data = new FormData(form);
      var name = (data.get("name") || "").toString().trim();
      var company = (data.get("company") || "").toString().trim();
      var email = (data.get("email") || "").toString().trim();
      var topic = (data.get("topic") || "Something else").toString();
      var seats = (data.get("seats") || "").toString().trim();
      var message = (data.get("message") || "").toString().trim();

      var inbox = topicToInbox[topic] || "hello@inkassist.net";
      var subject = "[" + topic + "] enquiry — " + (company || name);

      var lines = [
        "Hello Comsol,",
        "",
        message,
        "",
        "—",
        "Name:    " + name,
        "Company: " + company,
        "Email:   " + email,
        "Topic:   " + topic
      ];
      if (seats) lines.push("Size:    " + seats);
      lines.push("", "Sent from comsol.digital");

      var href = "mailto:" + inbox +
        "?subject=" + encodeURIComponent(subject) +
        "&body=" + encodeURIComponent(lines.join("\n"));

      if (hint) {
        hint.textContent = "Opening your email app to " + inbox + " — press send to finish.";
        hint.setAttribute("data-state", "ok");
      }
      window.location.href = href;

      setTimeout(function () {
        if (hint) { hint.textContent = defaultHint; hint.removeAttribute("data-state"); }
      }, 9000);
    });

    // clear error styling on input
    form.addEventListener("input", function () {
      if (hint && hint.getAttribute("data-state") === "error") {
        hint.textContent = defaultHint; hint.removeAttribute("data-state");
      }
    });
  }

  /* ---------- Hero instrument: live signal trace on canvas ---------- */
  var canvas = document.querySelector("[data-instrument]");
  if (canvas && canvas.getContext) {
    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0, H = 0;

    var COBALT = "oklch(0.66 0.14 242)";
    var COBALT_DIM = "oklch(0.45 0.09 242)";
    var BRASS = "oklch(0.80 0.135 76)";
    var GRID = "oklch(0.30 0.03 235 / 0.6)";

    function resize() {
      var rect = canvas.getBoundingClientRect();
      W = Math.max(rect.width, 1);
      H = Math.max(rect.height, 1);
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();
    var ro = ("ResizeObserver" in window) ? new ResizeObserver(resize) : null;
    if (ro) ro.observe(canvas); else window.addEventListener("resize", resize);

    function drawGrid() {
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 1;
      ctx.strokeStyle = GRID;
      var stepX = W / 12, stepY = H / 9;
      ctx.globalAlpha = 0.5;
      for (var x = stepX; x < W; x += stepX) {
        ctx.beginPath(); ctx.moveTo(Math.round(x) + 0.5, 0); ctx.lineTo(Math.round(x) + 0.5, H); ctx.stroke();
      }
      for (var y = stepY; y < H; y += stepY) {
        ctx.beginPath(); ctx.moveTo(0, Math.round(y) + 0.5); ctx.lineTo(W, Math.round(y) + 0.5); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      // center baseline
      ctx.strokeStyle = COBALT_DIM;
      ctx.globalAlpha = 0.4;
      ctx.beginPath(); ctx.moveTo(0, H / 2 + 0.5); ctx.lineTo(W, H / 2 + 0.5); ctx.stroke();
      ctx.globalAlpha = 1;
    }

    // signal: sum of sines, slowly evolving -> "monitoring" feel
    function signalY(nx, t) {
      var base = H / 2;
      var amp = H * 0.20;
      var v =
        Math.sin(nx * 6.2 + t * 1.1) * 0.55 +
        Math.sin(nx * 12.5 - t * 0.7) * 0.22 +
        Math.sin(nx * 3.1 + t * 0.4) * 0.30 +
        Math.sin(nx * 22.0 + t * 1.8) * 0.08;
      return base - v * amp;
    }

    function drawTrace(t) {
      ctx.lineJoin = "round";
      ctx.lineCap = "round";

      // glow underlay
      ctx.beginPath();
      var steps = 90;
      for (var i = 0; i <= steps; i++) {
        var nx = i / steps;
        var px = nx * W;
        var py = signalY(nx, t);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.strokeStyle = COBALT;
      ctx.globalAlpha = 0.18;
      ctx.lineWidth = 9;
      ctx.stroke();

      // crisp trace
      ctx.globalAlpha = 1;
      ctx.lineWidth = 2;
      ctx.strokeStyle = COBALT;
      ctx.stroke();

      // sweep dot (brass needle endpoint) running across
      var sweep = (t * 0.16) % 1;
      var sx = sweep * W;
      var sy = signalY(sweep, t);
      // vertical scan line
      ctx.globalAlpha = 0.25;
      ctx.strokeStyle = BRASS;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, H); ctx.stroke();
      // dot
      ctx.globalAlpha = 1;
      ctx.fillStyle = BRASS;
      ctx.beginPath(); ctx.arc(sx, sy, 3.4, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 0.25;
      ctx.beginPath(); ctx.arc(sx, sy, 8, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    var running = true;
    var startT = performance.now();

    function frame(now) {
      if (!running) return;
      var t = (now - startT) / 1000;
      drawGrid();
      drawTrace(t);
      requestAnimationFrame(frame);
    }

    function renderStatic() {
      drawGrid();
      drawTrace(2.4); // one pleasant frozen frame
    }

    if (reduceMotion) {
      renderStatic();
    } else {
      // pause when offscreen to save battery
      if ("IntersectionObserver" in window) {
        var visObs = new IntersectionObserver(function (entries) {
          entries.forEach(function (en) {
            if (en.isIntersecting) {
              if (!running) { running = true; requestAnimationFrame(frame); }
            } else {
              running = false;
            }
          });
        }, { threshold: 0.05 });
        visObs.observe(canvas);
      }
      requestAnimationFrame(frame);
    }

    // animated status readouts (subtle, non-distracting)
    var uptimeEl = document.querySelector("[data-instrument-uptime]");
    if (uptimeEl && !reduceMotion) {
      setInterval(function () {
        var v = (99.93 + Math.random() * 0.06).toFixed(2);
        uptimeEl.textContent = "UPTIME " + v + "%";
      }, 3200);
    }
  }
})();
