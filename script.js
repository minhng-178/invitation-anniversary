(() => {
  "use strict";
  const config = window.INVITATION;
  const $ = (selector) => document.querySelector(selector);
  const motionPreference = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)");
  const layer = $("#particle-layer");
  const musicButton = $("#music-toggle");
  let bouquetAnimation;
  let bouquetVisible = true;
  let currentDialogTrigger;
  let bubbleTimer;
  const uiAnimations = new Map();
  const closingDialogs = new Map();

  // Keep action feedback short, cancellable, and independent of scroll effects.
  function animateUI(element, frames, options = {}) {
    uiAnimations.get(element)?.cancel();
    if (!element?.animate || motionPreference.matches || document.hidden) return null;
    const animation = element.animate(frames, {
      duration: 360, easing: "cubic-bezier(.2,.75,.25,1)", ...options
    });
    uiAnimations.set(element, animation);
    const clean = () => { if (uiAnimations.get(element) === animation) uiAnimations.delete(element); };
    animation.finished.then(clean, clean);
    return animation;
  }

  function animateDialog(dialog) {
    dialog.dataset.motion = motionPreference.matches || document.hidden || !dialog.animate ? "static" : "enabled";
    if (dialog.dataset.motion === "static") return;
    animateUI(dialog, [
      { opacity: 0, transform: "translateY(20px) scale(.97)" },
      { opacity: 1, transform: "translateY(-2px) scale(1.005)", offset: .78 },
      { opacity: 1, transform: "none" }
    ], { duration: 420 });
    const content = dialog.querySelectorAll(
      ".letter-mark, #letter-title, #letter-copy p, .signature, #letter-next, " +
      ".reply-flower, #reply-title, #reply-description, .reply-label, #reply-message, #copy-reply"
    );
    content.forEach((element, index) => animateUI(element, [
      { opacity: 0, transform: "translateY(10px)" },
      { opacity: 1, transform: "none" }
    ], { duration: 380, delay: Math.min(90 + index * 45, 330), fill: "backwards" }));
  }

  function closeDialog(dialog, returnValue = "") {
    if (closingDialogs.has(dialog)) return closingDialogs.get(dialog).promise;
    if (!dialog.open) return Promise.resolve();
    if (motionPreference.matches || document.hidden || !dialog.animate) {
      dialog.close(returnValue);
      return Promise.resolve();
    }
    dialog.dataset.closing = "true";
    let resolve;
    let closeTimer = 0;
    const promise = new Promise((done) => { resolve = done; });
    const finish = () => {
      if (!closingDialogs.has(dialog)) return;
      closingDialogs.delete(dialog);
      window.clearTimeout(closeTimer);
      // A forwards-filled exit must be cancelled even after its finished
      // promise removed it from uiAnimations, or the next opening stays hidden.
      animation?.cancel();
      if (dialog.open) dialog.close(returnValue);
      delete dialog.dataset.closing;
      resolve();
    };
    closingDialogs.set(dialog, { promise, finish });
    const style = getComputedStyle(dialog);
    const animation = animateUI(dialog, [
      { opacity: style.opacity, transform: style.transform },
      { opacity: 0, transform: "translateY(12px) scale(.985)" }
    ], { duration: 160, easing: "ease-in", fill: "forwards" });
    if (animation) {
      // The preview or browser can throttle its animation timeline. Always
      // release the modal promptly, including when no new frame is painted.
      closeTimer = window.setTimeout(finish, 240);
      animation.finished.then(finish, finish);
    }
    else finish();
    return promise;
  }

  function settleUI() {
    for (const job of [...closingDialogs.values()]) job.finish();
    for (const animation of uiAnimations.values()) animation.cancel();
    uiAnimations.clear();
    if (motionPreference.matches || document.hidden) {
      document.querySelectorAll("dialog").forEach((dialog) => { dialog.dataset.motion = "static"; });
    }
  }

  // Text nodes keep the configuration safe to edit; HTML is never interpolated.
  document.querySelectorAll("[data-time]").forEach((element) => { element.textContent = config.time; });
  document.querySelectorAll("[data-map-link]").forEach((element) => { element.href = config.mapUrl; });
  const letterCopy = $("#letter-copy");
  letterCopy.replaceChildren(...config.letter.map((text) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    paragraph.style.whiteSpace = "pre-line";
    return paragraph;
  }));

  function updateCountdown() {
    const remaining = new Date(config.dateISO).getTime() - Date.now();
    const text = $("#countdown");
    if (remaining <= 0) { text.textContent = "Một ngày hẹn để cất vào kỷ niệm ♡"; return; }
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor(remaining / 3600000) % 24;
    const minutes = Math.floor(remaining / 60000) % 60;
    text.textContent = days > 0 ? `Còn ${days} ngày ${hours} giờ đến chiếc hẹn của mình` : `Còn ${hours} giờ ${minutes} phút đến chiếc hẹn của mình`;
  }
  updateCountdown();
  const countdownTimer = window.setInterval(() => { if (!document.hidden) updateCountdown(); }, 60000);

  // Genuine Lottie image-layer animation with a locally bundled renderer.
  // The illustration is kept as an immediate static fallback.
  function keyframes(values) {
    return values.map(([time, value], index) => ({
      t: time, s: value, ...(index < values.length - 1 ? {
        e: values[index + 1][1], i: { x: [0.67], y: [1] }, o: { x: [0.33], y: [0] }
      } : {})
    }));
  }
  function makeBouquetAnimation(containerSelector, fallbackSelector) {
    const animation = window.lottie.loadAnimation({
      container: $(containerSelector), renderer: "svg", loop: true,
      autoplay: !motionPreference.matches && !document.hidden,
      rendererSettings: { preserveAspectRatio: "xMidYMid meet", progressiveLoad: true },
      animationData: {
        v: "5.13.0", fr: 30, ip: 0, op: 144, w: 960, h: 960, nm: "Heo & Bé Hai", ddd: 0,
        assets: [{ id: "our-bouquet", w: 960, h: 960, u: "", p: new URL("./assets/bouquet.webp", document.baseURI).href, e: 0 }],
        layers: [{ ddd: 0, ind: 1, ty: 2, nm: "A bouquet for Bé Hai", refId: "our-bouquet", sr: 1,
          ks: { o: { a: 0, k: 100 }, a: { a: 0, k: [480, 650, 0] },
            p: { a: 1, k: keyframes([[0, [480, 650, 0]], [36, [480, 636, 0]], [72, [480, 650, 0]], [108, [480, 640, 0]], [144, [480, 650, 0]]]) },
            s: { a: 0, k: [97, 97, 100] },
            r: { a: 1, k: keyframes([[0, [-1]], [36, [1]], [72, [-1]], [108, [0.7]], [144, [-1]]]) }
          }, ao: 0, ip: 0, op: 144, st: 0, bm: 0
        }]
      }
    });
    animation.addEventListener("loaded_images", () => {
      // Lottie reports completion even if its image failed. Confirm independently
      // before hiding the immediately available, accessible static illustration.
      const probe = new Image();
      probe.onload = () => {
        $(containerSelector).classList.add("is-ready");
        $(fallbackSelector).classList.add("is-hidden");
      };
      probe.src = new URL("./assets/bouquet.webp", document.baseURI).href;
    });
    animation.addEventListener("data_failed", () => { $(containerSelector).classList.remove("is-ready"); $(fallbackSelector).classList.remove("is-hidden"); });
    animation.addEventListener("DOMLoaded", () => { syncMotion(); });
    return animation;
  }
  if (window.lottie) {
    bouquetAnimation = makeBouquetAnimation("#bouquet-animation", "#bouquet-fallback");
    if ("IntersectionObserver" in window) {
      const observer = new IntersectionObserver(([entry]) => { bouquetVisible = entry.isIntersecting; syncMotion(); }, { threshold: 0.05 });
      observer.observe($("#bouquet-button"));
    }
  }
  function syncMotion() {
    if (bouquetAnimation) {
      if (motionPreference.matches) bouquetAnimation.goToAndStop(0, true);
      else if (document.hidden || !bouquetVisible) bouquetAnimation.pause();
      else bouquetAnimation.play();
    }
  }

  function openDialog(dialog, trigger) {
    if (dialog.open) return;
    currentDialogTrigger = trigger;
    dialog.returnValue = "";
    dialog.showModal();
    document.body.style.overflow = "hidden";
    dialog.querySelector("[data-close]").focus();
    animateDialog(dialog);
  }
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.querySelector("[data-close]").addEventListener("click", () => closeDialog(dialog));
    dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeDialog(dialog); });
    dialog.addEventListener("close", () => {
      window.InvitationMotion?.settle(dialog);
      closingDialogs.get(dialog)?.finish();
      delete dialog.dataset.closing;
      for (const [element, animation] of uiAnimations) {
        if (element === dialog || dialog.contains(element)) { animation.cancel(); uiAnimations.delete(element); }
      }
      document.body.style.overflow = "";
      if (dialog.returnValue !== "continue") currentDialogTrigger?.focus({ preventScroll: true });
    });
    dialog.addEventListener("click", (event) => {
      const rect = dialog.getBoundingClientRect();
      if (event.target === dialog && (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom)) closeDialog(dialog);
    });
  });
  $("#open-letter").addEventListener("click", (event) => { openDialog($("#letter-dialog"), event.currentTarget); });
  $("#letter-next").addEventListener("click", async () => {
    if (closingDialogs.has($("#letter-dialog"))) return;
    await closeDialog($("#letter-dialog"), "continue");
    $("#invitation").scrollIntoView({ behavior: motionPreference.matches ? "instant" : "smooth", block: "start" });
    $("#invitation-title").setAttribute("tabindex", "-1");
    $("#invitation-title").focus({ preventScroll: true });
  });

  const flowerMessages = [
    "Một bó hoa nhỏ, thật nhiều thương em ♡",
    "Bé Hai mang nụ cười, Heo mang thương em ✿",
    "Bốn năm rồi, vẫn muốn ngồi sát em xíu!",
    "Hoa dành cho Bé Hai. Chỗ cạnh Heo cũng vậy ♡"
  ];
  let messageIndex = 0;
  $("#bouquet-button").addEventListener("click", (event) => {
    const bubble = $("#bouquet-bubble");
    bubble.textContent = flowerMessages[messageIndex++ % flowerMessages.length];
    bubble.hidden = false;
    animateUI(bubble, [{ opacity: 0, transform: "translateY(8px) scale(.96)" }, { opacity: 1, transform: "none" }], { duration: 260 });
    window.clearTimeout(bubbleTimer);
    bubbleTimer = window.setTimeout(() => { bubble.hidden = true; }, 4000);
    const rect = event.currentTarget.getBoundingClientRect();
    burst(rect.left + rect.width / 2, rect.top + rect.height * 0.6, 10);
  });

  // Read the galleries in document order, exactly 1a, 1b, 2a, 2b, 3a, 3b.
  const memoryButtons = [...document.querySelectorAll(".memory-open")];
  let currentPhoto = 0;
  let photoRequest = 0;
  function showPhoto(index) {
    if (index < 0 || index >= memoryButtons.length) return;
    const direction = index >= currentPhoto ? 1 : -1;
    currentPhoto = index;
    const image = memoryButtons[index].querySelector("img");
    const full = $("#photo-full");
    const request = ++photoRequest;
    let revealed = false;
    uiAnimations.get(full)?.cancel();
    const revealPhoto = () => {
      if (request !== photoRequest || revealed) return;
      revealed = true;
      if ($("#photo-dialog").open) animateUI(full, [
        { opacity: 0, transform: `translateX(${direction * 16}px) scale(.985)` },
        { opacity: 1, transform: "none" }
      ], { duration: 280 });
    };
    full.onload = revealPhoto;
    full.onerror = () => { if (request === photoRequest) uiAnimations.get(full)?.cancel(); };
    // The lazy HEIC-derived thumbnail may not have selected its picture source
    // yet. Its srcset contains one local WebP; keep lightbox navigation light.
    const pictureSource = image.closest("picture")?.querySelector("source")?.getAttribute("srcset");
    full.src = image.currentSrc || pictureSource || image.src;
    full.alt = image.alt;
    full.width = Number(image.getAttribute("width")); full.height = Number(image.getAttribute("height"));
    $("#photo-title").textContent = `Kỷ niệm năm ${Math.floor(index / 2) + 1}: ${image.alt}`;
    $("#photo-caption").textContent = `Năm ${Math.floor(index / 2) + 1} · Khoảnh khắc ${index % 2 + 1} / 2`;
    const previous = $("#photo-prev"), next = $("#photo-next");
    const focused = document.activeElement;
    previous.disabled = index === 0;
    next.disabled = index === memoryButtons.length - 1;
    if (focused === previous && previous.disabled) next.focus({ preventScroll: true });
    if (focused === next && next.disabled) previous.focus({ preventScroll: true });
    if (full.complete && full.naturalWidth) queueMicrotask(revealPhoto);
  }
  memoryButtons.forEach((button, index) => button.addEventListener("click", () => { showPhoto(index); openDialog($("#photo-dialog"), button); }));
  $("#photo-prev").addEventListener("click", () => showPhoto(currentPhoto - 1));
  $("#photo-next").addEventListener("click", () => showPhoto(currentPhoto + 1));
  $("#photo-dialog").addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault(); showPhoto(currentPhoto + (event.key === "ArrowRight" ? 1 : -1));
    }
  });

  $("#map-details").addEventListener("toggle", (event) => {
    if (!event.currentTarget.open) return;
    if (!$("#map-frame iframe")) {
      const frame = document.createElement("iframe");
      frame.src = config.mapEmbed;
      frame.title = "Bản đồ đến Sushi Miyagi — địa điểm hẹn của Heo và Bé Hai";
      frame.loading = "lazy";
      frame.referrerPolicy = "strict-origin-when-cross-origin";
      frame.allowFullscreen = true;
      $("#map-frame").replaceChildren(frame);
    }
    animateUI($("#map-frame"), [{ opacity: 0, transform: "translateY(10px)" }, { opacity: 1, transform: "none" }], { duration: 300 });
  });

  const acceptMessage = `Heo ơi, Bé Hai nhận lời nha ♡ Hẹn Heo Chủ nhật 18/10/2026 lúc ${config.time} tại ${config.restaurant}. Thương Heo!`;
  function showReply(mode, trigger) {
    const accepted = mode === "accept";
    $("#reply-eyebrow").textContent = accepted ? "HẸN EM, NGƯỜI THƯƠNG" : "MÌNH CHỌN LÚC THẬT THẢNH THƠI";
    $("#reply-title").textContent = accepted ? "Heo vui quá trời!" : "Giờ nào cũng được, có em là vui.";
    $("#reply-description").textContent = accepted ? "Vậy mình hẹn nhau tối Chủ nhật nha.\nBé Hai chỉ cần mang theo nụ cười thôi." : "Bé Hai nhắn Heo giờ em thấy tiện nhé.\nChiếc hẹn này vẫn dành riêng cho em.";
    $("#reply-message").value = accepted ? acceptMessage : "Heo ơi, Bé Hai muốn đổi giờ hẹn ngày 18/10 một chút. Mình bàn lại qua tin nhắn nha ♡";
    $("#copy-status").textContent = "Sao chép rồi gửi qua tin nhắn cho Heo nhé.";
    $("#copy-reply").textContent = "Sao chép lời nhắn ♡";
    openDialog($("#reply-dialog"), trigger);
    if (accepted) burst(window.innerWidth / 2, window.innerHeight * 0.4, 38);
  }
  $("#accept-invitation").addEventListener("click", (event) => { showReply("accept", event.currentTarget); });
  $("#change-time").addEventListener("click", (event) => { showReply("change", event.currentTarget); });
  $("#copy-reply").addEventListener("click", async () => {
    const message = $("#reply-message");
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
      await navigator.clipboard.writeText(message.value);
      $("#copy-status").textContent = "Đã sao chép. Bé Hai gửi lời nhắn này cho Heo nha ♡";
      $("#copy-reply").textContent = "Đã sao chép ♡";
      animateUI($("#copy-status"), [{ opacity: 0, transform: "translateY(4px)" }, { opacity: 1, transform: "none" }], { duration: 220 });
    } catch {
      message.focus();
      message.select();
      $("#copy-status").textContent = "Bé Hai nhấn giữ hoặc dùng Ctrl/Cmd+C để sao chép lời nhắn nhé.";
    }
  });

  // Short, original music-box melody. No remote audio or autoplay requirement.
  class MusicBox {
    constructor() { this.context = null; this.master = null; this.timer = null; this.suspendTimer = null; this.notes = new Set(); this.audio = null; this.enabled = false; this.step = 0; this.nextTime = 0; }
    async start() {
      window.clearTimeout(this.suspendTimer);
      if (config.musicSrc) {
        if (!this.audio) { this.audio = new Audio(config.musicSrc); this.audio.loop = true; this.audio.volume = 0.3; }
        await this.audio.play(); this.enabled = true; return;
      }
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) throw new Error("Audio unavailable");
      if (!this.context) {
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.7;
        this.master.connect(this.context.destination);
        this.context.addEventListener("statechange", () => {
          if (this.enabled && !document.hidden && this.context.state !== "running") { this.stop(); syncMusicUI(); }
        });
      }
      await this.context.resume();
      this.enabled = true;
      this.nextTime = this.context.currentTime + 0.06;
      this.schedule();
      this.timer = window.setInterval(() => this.schedule(), 100);
    }
    tone(midi, start, duration, volume) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = 440 * 2 ** ((midi - 69) / 12);
      gain.gain.setValueAtTime(0, start);
      gain.gain.linearRampToValueAtTime(volume, start + 0.014);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain); gain.connect(this.master);
      oscillator.start(start); oscillator.stop(start + duration + 0.03);
      this.notes.add(oscillator);
      oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); this.notes.delete(oscillator); };
    }
    schedule() {
      if (!this.enabled || this.context.state !== "running") return;
      const melody = [72,76,79,76,74,77,81,77,71,74,79,74,72,76,79,0,76,79,84,79,77,81,84,81,74,77,83,79,76,74,72,0];
      const chords = [[48,55,60],[53,60,65],[55,62,67],[48,55,60]];
      while (this.nextTime < this.context.currentTime + 0.35) {
        const index = this.step % melody.length;
        if (melody[index]) { this.tone(melody[index], this.nextTime, 1.3, 0.095); this.tone(melody[index] + 12, this.nextTime, 0.65, 0.012); }
        if (index % 8 === 0) chords[Math.floor(index / 8)].forEach((note, offset) => this.tone(note, this.nextTime + offset * 0.055, 3.2, 0.028));
        this.nextTime += 0.43; this.step += 1;
      }
    }
    stop() {
      this.enabled = false;
      if (this.audio) this.audio.pause();
      window.clearInterval(this.timer); this.timer = null;
      if (this.context && this.master) {
        // Fade and stop queued tones, then suspend to release audio resources.
        const now = this.context.currentTime;
        this.master.gain.cancelScheduledValues(now);
        this.master.gain.setTargetAtTime(0.0001, now, 0.015);
        for (const note of this.notes) { try { note.stop(now + 0.08); } catch { /* Already ended. */ } }
        window.clearTimeout(this.suspendTimer);
        this.suspendTimer = window.setTimeout(() => {
          if (!this.enabled && this.context.state === "running") this.context.suspend().catch(() => {});
        }, 110);
      }
    }
  }
  const music = new MusicBox();
  function syncMusicUI() {
    musicButton.setAttribute("aria-pressed", String(music.enabled));
    $("#music-label").textContent = music.enabled ? "Nhạc đang bật" : "Bật chút nhạc";
    musicButton.setAttribute("aria-label", music.enabled ? "Tắt nhạc nền" : "Bật nhạc nền");
  }
  let musicBusy = false;
  musicButton.addEventListener("click", async () => {
    if (musicBusy) return;
    musicBusy = true; musicButton.disabled = true;
    try {
      if (music.enabled) music.stop();
      else {
        if (music.master) { music.master.gain.cancelScheduledValues(music.context.currentTime); music.master.gain.setValueAtTime(0.7, music.context.currentTime); }
        await music.start();
      }
      $("#music-status").textContent = music.enabled ? "Đã bật nhạc nền." : "Đã tắt nhạc nền.";
    } catch {
      music.stop();
      $("#music-status").textContent = "Chưa phát được nhạc. Em thử bấm lại nhé.";
    } finally { syncMusicUI(); musicBusy = false; musicButton.disabled = false; }
  });
  syncMusicUI();

  // Pointer decoration is progressive enhancement. Native pointer remains usable.
  const cursor = $("#flower-cursor");
  let pointer = { x: -50, y: -50 };
  let cursorFrame = 0;
  let lastTrailTime = 0;
  function drawCursor() {
    cursor.style.transform = `translate3d(${pointer.x + 10}px,${pointer.y + 10}px,0) rotate(${pointer.x / 12}deg)`;
    cursorFrame = 0;
  }
  function particle(x, y, symbol, distance, delay = 0) {
    if (!Element.prototype.animate || motionPreference.matches || document.hidden || layer.childElementCount >= 65) return;
    const element = document.createElement("span");
    element.className = "particle"; element.textContent = symbol;
    element.style.fontSize = `${12 + Math.random() * 14}px`;
    element.style.color = ["#9e405b", "#bd7a90", "#cf9cac", "#b18b57"][Math.floor(Math.random() * 4)];
    layer.append(element);
    const angle = Math.random() * Math.PI * 2;
    const dx = Math.cos(angle) * distance, dy = Math.sin(angle) * distance;
    const animation = element.animate([
      { transform: `translate(${x}px,${y}px) scale(.2) rotate(0deg)`, opacity: 0 },
      { transform: `translate(${x + dx * .25}px,${y + dy * .25}px) scale(1) rotate(45deg)`, opacity: .85, offset: .2 },
      { transform: `translate(${x + dx}px,${y + dy + 45}px) scale(.65) rotate(150deg)`, opacity: 0 }
    ], { duration: distance > 60 ? 1600 : 1000, delay, easing: "cubic-bezier(.16,.6,.4,1)" });
    animation.onfinish = () => element.remove();
    animation.oncancel = () => element.remove();
  }
  function burst(x, y, count) {
    if (motionPreference.matches) return;
    for (let i = 0; i < count; i++) particle(x, y, i % 3 === 0 ? "♡" : "✿", 70 + Math.random() * 140, i * 9);
  }
  document.addEventListener("pointermove", (event) => {
    if (!finePointer.matches || motionPreference.matches || event.pointerType !== "mouse") return;
    pointer = { x: event.clientX, y: event.clientY };
    cursor.classList.add("is-visible");
    if (!cursorFrame) cursorFrame = requestAnimationFrame(drawCursor);
    const now = performance.now();
    if (now - lastTrailTime > 110) { particle(event.clientX + 8, event.clientY + 8, "✿", 28); lastTrailTime = now; }
  }, { passive: true });
  document.addEventListener("pointerleave", () => cursor.classList.remove("is-visible"));
  document.addEventListener("pointerdown", (event) => {
    if (event.target.closest("dialog") && !event.target.closest("button")) return;
    burst(event.clientX, event.clientY, event.pointerType === "mouse" ? 7 : 5);
  }, { passive: true });
  motionPreference.addEventListener("change", () => {
    syncMotion(); cursor.classList.remove("is-visible"); layer.replaceChildren();
    if (motionPreference.matches) settleUI();
  });
  finePointer.addEventListener("change", () => cursor.classList.remove("is-visible"));
  document.addEventListener("visibilitychange", () => {
    document.body.classList.toggle("is-hidden-tab", document.hidden);
    cursor.classList.remove("is-visible"); syncMotion();
    if (document.hidden) {
      settleUI();
      layer.replaceChildren();
      // A hidden tab stops music. Resuming remains an explicit listener action.
      if (music.enabled) { music.stop(); syncMusicUI(); }
    } else updateCountdown();
  });
  // Browsers pause timers in bfcache and resume them on Back; retain the timer.
  window.addEventListener("pagehide", () => { settleUI(); music.stop(); syncMusicUI(); });
  window.addEventListener("pageshow", () => { updateCountdown(); syncMotion(); syncMusicUI(); });
})();
