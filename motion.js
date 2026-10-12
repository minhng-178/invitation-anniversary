(() => {
  "use strict";
  if (window.InvitationMotion) return;

  const revealSelector = ".hero-copy > *, .hero-art, .occasion-strip, .section-intro, .date-card, .journey-intro, .year-story, .memory-photo, .pending-memory, .rsvp-section > *, .site-footer";
  const controlSelector = ".button, .music-toggle, .map-link, .photo-toolbar button, .memory-open";
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const hasAnimation = typeof Element.prototype.animate === "function";
  const hasScale = Boolean(window.CSS && CSS.supports("scale", "1"));
  const hasTranslate = Boolean(window.CSS && CSS.supports("translate", "0 1px"));
  const hasRotate = Boolean(window.CSS && CSS.supports("rotate", "1deg"));
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
    if (element.parentElement.classList.contains("hero-copy")) {
      return Math.min(320, [...element.parentElement.children].indexOf(element) * 80);
    }
    if (element.classList.contains("hero-art")) return 180;
    if (element.classList.contains("date-card")) return 110;
    if (element.classList.contains("memory-photo")) {
      const siblings = [...element.parentElement.children].filter((sibling) => sibling.classList.contains("memory-photo"));
      return Math.min(140, siblings.indexOf(element) * 140);
    }
    if (element.parentElement.classList.contains("rsvp-section")) {
      return Math.min(280, [...element.parentElement.children].indexOf(element) * 65);
    }
    return 0;
  }

  function reveal(element) {
    if (!pending.has(element)) return;
    forgetPending(element);
    if (preference.matches || !hasAnimation || element.contains(document.activeElement)) return;
    const photo = element.classList.contains("memory-photo");
    const card = photo || element.classList.contains("date-card") || element.classList.contains("pending-memory");
    const art = element.classList.contains("hero-art");
    const direction = photo && element === element.parentElement.children[1] ? 1 : -1;
    const from = { opacity: 0 };
    const near = { opacity: 1, offset: 0.78 };
    const to = { opacity: 1 };
    if (hasTranslate) {
      from.translate = photo ? `${direction * 12}px 28px` : `0 ${art ? 20 : 24}px`;
      near.translate = card ? "0 -2px" : "0 0";
      to.translate = "0 0";
    }
    if (hasScale) {
      from.scale = card || art ? "0.96" : "1";
      near.scale = card ? "1.004" : "1";
      to.scale = "1";
    }
    // Individual transforms preserve the photos' existing desktop tilt.
    if (photo && hasRotate) { from.rotate = `${direction * 2}deg`; near.rotate = "0deg"; to.rotate = "0deg"; }
    try {
      element.classList.add("invitation-reveal-active");
      element.classList.add("is-revealed");
      const animation = element.animate(card ? [from, near, to] : [from, to], {
        duration: photo ? 920 : art ? 1000 : card ? 820 : 720,
        delay: stagger(element),
        easing: "cubic-bezier(.16,1,.3,1)",
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
    else revealVisible();
  });
  window.addEventListener("pageshow", revealVisible);
  preference.addEventListener("change", () => {
    if (preference.matches) revealAll();
  });

  function revealVisible() {
    // Request fresh entries after a hidden tab/bfcache restore. Let IO account
    // for the galleries' clipping rather than consuming the next peeking photo.
    if (!observer || document.hidden) return;
    for (const element of pending) {
      observer.unobserve(element);
      observer.observe(element);
    }
  }

  // Conceal only after the observer is available. Focus, anchor navigation,
  // reduced motion, print and missing APIs all retain readable content.
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
          if (!entry.isIntersecting) continue;
          const bounds = entry.boundingClientRect;
          const root = entry.rootBounds;
          if (!root || !bounds.width || !bounds.height) { reveal(entry.target); continue; }
          const visibleWidth = entry.intersectionRect.width / Math.min(bounds.width, root.width);
          const visibleHeight = entry.intersectionRect.height / Math.min(bounds.height, root.height);
          // A tall photo still reveals on a small/zoomed screen. A peeking
          // second photo waits until the horizontal swipe brings it into view.
          const requiredWidth = entry.target.classList.contains("memory-photo") ? 0.4 : 0;
          if (visibleWidth >= requiredWidth && visibleHeight >= 0.08) reveal(entry.target);
        }
      }, { root: null, rootMargin: "0px 0px -32px 0px", threshold: [0, 0.01, 0.05, 0.1, 0.18, 0.3, 0.5, 0.75, 1] });
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
