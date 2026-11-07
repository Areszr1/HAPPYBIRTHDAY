export function createAudioController(config, onStatus) {
  const audio = new Audio(config.src);
  audio.loop = config.loop;
  audio.preload = "none";
  audio.volume = config.volume;
  let muted = false;
  let fadeFrame = 0;

  audio.addEventListener("error", () => {
    onStatus("Musik belum dapat dimuat. Periksa file audio di js/config.js.");
  });

  function fadeIn() {
    cancelAnimationFrame(fadeFrame);
    if (!config.fadeIn || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      audio.volume = config.volume;
      return;
    }
    const started = performance.now();
    const duration = 1200;
    const step = (now) => {
      const progress = Math.min((now - started) / duration, 1);
      audio.volume = config.volume * progress;
      if (progress < 1 && !audio.paused) fadeFrame = requestAnimationFrame(step);
    };
    fadeFrame = requestAnimationFrame(step);
  }

  async function play() {
    const shouldFade = config.fadeIn && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    audio.volume = shouldFade ? 0 : config.volume;
    try {
      await audio.play();
      fadeIn();
      onStatus("Musik diputar.");
      return true;
    } catch {
      audio.volume = config.volume;
      onStatus("Musik belum dapat diputar. Periksa file audio di js/config.js.");
      return false;
    }
  }

  async function toggle() {
    if (audio.paused) {
      muted = false;
      audio.muted = false;
      return play();
    }
    muted = !muted;
    audio.muted = muted;
    onStatus(muted ? "Musik dibisukan." : "Musik dinyalakan.");
    return !muted;
  }

  function updateButton(button) {
    button.setAttribute("aria-pressed", String(muted));
    button.setAttribute("aria-label", muted ? "Nyalakan musik" : audio.paused ? "Putar musik" : "Bisukan musik");
    button.querySelector("span").textContent = muted ? "♪" : "♫";
  }

  return { play, toggle, updateButton };
}
