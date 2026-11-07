import { CONFIG } from "./config.js";
import { createAudioController } from "./audio.js";
import { createParticles } from "./particles.js";

const SCENES = {
  INTRO: "intro",
  MAGIC: "magic",
  CELEBRATION: "celebration",
  GREETING: "greeting",
  LETTER: "letter",
};

const TRANSITIONS = {
  intro: ["magic"],
  magic: ["celebration"],
  celebration: ["greeting"],
  greeting: ["celebration", "letter"],
  letter: [],
};

const scenes = new Map(
  Object.values(SCENES).map((id) => [id, document.getElementById(id)]),
);
const status = document.querySelector(".sr-status");
const audioStatus = document.querySelector(".audio-status");
const audioButton = document.querySelector(".audio-toggle");
const particles = createParticles(document.querySelector(".particles"));
let audioStatusTimeout = 0;
const audio = createAudioController(CONFIG.music, (message) => {
  window.clearTimeout(audioStatusTimeout);
  audioStatus.hidden = !message.startsWith("Musik belum");
  if (!audioStatus.hidden) {
    audioStatus.textContent = message;
    audioStatusTimeout = window.setTimeout(() => {
      audioStatus.hidden = true;
    }, 5000);
  }
});
let currentScene = SCENES.INTRO;
let transitioning = false;

function getContent(path) {
  return path.split(".").reduce((value, key) => value?.[key], CONFIG);
}

function populateContent() {
  document.querySelectorAll("[data-content]").forEach((element) => {
    element.textContent = getContent(element.dataset.content) ?? "";
  });

  document.querySelectorAll("[data-image]").forEach((image) => {
    image.alt = `Potret ${CONFIG.recipientName}`;
    image.src = getContent(image.dataset.image);
    if (image.dataset.image === "greetingPortrait") {
      image.style.objectFit = CONFIG.greetingPortraitFit;
      image.style.objectPosition = CONFIG.greetingPortraitPosition;
    }
    image.addEventListener("error", () => {
      image.hidden = true;
      const fallback = image.parentElement.querySelector(".portrait-fallback");
      if (fallback) fallback.hidden = false;
    }, { once: true });
  });
}

function transitionTo(nextScene, { delay = 0, onStart, onEnter } = {}) {
  if (transitioning || !TRANSITIONS[currentScene].includes(nextScene)) return false;
  transitioning = true;
  if (currentScene === SCENES.CELEBRATION && nextScene !== SCENES.CELEBRATION) {
    particles.stopConfetti();
  }
  onStart?.();

  window.setTimeout(() => {
    document.body.classList.remove("is-opening");
    currentScene = nextScene;
    scenes.forEach((scene, id) => {
      scene.hidden = id !== nextScene;
      scene.classList.toggle("is-active", id === nextScene);
    });
    window.scrollTo({ top: 0, behavior: "instant" });

    const activeScene = scenes.get(nextScene);
    activeScene.classList.remove("is-transitioning");
    void activeScene.offsetWidth;
    activeScene.classList.add("is-transitioning");
    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      window.clearTimeout(fallback);
      activeScene.classList.remove("is-transitioning");
      transitioning = false;
    };
    const fallback = window.setTimeout(finish, 800);
    activeScene.addEventListener("animationend", (event) => {
      if (event.target === activeScene) finish();
    }, { once: true });

    audioButton.hidden = nextScene === SCENES.INTRO || nextScene === SCENES.MAGIC;
    audio.updateButton(audioButton);
    particles.setAmbient([SCENES.INTRO, SCENES.MAGIC, SCENES.CELEBRATION].includes(nextScene));
    const focusTarget = activeScene.querySelector("button") ?? activeScene.querySelector("h1, h2");
    window.requestAnimationFrame(() => focusTarget?.focus({ preventScroll: true }));
    status.textContent = `Scene: ${nextScene}`;
    onEnter?.();
  }, delay);
  return true;
}

function handleAction(action) {
  const transitions = {
    begin: () => transitionTo(SCENES.MAGIC, {
      delay: 650,
      onStart: () => {
        document.body.classList.add("is-opening");
        particles.burst(document.querySelector(".intro-trigger"), 0.7);
      },
    }),
    unwrap: () => {
      const gift = document.querySelector(".gift");
      const moved = transitionTo(SCENES.CELEBRATION, {
        delay: 520,
        onStart: () => {
          gift.classList.add("is-unwrapping");
          particles.burst(gift, 1.6);
          audio.play();
        },
        onEnter: particles.startConfetti,
      });
      if (moved) {
        window.setTimeout(() => gift.classList.remove("is-unwrapping"), 520);
      }
    },
    "show-greeting": () => transitionTo(SCENES.GREETING, {
      onStart: () => particles.burst(document.querySelector(".portrait-button"), 0.6),
    }),
    "close-greeting": () => transitionTo(SCENES.CELEBRATION, { onEnter: particles.startConfetti }),
    "open-letter": () => transitionTo(SCENES.LETTER, { onEnter: revealLetter }),
  };
  transitions[action]?.();
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof Element)) return;
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action) handleAction(action);
});

audioButton.addEventListener("click", async () => {
  await audio.toggle();
  audio.updateButton(audioButton);
});

function revealLetter() {
  const sections = document.querySelectorAll("[data-reveal]");
  if (!("IntersectionObserver" in window)) {
    sections.forEach((section) => section.classList.add("is-visible"));
    return;
  }
  const observer = new IntersectionObserver((entries, currentObserver) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      currentObserver.unobserve(entry.target);
    });
  }, { threshold: 0 });
  sections.forEach((section) => observer.observe(section));
}

populateContent();
