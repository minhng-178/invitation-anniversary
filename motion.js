(() => {
  "use strict";
  if (window.InvitationMotion) return;

  const revealSelector = ".section-intro, .date-card, .journey-intro, .year-story, .memory-photo, .pending-memory, .rsvp-section > *";
  const controlSelector = ".button, .music-toggle, .map-link, .photo-toolbar button, .memory-open";
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hasAnimation = typeof Element.prototype.animate === "function";
  const hasScale = Boolean(window.CSS && CSS.supports("scale", "1"));
  const hasTranslate = Boolean(window.CSS && CSS.supports("translate", "0 1px"));
  const pending = new Set();
  const reveals = new Map();
  const presses = new Map();
  const pointers = new Map();
  const keys = new Map();
  const releasedAt = new WeakMap();
  let observer;

  function related(scope, element) {
    return scope === document || scope === element ||
      (scope.contains && scope.contains(element)) || element.contains(scope);
  }

  function forgetPending(element) {
    pending.delete(element);
    element.classList.remove("invitation-reveal-target");
    if (observer) observer.unobserve(element);
  }

  function cancelReveal(element) {
    const animation = reveals.get(element);
    reveals.delete(element);
    element.classList.remove("invitation-reveal-active");
    if (animation) animation.cancel();
  }

  function revealInstantly(element) {
    forgetPending(element);
    cancelReveal(element);
    // Cancelling returns to the original, fully visible stylesheet values.
  }

  function revealWithin(scope) {
    if (!scope) return;
    for (const element of [...pending]) {
      if (related(scope, element)) revealInstantly(element);
    }
    for (const element of [...reveals.keys()]) {
      if (related(scope, element)) cancelReveal(element);
    }
  }

  function stagger(element) {
    if (element.classList.contains("date-card")) return 75;
    if (element.classList.contains("memory-photo")) {
      const siblings = [...element.parentElement.children].filter((sibling) => sibling.classList.contains("memory-photo"));
      return Math.min(105, siblings.indexOf(element) * 75);
    }
    if (element.parentElement.classList.contains("rsvp-section")) {
      return Math.min(180, [...element.parentElement.children].indexOf(element) * 45);
    }
    return 0;
  }

  function reveal(element) {
    if (!pending.has(element)) return;
    forgetPending(element);
    if (preference.matches || !hasAnimation || element.contains(document.activeElement)) return;
    const photo = element.classList.contains("memory-photo");
    const card = photo || element.classList.contains("date-card") || element.classList.contains("pending-memory");
    const from = { opacity: 0 };
    const to = { opacity: 1 };
    if (hasTranslate) { from.translate = "0 14px"; to.translate = "0 0"; }
    if (hasScale) { from.scale = card ? "0.985" : "1"; to.scale = "1"; }
    try {
      element.classList.add("invitation-reveal-active");
      const animation = element.animate([from, to], {
        duration: photo ? 640 : 560,
        delay: stagger(element),
        easing: "cubic-bezier(.2,.75,.25,1)",
        fill: "backwards"
      });
      reveals.set(element, animation);
      const clean = () => {
        if (reveals.get(element) !== animation) return;
        reveals.delete(element);
        element.classList.remove("invitation-reveal-active");
      };
      animation.onfinish = clean;
      animation.oncancel = clean;
    } catch {
      cancelReveal(element);
    }
  }

  function controlFor(target) {
    const element = target instanceof Element ? target : target && target.parentElement;
    if (!element) return null;
    const control = element.closest(controlSelector);
    if (!control || control.disabled || control.getAttribute("aria-disabled") === "true" ||
      control.closest("#mini-pet, #mini-pet-restore")) return null;
    return control;
  }

  function cancelPress(control) {
    const record = presses.get(control);
    presses.delete(control);
    control.classList.remove("invitation-press-active");
    if (record) record.animation.cancel();
  }

  function animatePress(control, frames, options, phase) {
    cancelPress(control);
    if (preference.matches || !hasAnimation || !hasScale) return;
    try {
      control.classList.add("invitation-press-active");
      const animation = control.animate(frames, options);
      const record = { animation, phase };
      presses.set(control, record);
      const clean = () => {
        if (presses.get(control) !== record) return;
        presses.delete(control);
        control.classList.remove("invitation-press-active");
      };
      animation.oncancel = clean;
      if (phase !== "held") animation.onfinish = clean;
    } catch {
      cancelPress(control);
    }
  }

  function press(control) {
    revealWithin(control);
    const scale = control.classList.contains("memory-open") ? "0.988" : "0.975";
    animatePress(control, [{ scale: "1" }, { scale }], {
      duration: 95,
      easing: "cubic-bezier(.2,.7,.3,1)",
      fill: "forwards"
    }, "held");
  }

  function release(control) {
    const record = presses.get(control);
    if (!record || record.phase !== "held") return;
    const current = parseFloat(getComputedStyle(control).scale) || 1;
    releasedAt.set(control, performance.now());
    if (control.disabled || !control.isConnected) { cancelPress(control); return; }
    const spring = control.classList.contains("memory-open") ? "1.006" : "1.012";
    animatePress(control, [{ scale: String(current) }, { scale: spring, offset: 0.64 }, { scale: "1" }], {
      duration: 265,
      easing: "cubic-bezier(.2,.85,.3,1)"
    }, "released");
  }

  function pulse(control) {
    revealWithin(control);
    const photo = control.classList.contains("memory-open");
    animatePress(control, [
      { scale: "1" },
      { scale: photo ? "0.988" : "0.975", offset: 0.24 },
      { scale: photo ? "1.006" : "1.012", offset: 0.7 },
      { scale: "1" }
    ], { duration: 340, easing: "cubic-bezier(.2,.8,.3,1)" }, "pulse");
  }

  function settle(scope = document) {
    for (const element of [...reveals.keys()]) {
      if (related(scope, element)) cancelReveal(element);
    }
    for (const control of [...presses.keys()]) {
      if (related(scope, control)) cancelPress(control);
    }
    for (const [id, control] of [...pointers]) {
      if (related(scope, control)) pointers.delete(id);
    }
    for (const control of [...keys.keys()]) {
      if (related(scope, control)) keys.delete(control);
    }
  }

  function revealAll() {
    if (observer) observer.disconnect();
    for (const element of [...pending]) revealInstantly(element);
    settle();
  }

  function insideViewport(element) {
    const rect = element.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 && rect.bottom > 0 && rect.top < window.innerHeight &&
      rect.right > 0 && rect.left < window.innerWidth;
  }

  function exposeHash() {
    if (!window.location.hash) return;
    let id;
    try { id = decodeURIComponent(window.location.hash.slice(1)); } catch { return; }
    const target = document.getElementById(id);
    if (!target) return;
    // A broad #top/#journey anchor should not consume animations far below it.
    for (const element of [...pending, ...reveals.keys()]) {
      if (element === target || element.contains(target) || (target.contains(element) && insideViewport(element))) {
        revealInstantly(element);
      }
    }
  }

  // Focus and deliberate activation expose ancestors before any press effect.
  document.addEventListener("focusin", (event) => revealWithin(event.target), true);
  window.addEventListener("hashchange", exposeHash);
  window.addEventListener("load", exposeHash, { once: true });

  document.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || event.isPrimary === false) return;
    const control = controlFor(event.target);
    if (!control) return;
    pointers.set(event.pointerId, control);
    press(control);
  }, { capture: true, passive: true });

  document.addEventListener("pointerup", (event) => {
    const control = pointers.get(event.pointerId);
    pointers.delete(event.pointerId);
    if (control) release(control);
  }, { capture: true, passive: true });

  const cancelPointer = (event) => {
    const control = pointers.get(event.pointerId);
    pointers.delete(event.pointerId);
    if (control) cancelPress(control);
  };
  document.addEventListener("pointercancel", cancelPointer, { capture: true, passive: true });
  document.addEventListener("lostpointercapture", cancelPointer, { capture: true, passive: true });

  document.addEventListener("keydown", (event) => {
    if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return;
    const control = controlFor(event.target);
    if (!control || (event.key === " " && control.tagName !== "BUTTON")) return;
    keys.set(control, event.key);
    press(control);
  }, true);

  document.addEventListener("keyup", (event) => {
    const control = controlFor(event.target);
    if (!control || keys.get(control) !== event.key) return;
    keys.delete(control);
    release(control);
  }, true);

  document.addEventListener("click", (event) => {
    const control = controlFor(event.target);
    if (!control) return;
    revealWithin(control);
    // Pointer and Space releases already supply a spring. Enter/synthetic
    // clicks receive a full pulse when no recent release supplied one.
    const recentlyReleased = performance.now() - (releasedAt.get(control) ?? -Infinity) < 420;
    if (!recentlyReleased) {
      keys.delete(control);
      pulse(control);
    }
  }, true);

  window.addEventListener("blur", () => {
    for (const control of [...presses.keys()]) cancelPress(control);
    pointers.clear();
    keys.clear();
  });
  window.addEventListener("pagehide", () => settle());
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) settle();
  });
  preference.addEventListener("change", () => {
    if (preference.matches) revealAll();
  });

  // Elements are never hidden while waiting for IO. The animation only conceals
  // them briefly on first entry; missing APIs always leave ordinary content.
  if (hasAnimation && !preference.matches && "IntersectionObserver" in window) {
    const candidates = [...document.querySelectorAll(revealSelector)].filter((element) => !element.closest("dialog"));
    const candidateSet = new Set(candidates);
    const topLevel = candidates.filter((element) => {
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (candidateSet.has(parent)) return false;
      }
      return true;
    });
    try {
      observer = new IntersectionObserver((entries) => {
        if (document.hidden) return;
        for (const entry of entries) {
          const threshold = entry.target.classList.contains("memory-photo") ? 0.22 : 0.08;
          if (entry.isIntersecting && entry.intersectionRatio >= threshold) reveal(entry.target);
        }
      }, { root: null, rootMargin: "0px 0px -24px 0px", threshold: [0.08, 0.22] });
      for (const element of topLevel) {
        pending.add(element);
        element.classList.add("invitation-reveal-target");
        observer.observe(element);
      }
      exposeHash();
    } catch {
      revealAll();
    }
  }

  window.InvitationMotion = Object.freeze({ revealAll, reveal: revealWithin, settle });
})();
