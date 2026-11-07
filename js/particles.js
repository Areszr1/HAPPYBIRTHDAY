const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

export function createParticles(canvas) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas 2D context is not available.");

  const styles = getComputedStyle(document.documentElement);
  const colors = ["--color-gold", "--color-silver", "--color-white"]
    .map((token) => styles.getPropertyValue(token).trim());
  const particles = [];
  let width = 0;
  let height = 0;
  let frame = 0;
  let lastTime = 0;
  let active = true;
  let ambient = true;
  let confettiTimer = 0;

  const particleLimit = () => window.innerWidth < 600 ? 52 : 104;

  function resize() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * ratio);
    canvas.height = Math.round(height * ratio);
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
  }

  function addParticle(x, y, options = {}) {
    if (particles.length >= particleLimit()) particles.shift();
    const angle = Math.random() * Math.PI * 2;
    const speed = options.speed ?? 0.3 + Math.random() * 1.6;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: options.falling ? 1 + Math.random() * 2 : Math.sin(angle) * speed,
      size: 1 + Math.random() * 2.5,
      color: colors[Math.floor(Math.random() * colors.length)],
      life: 0,
      maxLife: options.life ?? 90 + Math.random() * 70,
      falling: Boolean(options.falling),
      sparkle: Boolean(options.sparkle),
      sway: Math.random() * Math.PI * 2,
    });
  }

  function drawSparkle(particle) {
    const radius = particle.size * (0.7 + Math.sin(particle.life / 5 + particle.sway) * 0.3);
    context.beginPath();
    context.moveTo(particle.x, particle.y - radius * 2);
    context.lineTo(particle.x, particle.y + radius * 2);
    context.moveTo(particle.x - radius * 2, particle.y);
    context.lineTo(particle.x + radius * 2, particle.y);
    context.strokeStyle = particle.color;
    context.lineWidth = Math.max(0.75, particle.size / 2);
    context.stroke();
  }

  function draw(time) {
    if (!active || document.hidden) {
      frame = 0;
      return;
    }

    if (time - lastTime < 30) {
      frame = requestAnimationFrame(draw);
      return;
    }

    const delta = Math.min((time - (lastTime || time)) / 16.67, 2);
    lastTime = time;
    context.clearRect(0, 0, width, height);

    if (ambient && !reducedMotion.matches && particles.length < 18 && Math.random() < 0.12) {
      addParticle(Math.random() * width, Math.random() * height, { sparkle: true });
    }

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      const particle = particles[index];
      particle.life += delta;
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      if (particle.falling) particle.x += Math.sin(particle.life / 12 + particle.sway) * 0.6 * delta;
      context.globalAlpha = Math.max(0, 1 - particle.life / particle.maxLife);
      context.fillStyle = particle.color;
      if (particle.falling) {
        context.save();
        context.translate(particle.x, particle.y);
        context.rotate(particle.life / 18 + particle.sway);
        context.fillRect(-particle.size, -particle.size / 2, particle.size * 2, particle.size);
        context.restore();
      } else if (particle.sparkle) {
        drawSparkle(particle);
      } else {
        context.beginPath();
        context.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        context.fill();
      }
      if (particle.life >= particle.maxLife || particle.y > height + 12) particles.splice(index, 1);
    }
    context.globalAlpha = 1;

    const keepRunning = particles.length || confettiTimer || (ambient && !reducedMotion.matches);
    if (keepRunning) frame = requestAnimationFrame(draw);
    else frame = 0;
  }

  function start() {
    active = true;
    if (!frame) frame = requestAnimationFrame(draw);
  }

  function burst(element, scale = 1) {
    const bounds = element.getBoundingClientRect();
    const count = Math.round((reducedMotion.matches ? 8 : 32) * scale);
    for (let i = 0; i < count; i += 1) {
      addParticle(bounds.left + bounds.width / 2, bounds.top + bounds.height / 2, {
        speed: 1 + Math.random() * 3,
        life: 70,
        sparkle: true,
      });
    }
    start();
  }

  function startConfetti() {
    stopConfetti();
    const drop = (count) => {
      for (let i = 0; i < count; i += 1) {
        addParticle(Math.random() * width, -Math.random() * height, { falling: true, life: 300 });
      }
    }
    drop(reducedMotion.matches ? 8 : 36);
    if (!reducedMotion.matches) {
      confettiTimer = window.setInterval(() => {
        if (active && !document.hidden) drop(7);
      }, 1200);
    }
    start();
  }

  function stopConfetti() {
    window.clearInterval(confettiTimer);
    confettiTimer = 0;
    for (let index = particles.length - 1; index >= 0; index -= 1) {
      if (particles[index].falling) particles.splice(index, 1);
    }
    start();
  }

  function setAmbient(enabled) {
    ambient = enabled;
    start();
  }

  function setActive(value) {
    active = value;
    if (active) start();
    else if (frame) {
      cancelAnimationFrame(frame);
      frame = 0;
    }
  }

  resize();
  window.addEventListener("resize", resize);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) setActive(false);
    else setActive(true);
  });
  reducedMotion.addEventListener("change", () => {
    if (reducedMotion.matches) particles.splice(0, Math.max(0, particles.length - 12));
    start();
  });
  start();

  return { burst, startConfetti, stopConfetti, setAmbient, setActive };
}
