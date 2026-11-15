// Floating background logos with repulsion physics against header and footer
function initFloaters() {
  const container = document.getElementById('floaters-container');
  if (!container) return;

  const logoSrc = 'assets/images/floaters/logo.png';
  const count = 3;
  const floaters = [];

  const headerHeight = 64;
  const footerHeight = 56;
  const boundaryBuffer = 12;

  // Initialize 3 floating logo instances with subtle variation
  for (let i = 0; i < count; i++) {
    const img = document.createElement('img');
    img.src = logoSrc;
    img.alt = 'Floating Logo';
    img.className = 'floater-logo';

    // Small subtle size: 38px, 44px, 50px
    const size = 38 + i * 6;
    img.style.width = `${size}px`;
    img.style.height = `${size}px`;

    container.appendChild(img);

    const minSpawnY = headerHeight + boundaryBuffer + 40;
    const maxSpawnY = Math.max(minSpawnY + 80, window.innerHeight - footerHeight - boundaryBuffer - size - 40);

    floaters.push({
      el: img,
      size: size,
      x: (window.innerWidth / (count + 1)) * (i + 1) + (Math.random() * 60 - 30),
      y: minSpawnY + Math.random() * (maxSpawnY - minSpawnY),
      vx: (Math.random() - 0.5) * 0.75 || 0.35,
      vy: (Math.random() - 0.5) * 0.75 || 0.35,
      rotation: Math.random() * 360,
      vRot: (Math.random() - 0.5) * 0.35 || 0.15
    });
  }

  // Animation frame loop with smooth boundary repulsion
  function animate() {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const topLimit = headerHeight + boundaryBuffer;
    const bottomLimit = height - footerHeight - boundaryBuffer;

    floaters.forEach((f) => {
      // Repulsion force from top header
      const distToTop = f.y - topLimit;
      if (distToTop < 80 && f.vy < 0) {
        f.vy += 0.05; // Gently repel downward
        if (f.y <= topLimit) {
          f.y = topLimit;
          f.vy = Math.abs(f.vy) * 0.85 + 0.3; // Bounce away
        }
      }

      // Repulsion force from bottom footer
      const distToBottom = bottomLimit - (f.y + f.size);
      if (distToBottom < 80 && f.vy > 0) {
        f.vy -= 0.05; // Gently repel upward
        if (f.y + f.size >= bottomLimit) {
          f.y = bottomLimit - f.size;
          f.vy = -Math.abs(f.vy) * 0.85 - 0.3; // Bounce away
        }
      }

      // Lateral screen edge bouncing
      if (f.x <= 15) {
        f.x = 15;
        f.vx = Math.abs(f.vx);
      } else if (f.x + f.size >= width - 15) {
        f.x = width - f.size - 15;
        f.vx = -Math.abs(f.vx);
      }

      // Update positions
      f.x += f.vx;
      f.y += f.vy;
      f.rotation += f.vRot;

      // Apply transform using GPU acceleration
      f.el.style.transform = `translate3d(${f.x}px, ${f.y}px, 0) rotate(${f.rotation}deg)`;
    });

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

document.addEventListener('DOMContentLoaded', initFloaters);
