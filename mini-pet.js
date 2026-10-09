(() => {
  "use strict";
  if (window.CapyMini) return;
  const pet = document.querySelector("#mini-pet");
  const body = document.querySelector("#mini-pet-body");
  const bubble = document.querySelector("#mini-pet-bubble");
  const hideButton = document.querySelector("#mini-pet-hide");
  const restoreButton = document.querySelector("#mini-pet-restore");
  if (!pet || !body || !bubble || !hideButton || !restoreButton) return;
  // Cappy's original atlas: 8 columns × 9 rows, each cell 192 × 208.
  // Rows have different frame counts; never animate through the empty cells.
  const SPRITES = Object.freeze({
    idle: { row: 0, frames: 6, duration: 2600 },
    right: { row: 1, frames: 8, duration: 960 },
    left: { row: 2, frames: 8, duration: 960 },
    waving: { row: 3, frames: 4, duration: 880 },
    jumping: { row: 4, frames: 5, duration: 800 }
  });
  const art = document.createElement("span");
  art.className = "cappy-sprite";
  art.setAttribute("aria-hidden", "true");
  body.append(art);
  body.setAttribute("aria-controls", bubble.id);
  body.setAttribute("aria-expanded", "false");
  body.setAttribute("aria-label", "Cappy: bấm để nghe lời nhắn, kéo để di chuyển. Dùng phím mũi tên để di chuyển, Home để về góc trang.");
  hideButton.setAttribute("aria-label", "Ẩn Cappy");
  restoreButton.setAttribute("aria-label", "Hiện lại Cappy");
  // A transformed pet would otherwise become the containing block for its
  // fixed bubble. Keep the bubble outside that transform and clamp separately.
  document.body.append(bubble);

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const names = window.INVITATION || {};
  const sender = names.senderNickname || "Heo";
  const recipient = names.recipientNickname || "Bé Hai";
  const messages = [
    sender + " nhờ Cappy nói: thương " + recipient + " nhiều lắm đó ♡",
    "Đi chậm thôi, mình còn cả bốn năm thương nhau ✿",
    "Cappy đi dạo. Còn hai đứa mình đi hẹn hò nha ♡",
    "Một chút sushi, thật nhiều thương " + recipient + ".",
    "Năm thứ tư đang đợi thêm một tấm ảnh của hai đứa đó ♡"
  ];
  let position = { x: 0, y: 0 };
  let bounds;
  let direction = "left";
  let walkTarget = null;
  let walkFrame = 0;
  let walkTimer = 0;
  let lastWalkTime = 0;
  let walkSpeed = 34;
  let drag = null;
  let dragFrame = 0;
  let dragPosition = null;
  let ignorePointerClick = false;
  let ignoreClickUntil = 0;
  let bubbleTimer = 0;
  let messageIndex = 0;
  let hovered = false;
  let pageSuspended = false;
  let externallyPaused = false;
  let spriteReady = false;
  let waveTimer = 0;

  function renderSprite(name, still, column) {
    const sprite = SPRITES[name];
    art.dataset.animation = name;
    art.dataset.static = still ? "true" : "false";
    art.style.setProperty("--sprite-row", sprite.row);
    art.style.setProperty("--sprite-frames", sprite.frames);
    art.style.setProperty("--sprite-duration", sprite.duration + "ms");
    art.style.setProperty("--sprite-column", column || 0);
  }
  function stopReaction() {
    window.clearTimeout(waveTimer);
    waveTimer = 0;
  }
  function syncSprite() {
    const state = pet.dataset.state;
    if (state === "running") renderSprite(direction, false);
    else if (state === "dragging") renderSprite("jumping", true, 2);
    else if (state === "idle" && waveTimer && !isPaused()) renderSprite("waving", false);
    else renderSprite("idle", state !== "idle" || isPaused());
  }
  function wave() {
    // Finish the current one-shot before starting another wave. Repeated taps
    // can change the message without desynchronizing the CSS and JS timers.
    if (waveTimer) return;
    if (isPaused() || pet.hidden) return;
    waveTimer = window.setTimeout(() => {
      waveTimer = 0;
      syncSprite();
    }, SPRITES.waving.duration);
    syncSprite();
  }
  // Keep the small poster visible until the atlas is decoded. A failed atlas
  // leaves a usable static pet, rather than an empty draggable button.
  const atlas = new Image();
  atlas.onload = () => {
    spriteReady = true;
    body.dataset.spriteReady = "true";
    syncActivity();
  };
  atlas.onerror = () => { spriteReady = false; syncActivity(); };
  atlas.src = "./assets/cappy/spritesheet.webp";

  function clamp(value, low, high) {
    return Math.min(Math.max(value, low), Math.max(low, high));
  }
  function measureBounds() {
    const visual = window.visualViewport;
    const view = {
      x: visual ? visual.offsetLeft : 0,
      y: visual ? visual.offsetTop : 0,
      width: visual ? visual.width : window.innerWidth,
      height: visual ? visual.height : window.innerHeight
    };
    const style = getComputedStyle(pet);
    const width = pet.offsetWidth || parseFloat(style.width) || 110;
    const height = pet.offsetHeight || width * 208 / 192 + 16;
    const safeBottom = parseFloat(style.getPropertyValue("--pet-safe-bottom")) || 0;
    bounds = {
      view: view, width: width, height: height,
      left: view.x + 12,
      right: Math.max(view.x + 12, view.x + view.width - width - 12),
      top: view.y + 12,
      bottom: Math.max(view.y + 12, view.y + view.height - height - Math.max(12, safeBottom + 8))
    };
    return bounds;
  }
  function placePet(x, y) {
    if (!bounds) measureBounds();
    position = { x: clamp(x, bounds.left, bounds.right), y: clamp(y, bounds.top, bounds.bottom) };
    pet.style.left = "0";
    pet.style.top = "0";
    pet.style.right = "auto";
    pet.style.bottom = "auto";
    pet.style.transform = "translate3d(" + position.x.toFixed(2) + "px," + position.y.toFixed(2) + "px,0)";
  }
  function setFacing(nextDirection) {
    direction = nextDirection;
    pet.dataset.direction = nextDirection;
    if (pet.dataset.state === "running") syncSprite();
  }
  function setState(nextState) {
    if (nextState !== "idle") stopReaction();
    pet.dataset.state = nextState;
    syncSprite();
  }
  function modalOpen() { return Boolean(document.querySelector("dialog[open]")); }
  function isPaused() {
    return externallyPaused || pageSuspended || document.hidden || reducedMotion.matches || modalOpen();
  }
  function canRoam() {
    return spriteReady && !pet.hidden && !isPaused() && !drag && !hovered &&
      !pet.contains(document.activeElement) && bubble.hidden;
  }
  function stopRoaming() {
    window.clearTimeout(walkTimer);
    walkTimer = 0;
    if (walkFrame) cancelAnimationFrame(walkFrame);
    walkFrame = 0;
    walkTarget = null;
    lastWalkTime = 0;
  }
  function queueWalk(delay) {
    if (!canRoam() || walkTimer || walkFrame || !bounds || bounds.right - bounds.left < 18) return;
    walkTimer = window.setTimeout(() => {
      walkTimer = 0;
      beginWalk();
    }, delay === undefined ? 2600 + Math.random() * 3000 : delay);
  }
  function syncActivity() {
    stopRoaming();
    if (pet.hidden) { setState("hidden"); return; }
    if (drag && drag.moved) { setState("dragging"); return; }
    setState(isPaused() ? "paused" : "idle");
    if (canRoam()) queueWalk();
  }
  function beginWalk() {
    if (!canRoam()) { syncActivity(); return; }
    measureBounds();
    const room = bounds.right - bounds.left;
    if (room < 18) { setState("idle"); return; }
    let sign = Math.random() < 0.5 ? -1 : 1;
    if (position.x > bounds.right - 24) sign = -1;
    if (position.x < bounds.left + 24) sign = 1;
    const distance = Math.min(room, 48 + Math.random() * 82);
    const targetX = clamp(position.x + sign * distance, bounds.left, bounds.right);
    const lowerBand = Math.min(42, bounds.view.height * 0.07);
    walkTarget = {
      x: targetX,
      y: clamp(bounds.bottom - Math.random() * lowerBand, bounds.top, bounds.bottom)
    };
    setFacing(targetX < position.x ? "left" : "right");
    walkSpeed = bounds.width < 100 ? 25 + Math.random() * 7 : 30 + Math.random() * 9;
    lastWalkTime = 0;
    setState("running");
    walkFrame = requestAnimationFrame(walkStep);
  }
  function walkStep(now) {
    walkFrame = 0;
    if (!walkTarget || !canRoam()) { syncActivity(); return; }
    // Never catch up a long background interruption in one visible jump.
    const dt = lastWalkTime ? Math.min(0.035, Math.max(0, (now - lastWalkTime) / 1000)) : 0;
    lastWalkTime = now;
    const dx = walkTarget.x - position.x, dy = walkTarget.y - position.y;
    const distance = Math.hypot(dx, dy);
    const step = walkSpeed * dt;
    if (distance <= Math.max(0.5, step)) {
      placePet(walkTarget.x, walkTarget.y);
      walkTarget = null;
      lastWalkTime = 0;
      setState("idle");
      queueWalk();
      return;
    }
    if (step) placePet(position.x + dx / distance * step, position.y + dy / distance * step);
    walkFrame = requestAnimationFrame(walkStep);
  }
  function closeBubble() {
    stopReaction();
    window.clearTimeout(bubbleTimer);
    bubbleTimer = 0;
    bubble.hidden = true;
    body.setAttribute("aria-expanded", "false");
    syncActivity();
  }
  function clampBubble() {
    const view = bounds ? bounds.view : measureBounds().view;
    const margin = 12;
    bubble.style.width = Math.min(bounds.width < 100 ? 210 : 220, Math.max(0, view.width - margin * 2)) + "px";
    bubble.style.maxHeight = Math.max(0, view.height - margin * 2) + "px";
    const petRect = pet.getBoundingClientRect();
    const bubbleRect = bubble.getBoundingClientRect();
    const x = clamp(petRect.left + petRect.width / 2 - bubbleRect.width / 2,
      view.x + margin, view.x + view.width - bubbleRect.width - margin);
    const above = petRect.top - bubbleRect.height - 8;
    const below = petRect.bottom + 8;
    const preferredY = above >= view.y + margin ? above : below;
    const y = clamp(preferredY, view.y + margin, view.y + view.height - bubbleRect.height - margin);
    bubble.style.left = x.toFixed(2) + "px";
    bubble.style.top = y.toFixed(2) + "px";
    bubble.style.right = "auto";
    bubble.style.bottom = "auto";
  }
  function showBubble() {
    // Reduced motion stops roaming, while tap/keyboard messages still work.
    if (pet.hidden || externallyPaused || pageSuspended || document.hidden || modalOpen()) return;
    stopRoaming();
    bubble.hidden = false;
    bubble.textContent = messages[messageIndex++ % messages.length];
    body.setAttribute("aria-expanded", "true");
    measureBounds();
    clampBubble();
    setState(isPaused() ? "paused" : "idle");
    wave();
    window.clearTimeout(bubbleTimer);
    bubbleTimer = window.setTimeout(closeBubble, 6500);
  }
  function resetHome() {
    stopRoaming();
    closeBubble();
    measureBounds();
    placePet(bounds.right, bounds.bottom);
    setFacing("left");
    syncActivity();
  }
  function flushDragPosition() {
    if (dragPosition) {
      placePet(dragPosition.x, dragPosition.y);
      dragPosition = null;
    }
  }
  function finishDrag(event, cancelled) {
    if (!drag || (event && event.pointerId !== drag.id)) return;
    const finished = drag;
    drag = null; // Clear before releasing capture; lostpointercapture can follow.
    if (dragFrame) cancelAnimationFrame(dragFrame);
    dragFrame = 0;
    if (!cancelled) flushDragPosition();
    dragPosition = null;
    ignorePointerClick = finished.moved || Boolean(cancelled);
    ignoreClickUntil = performance.now() + 600;
    try {
      if (body.hasPointerCapture(finished.id)) body.releasePointerCapture(finished.id);
    } catch { /* The browser may already have cancelled this pointer. */ }
    syncActivity();
  }
  body.addEventListener("pointerdown", (event) => {
    if (event.isPrimary === false || event.button !== 0 || drag || pet.hidden) return;
    ignorePointerClick = false;
    stopRoaming();
    setState(isPaused() ? "paused" : "idle");
    measureBounds();
    const rect = pet.getBoundingClientRect();
    drag = {
      id: event.pointerId,
      startX: event.clientX, startY: event.clientY,
      x: rect.left, y: rect.top, moved: false
    };
    try { body.setPointerCapture(event.pointerId); } catch { /* Progressive enhancement. */ }
    event.stopPropagation();
  });
  body.addEventListener("pointermove", (event) => {
    if (!drag || drag.id !== event.pointerId) return;
    const dx = event.clientX - drag.startX, dy = event.clientY - drag.startY;
    if (!drag.moved && Math.hypot(dx, dy) < 8) return;
    if (!drag.moved) {
      drag.moved = true;
      closeBubble();
      setState("dragging");
    }
    if (Math.abs(dx) > 3) setFacing(dx < 0 ? "left" : "right");
    dragPosition = { x: drag.x + dx, y: drag.y + dy };
    if (!dragFrame) dragFrame = requestAnimationFrame(() => {
      dragFrame = 0;
      flushDragPosition();
    });
    event.stopPropagation();
  });
  body.addEventListener("pointerup", (event) => finishDrag(event, false));
  body.addEventListener("pointercancel", (event) => finishDrag(event, true));
  body.addEventListener("lostpointercapture", (event) => finishDrag(event, true));
  body.addEventListener("click", (event) => {
    // Keep keyboard activation usable, and suppress delayed touch clicks too.
    if (event.detail > 0 && ignorePointerClick && performance.now() < ignoreClickUntil) {
      ignorePointerClick = false;
      event.preventDefault();
      return;
    }
    ignorePointerClick = false;
    showBubble();
  });
  body.addEventListener("keydown", (event) => {
    const moves = { ArrowLeft: [-20, 0], ArrowRight: [20, 0], ArrowUp: [0, -20], ArrowDown: [0, 20] };
    if (event.key === "Home") { event.preventDefault(); resetHome(); return; }
    if (event.key === "Escape" && !bubble.hidden) { event.preventDefault(); closeBubble(); return; }
    if (!moves[event.key]) return;
    event.preventDefault();
    closeBubble();
    measureBounds();
    if (moves[event.key][0]) setFacing(moves[event.key][0] < 0 ? "left" : "right");
    placePet(position.x + moves[event.key][0], position.y + moves[event.key][1]);
    setState(isPaused() ? "paused" : "idle");
  });
  pet.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    hovered = true;
    syncActivity();
  });
  pet.addEventListener("pointerleave", (event) => {
    if (event.pointerType !== "mouse") return;
    hovered = false;
    if (!drag) syncActivity();
  });
  pet.addEventListener("focusin", syncActivity);
  pet.addEventListener("focusout", () => {
    // focusout precedes the browser updating activeElement.
    queueMicrotask(syncActivity);
  });
  hideButton.addEventListener("click", () => {
    finishDrag(null, true);
    closeBubble();
    pet.hidden = true;
    restoreButton.hidden = false;
    hovered = false;
    syncActivity();
    restoreButton.focus({ preventScroll: true });
  });
  restoreButton.addEventListener("click", () => {
    pet.hidden = false;
    restoreButton.hidden = true;
    resetHome();
    body.focus({ preventScroll: true });
    syncActivity();
  });
  function updateLayout() {
    if (pet.hidden) return;
    stopRoaming();
    measureBounds();
    placePet(position.x, position.y);
    if (!bubble.hidden) clampBubble();
    syncActivity();
  }
  window.addEventListener("resize", updateLayout, { passive: true });
  if (window.visualViewport) {
    window.visualViewport.addEventListener("resize", updateLayout, { passive: true });
    window.visualViewport.addEventListener("scroll", updateLayout, { passive: true });
  }
  window.addEventListener("blur", () => {
    // An embedded preview can stay visible while focus moves to its chat.
    // Cancel interrupted gestures, without stopping an ordinary visible walk.
    if (drag) finishDrag(null, true);
    if (!bubble.hidden) closeBubble();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) { finishDrag(null, true); closeBubble(); }
    else updateLayout();
    syncActivity();
  });
  reducedMotion.addEventListener("change", syncActivity);
  const dialogObserver = new MutationObserver(() => {
    if (modalOpen()) { finishDrag(null, true); closeBubble(); }
    syncActivity();
  });
  dialogObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ["open"] });
  window.addEventListener("pagehide", () => {
    pageSuspended = true;
    finishDrag(null, true);
    closeBubble();
    syncActivity();
  });
  window.addEventListener("pageshow", () => {
    pageSuspended = false;
    updateLayout();
    syncActivity();
  });
  window.CapyMini = Object.freeze({
    pause() { externallyPaused = true; finishDrag(null, true); closeBubble(); syncActivity(); },
    resume() { externallyPaused = false; syncActivity(); },
    reset: resetHome,
    get state() { return pet.dataset.state; },
    get position() { return Object.freeze({ x: position.x, y: position.y }); }
  });
  resetHome();
})();
