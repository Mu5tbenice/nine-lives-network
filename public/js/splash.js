/* =============================================
   Nine Lives Network - Splash Page JS
   ============================================= */

document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  initMouseTracking();
  initMobileTracking();
});

/* -----------------------------------------
   Floating Particles
   ----------------------------------------- */
function initParticles() {
  const container = document.getElementById('particles');
  if (!container) return;

  const particleCount = 30;

  for (let i = 0; i < particleCount; i++) {
    const particle = document.createElement('div');
    particle.className = 'particle';

    // Random position
    particle.style.left = Math.random() * 100 + '%';
    particle.style.top = Math.random() * 100 + '%';

    // Random size
    const size = Math.random() * 4 + 2;
    particle.style.width = size + 'px';
    particle.style.height = size + 'px';

    // Random color (gold, cyan, purple variations)
    const colors = ['#ffd700', '#00d4ff', '#8A2BE2', '#ffffff'];
    particle.style.background = colors[Math.floor(Math.random() * colors.length)];

    // Random animation delay and duration
    particle.style.animationDelay = Math.random() * 8 + 's';
    particle.style.animationDuration = (Math.random() * 4 + 6) + 's';

    container.appendChild(particle);
  }
}

/* -----------------------------------------
   Mouse Tracking (Desktop)
   Makes the wizard cat subtly follow cursor
   ----------------------------------------- */
function initMouseTracking() {
  const wizardCat = document.getElementById('wizardCatImage');
  if (!wizardCat) return;

  let targetRotateX = 0;
  let targetRotateY = 0;
  let currentRotateX = 0;
  let currentRotateY = 0;

  // Track mouse position
  document.addEventListener('mousemove', (e) => {
    const rect = wizardCat.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    // Calculate offset from image center (max 20 degrees rotation)
    const maxRotation = 20;

    // Invert X for natural feel (mouse up = cat looks up)
    targetRotateX = -((e.clientY - centerY) / (window.innerHeight / 2)) * maxRotation;
    targetRotateY = ((e.clientX - centerX) / (window.innerWidth / 2)) * maxRotation;

    // Clamp values
    targetRotateX = Math.max(-maxRotation, Math.min(maxRotation, targetRotateX));
    targetRotateY = Math.max(-maxRotation, Math.min(maxRotation, targetRotateY));
  });

  // Reset when mouse leaves window
  document.addEventListener('mouseleave', () => {
    targetRotateX = 0;
    targetRotateY = 0;
  });

  // Smooth animation loop
  function animate() {
    // Ease towards target (0.08 = smooth, higher = snappier)
    currentRotateX += (targetRotateX - currentRotateX) * 0.08;
    currentRotateY += (targetRotateY - currentRotateY) * 0.08;

    // Apply 3D rotation transform
    wizardCat.style.transform = `rotateX(${currentRotateX}deg) rotateY(${currentRotateY}deg)`;

    requestAnimationFrame(animate);
  }

  animate();
}

/* -----------------------------------------
   Mobile Touch/Tilt Tracking
   ----------------------------------------- */
function initMobileTracking() {
  const wizardCat = document.getElementById('wizardCatImage');
  if (!wizardCat) return;

  // Check if device has gyroscope
  if (window.DeviceOrientationEvent) {
    // Request permission on iOS 13+
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      // We'll request permission on first touch
      document.body.addEventListener('click', requestTiltPermission, { once: true });
    } else {
      // Non-iOS devices
      enableTiltTracking(wizardCat);
    }
  }

  // Touch tracking as fallback
  let touchStartX = 0;
  let touchStartY = 0;

  document.addEventListener('touchstart', (e) => {
    touchStartX = e.touches[0].clientX;
    touchStartY = e.touches[0].clientY;
  });

  document.addEventListener('touchmove', (e) => {
    const touchX = e.touches[0].clientX;
    const touchY = e.touches[0].clientY;

    const deltaX = (touchX - touchStartX) / 10;
    const deltaY = (touchY - touchStartY) / 10;

    // Limit rotation
    const rotateX = Math.max(-20, Math.min(20, -deltaY));
    const rotateY = Math.max(-20, Math.min(20, deltaX));

    wizardCat.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });

  document.addEventListener('touchend', () => {
    // Smoothly return to center
    wizardCat.style.transition = 'transform 0.5s ease';
    wizardCat.style.transform = 'rotateX(0deg) rotateY(0deg)';

    setTimeout(() => {
      wizardCat.style.transition = '';
    }, 500);
  });
}

async function requestTiltPermission() {
  try {
    const permission = await DeviceOrientationEvent.requestPermission();
    if (permission === 'granted') {
      const wizardCat = document.getElementById('wizardCatImage');
      enableTiltTracking(wizardCat);
    }
  } catch (error) {
    console.log('Tilt permission denied or not supported');
  }
}

function enableTiltTracking(element) {
  window.addEventListener('deviceorientation', (e) => {
    // Get device tilt
    const tiltX = e.beta; // Front-to-back tilt (-180 to 180)
    const tiltY = e.gamma; // Left-to-right tilt (-90 to 90)

    // Normalize and limit rotation
    const rotateX = Math.max(-20, Math.min(20, tiltX / 4));
    const rotateY = Math.max(-20, Math.min(20, tiltY / 3));

    element.style.transform = `rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
  });
}

/* -----------------------------------------
   Export for testing
   ----------------------------------------- */
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initParticles,
    initMouseTracking,
    initMobileTracking
  };
}