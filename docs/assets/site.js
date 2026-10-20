/* The Morales Group site script. No libraries, no build step needed to run. */
(function () {
  "use strict";

  /* ---- Settings you may change ---------------------------------------- */
  var CONFIG = {
    // Paste a Formspree form ID (the part after formspree.io/f/) to have the
    // contact form email you directly. Left empty, the form opens the
    // visitor's email app with the message filled in instead.
    formspreeId: "",
    email: "RaulMorales@KW.com",
    phone: "(856) 264-0332"
  };

  // Average effective property tax by county, % of value per year.
  // Approximate county averages; a given town can differ a lot.
  var COUNTIES = {
    camden:       { name: "Camden County, NJ",       tax: 3.10 },
    burlington:   { name: "Burlington County, NJ",   tax: 2.65 },
    gloucester:   { name: "Gloucester County, NJ",   tax: 3.00 },
    mercer:       { name: "Mercer County, NJ",       tax: 2.60 },
    philadelphia: { name: "Philadelphia County, PA", tax: 1.00 }
  };
  var NATIONAL_TAX = 1.1;

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---- Analytics, only after the visitor accepts ---------------------------
     Google's script is not requested and no cookies are set until Accept. */
  var CONSENT_KEY = "tmg-cookies";
  var gaMeta = $('meta[name="ga-id"]');
  var gaId = gaMeta ? gaMeta.getAttribute("content") : "";
  var store = {
    get: function () { try { return window.localStorage.getItem(CONSENT_KEY); } catch (e) { return null; } },
    set: function (v) { try { window.localStorage.setItem(CONSENT_KEY, v); } catch (e) {} }
  };
  function loadAnalytics() {
    if (!gaId || window.__gaLoaded) return;
    window.__gaLoaded = true;
    window["ga-disable-" + gaId] = false;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("consent", "default", { analytics_storage: "granted", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
    window.gtag("js", new Date());
    window.gtag("config", gaId);
    var s = document.createElement("script");
    s.async = true;
    s.src = "https://www.googletagmanager.com/gtag/js?id=" + gaId;
    document.head.appendChild(s);
  }
  function stopAnalytics() {
    if (gaId) window["ga-disable-" + gaId] = true;
    // Remove any Google Analytics cookies set by an earlier Accept.
    var host = location.hostname.split("."), domains = [""];
    for (var i = 0; i < host.length - 1; i++) domains.push("; domain=." + host.slice(i).join("."));
    document.cookie.split(";").forEach(function (c) {
      var name = c.split("=")[0].trim();
      if (/^_ga/.test(name)) domains.forEach(function (d) { document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/" + d; });
    });
  }
  var banner = $("#cookie");
  var choice = store.get();
  if (choice === "yes") loadAnalytics();
  else if (choice !== "no" && banner && gaId) banner.hidden = false;
  if (banner) {
    $("#cookie-yes").addEventListener("click", function () { store.set("yes"); banner.hidden = true; loadAnalytics(); });
    $("#cookie-no").addEventListener("click", function () { store.set("no"); banner.hidden = true; stopAnalytics(); });
    $$("[data-cookie-open]").forEach(function (a) {
      a.addEventListener("click", function (e) { e.preventDefault(); banner.hidden = false; $("#cookie-yes").focus(); });
    });
  }

  /* ---- Mobile menu closes after a pick ------------------------------------ */
  $$(".menu a").forEach(function (a) {
    a.addEventListener("click", function () { a.closest("details").open = false; });
  });

  /* ---- Footer year -------------------------------------------------------- */
  $$("[data-year]").forEach(function (el) { el.textContent = new Date().getFullYear(); });

  /* ---- Count-up numbers ---------------------------------------------------- */
  var counters = $$("[data-count]");
  if (counters.length && !calm && "IntersectionObserver" in window) {
    var countUp = function (el) {
      var target = parseFloat(el.getAttribute("data-count")), dec = +(el.getAttribute("data-dec") || 0), t0 = null;
      var frame = function (t) {
        if (t0 === null) t0 = t;
        var k = Math.min(1, (t - t0) / 1400), e = 1 - Math.pow(1 - k, 3);
        el.textContent = (target * e).toFixed(dec);
        if (k < 1) requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    };
    var cio = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { countUp(en.target); cio.unobserve(en.target); } });
    }, { threshold: 0.6 });
    counters.forEach(function (el) { cio.observe(el); });
  }

  /* ---- Video: load YouTube only when asked ---------------------------------- */
  $$(".video-play[data-yt]").forEach(function (btn) {
    btn.addEventListener("click", function (e) {
      var frame = btn.parentNode, ifr = document.createElement("iframe");
      ifr.src = "https://www.youtube-nocookie.com/embed/" + btn.getAttribute("data-yt") + "?autoplay=1&rel=0";
      ifr.title = btn.getAttribute("aria-label") || "Video";
      ifr.allow = "accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture";
      ifr.allowFullscreen = true;
      e.preventDefault();
      frame.innerHTML = "";
      frame.appendChild(ifr);
    });
  });

  /* ---- Money helpers ------------------------------------------------------- */
  function num(id) { var el = document.getElementById(id); return el ? (+el.value || 0) : 0; }
  function money(v) { return (v < 0 ? "-$" : "$") + Math.round(Math.abs(v)).toLocaleString("en-US"); }
  function pct(v) { return (v * 100).toFixed(2) + "%"; }
  function set(id, txt) { var el = document.getElementById(id); if (el) el.textContent = txt; }
  function payment(loan, ratePct, years) {
    var n = years * 12;
    if (n <= 0) return 0;
    if (ratePct <= 0) return loan / n;
    var i = ratePct / 100 / 12;
    return loan * i / (1 - Math.pow(1 + i, -n));
  }
  function fillCounties(sel, taxInput, onChange) {
    Object.keys(COUNTIES).forEach(function (key) {
      var o = document.createElement("option");
      o.value = key; o.textContent = COUNTIES[key].name;
      sel.appendChild(o);
    });
    sel.value = sel.getAttribute("data-default") || "burlington";
    taxInput.value = COUNTIES[sel.value].tax.toFixed(2);
    sel.addEventListener("change", function () { taxInput.value = COUNTIES[sel.value].tax.toFixed(2); onChange(); });
  }

  /* ---- Buyers: real monthly payment ----------------------------------------- */
  var pay = $("#pay");
  if (pay) {
    var runPay = function () {
      var price = num("p-price"), down = num("p-down") / 100, loan = price * (1 - down);
      var pi = payment(loan, num("p-rate"), num("p-term"));
      var tax = price * num("p-tax") / 100 / 12;
      var ins = num("p-ins") / 12;
      var pmi = down < 0.2 ? loan * num("p-pmi") / 100 / 12 : 0;
      var total = pi + tax + ins + pmi;
      var naive = pi + price * NATIONAL_TAX / 100 / 12 + ins + pmi;
      set("p-total", money(total));
      set("p-pi", money(pi)); set("p-taxm", money(tax)); set("p-insm", money(ins)); set("p-pmim", money(pmi));
      set("p-cash", money(price * down + price * num("p-close") / 100));
      set("p-gap", money(Math.abs(total - naive)));
      set("p-gapk", total >= naive ? "More per month than a 1.1% tax calculator shows" : "Less per month than a 1.1% tax calculator shows");
      set("p-live", "Estimated monthly payment " + money(total));
    };
    fillCounties($("#p-cty"), $("#p-tax"), runPay);
    $$("input", pay).forEach(function (el) { el.addEventListener("input", runPay); });
    runPay();
  }

  /* ---- Investors: multi-family deal analyzer --------------------------------- */
  var deal = $("#deal");
  if (deal) {
    var judge = function (id, cls, txt) { var el = document.getElementById(id); el.className = "j " + cls; el.textContent = txt; };
    var runDeal = function () {
      var price = num("q-price"), gsi = num("q-units") * num("q-rent") * 12, vl = gsi * num("q-vac") / 100, egi = gsi - vl;
      var otax = price * num("q-tax") / 100, oins = num("q-ins"), omaint = gsi * num("q-maint") / 100,
          omgmt = egi * num("q-mgmt") / 100, ocapx = gsi * num("q-capx") / 100, oother = num("q-other") * 12;
      var opex = otax + oins + omaint + omgmt + ocapx + oother, noi = egi - opex;
      var ds = payment(price * (1 - num("q-down") / 100), num("q-rate"), num("q-term")) * 12;
      var cf = noi - ds, invested = price * (num("q-down") + num("q-close")) / 100;
      var cap = price > 0 ? noi / price : 0, coc = invested > 0 ? cf / invested : 0, dscr = ds > 0 ? noi / ds : 0,
          grm = gsi > 0 ? price / gsi : 0, exr = egi > 0 ? opex / egi : 0;
      set("q-cf", money(cf / 12)); set("q-cf2", money(cf / 12));
      set("q-gsi", money(gsi / 12)); set("q-vl", "-" + money(vl / 12)); set("q-egi", money(egi / 12));
      set("q-otax", money(otax / 12)); set("q-oins", money(oins / 12)); set("q-omaint", money(omaint / 12));
      set("q-omgmt", money(omgmt / 12)); set("q-ocapx", money(ocapx / 12)); set("q-oother", money(oother / 12));
      set("q-noi", money(noi / 12)); set("q-ds", money(ds / 12));
      set("q-cap", pct(cap)); set("q-coc", pct(coc)); set("q-dscr", dscr.toFixed(2)); set("q-grm", grm.toFixed(1));
      set("q-exp", pct(exr)); set("q-cash", money(invested));
      judge("q-capj", cap >= .07 ? "good" : (cap >= .055 ? "mid" : "bad"), cap >= .07 ? "Strong" : (cap >= .055 ? "Workable" : "Thin"));
      judge("q-cocj", coc >= .08 ? "good" : (coc >= .04 ? "mid" : "bad"), coc >= .08 ? "Strong" : (coc >= .04 ? "Modest" : "Weak"));
      judge("q-dscrj", dscr >= 1.25 ? "good" : (dscr >= 1.2 ? "mid" : "bad"), dscr >= 1.25 ? "Lender-ready" : (dscr >= 1.2 ? "Borderline" : "Hard to finance"));
      set("q-live", "Monthly cash flow " + money(cf / 12) + ", cap rate " + pct(cap) + ", DSCR " + dscr.toFixed(2));
    };
    fillCounties($("#q-cty"), $("#q-tax"), runDeal);
    $$("input", deal).forEach(function (el) { el.addEventListener("input", runDeal); });
    runDeal();
  }

  /* ---- Coverage map: pick a county from the map or the buttons ---------------- */
  var cov = $("#areas");
  if (cov) {
    var current = "burlington";
    var pick = function (key) {
      current = key;
      $$(".cov-list button", cov).forEach(function (b) { b.setAttribute("aria-pressed", String(b.getAttribute("data-county") === key)); });
      $$(".cm-county", cov).forEach(function (p) { p.classList.toggle("is-on", p.getAttribute("data-county") === key); });
      $$(".cov-info", cov).forEach(function (d) { d.classList.toggle("is-on", d.getAttribute("data-for") === key); });
    };
    $$(".cov-list button", cov).forEach(function (b) { b.addEventListener("click", function () { pick(b.getAttribute("data-county")); }); });
    $$(".cm-county", cov).forEach(function (p) {
      p.addEventListener("click", function () { pick(p.getAttribute("data-county")); });
      p.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(p.getAttribute("data-county")); } });
    });
    pick(current);
    var run = $(".cov-run", cov);
    if (run) run.addEventListener("click", function () {
      ["p-cty", "q-cty"].forEach(function (id) {
        var sel = document.getElementById(id);
        if (sel) { sel.value = current; sel.dispatchEvent(new Event("change")); }
      });
    });
  }

  /* ---- Reviews: key tags that flip, plus filters ------------------------------ */
  var rack = $("#keyrack");
  if (rack) {
    var tags = $$(".keytag", rack);
    tags.forEach(function (tag) {
      var front = $(".keytag-flip:not(.keytag-flip-back)", tag), back = $(".keytag-flip-back", tag);
      var flip = function (on) {
        tag.classList.toggle("is-flipped", on);
        front.setAttribute("aria-expanded", String(on));
        $(".keytag-back", tag).setAttribute("aria-hidden", String(!on));
        $(".keytag-front", tag).setAttribute("aria-hidden", String(on));
        (on ? back : front).focus({ preventScroll: true });
      };
      front.addEventListener("click", function () { flip(true); });
      back.addEventListener("click", function () { flip(false); });
    });

    var bar = $$(".rv-filters button");
    var status = $("#rv-status");
    var labels = {};
    bar.forEach(function (b) { labels[b.dataset.filter] = b.textContent; });
    $$(".keytag-chips button", rack).forEach(function (b) { if (!labels[b.dataset.filter]) labels[b.dataset.filter] = b.textContent; });
    var has = function (tag, f) { return f === "all" || tag.dataset.tags.split(" ").indexOf(f) !== -1; };
    bar.forEach(function (b) {
      var n = tags.filter(function (t) { return has(t, b.dataset.filter); }).length;
      b.textContent = labels[b.dataset.filter] + " (" + n + ")";
    });
    var active = "all";
    var apply = function (f) {
      active = f;
      var shown = 0;
      tags.forEach(function (t) { var hit = has(t, f); t.hidden = !hit; if (hit) shown++; });
      bar.forEach(function (b) { b.setAttribute("aria-pressed", String(b.dataset.filter === f)); });
      $$(".keytag-chips button", rack).forEach(function (b) { b.classList.toggle("on", b.dataset.filter === f); });
      status.textContent = "";
      if (f !== "all") {
        status.appendChild(document.createTextNode("Showing " + shown + " review" + (shown === 1 ? "" : "s") + " tagged “" + labels[f] + "” · "));
        var clear = document.createElement("button");
        clear.type = "button";
        clear.className = "text-link";
        clear.style.cssText = "background:none;border:0;padding:0;cursor:pointer;font:inherit;color:var(--gold-soft)";
        clear.textContent = "Show all";
        clear.addEventListener("click", function () { apply("all"); });
        status.appendChild(clear);
      }
    };
    bar.forEach(function (b) { b.addEventListener("click", function () { apply(b.dataset.filter === active ? "all" : b.dataset.filter); }); });
    $$(".keytag-chips button", rack).forEach(function (b) { b.addEventListener("click", function () { apply(b.dataset.filter === active ? "all" : b.dataset.filter); }); });
  }

  /* ---- Contact form ------------------------------------------------------------ */
  var form = $("#contact-form");
  if (form) {
    var fstatus = $("#form-status");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!form.checkValidity()) { form.reportValidity(); return; }
      if (form.elements.company && form.elements.company.value) return; // spam trap
      var data = {
        name: form.elements.name.value, email: form.elements.email.value, phone: form.elements.phone.value,
        topic: form.elements.topic.value, message: form.elements.message.value
      };
      fstatus.className = "form-status";
      if (CONFIG.formspreeId) {
        fstatus.textContent = "Sending…";
        fetch("https://formspree.io/f/" + CONFIG.formspreeId, {
          method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify(data)
        }).then(function (r) {
          if (!r.ok) throw new Error(r.status);
          form.reset();
          fstatus.textContent = "Thanks! Raul will get back to you shortly.";
        }).catch(function () {
          fstatus.className = "form-status err";
          fstatus.textContent = "That did not go through. Please call " + CONFIG.phone + " or email " + CONFIG.email + ".";
        });
      } else {
        var body = "Name: " + data.name + "\nPhone: " + data.phone + "\nEmail: " + data.email + "\nInterested in: " + data.topic + "\n\n" + data.message;
        window.location.href = "mailto:" + CONFIG.email + "?subject=" + encodeURIComponent("Website inquiry from " + data.name) + "&body=" + encodeURIComponent(body);
        fstatus.textContent = "Your email app should open with the message filled in. If it does not, email " + CONFIG.email + " or call " + CONFIG.phone + ".";
      }
    });
  }
})();
