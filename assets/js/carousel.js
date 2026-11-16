// Drag-to-scroll and button navigation for the projects carousel
function initProjectsCarousel() {
  const carousel = document.getElementById('projects-carousel');
  const prevBtn = document.getElementById('carousel-prev');
  const nextBtn = document.getElementById('carousel-next');

  if (!carousel) return;

  // Arrow button clicks
  const scrollStep = 340;
  prevBtn?.addEventListener('click', () => {
    carousel.scrollBy({ left: -scrollStep, behavior: 'smooth' });
  });

  nextBtn?.addEventListener('click', () => {
    carousel.scrollBy({ left: scrollStep, behavior: 'smooth' });
  });

  // Mouse drag-to-scroll physics
  let isDown = false;
  let startX = 0;
  let scrollLeft = 0;
  let hasMoved = false;

  carousel.addEventListener('mousedown', (e) => {
    isDown = true;
    hasMoved = false;
    carousel.classList.add('is-dragging');
    startX = e.pageX - carousel.offsetLeft;
    scrollLeft = carousel.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    carousel.classList.remove('is-dragging');
  });

  carousel.addEventListener('mouseleave', () => {
    if (!isDown) return;
    isDown = false;
    carousel.classList.remove('is-dragging');
  });

  carousel.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    hasMoved = true;
    const x = e.pageX - carousel.offsetLeft;
    const walk = (x - startX) * 1.4; // Multiplier for responsive glide
    carousel.scrollLeft = scrollLeft - walk;
  });

  // Prevent link click when dragging
  carousel.addEventListener('click', (e) => {
    if (hasMoved) {
      e.preventDefault();
      hasMoved = false;
    }
  }, true);
}

// Initialize when components are fully injected by loader
document.addEventListener('DOMContentLoaded', () => {
  // Check periodically or observe when loader finishes
  const checkExist = setInterval(() => {
    if (document.getElementById('projects-carousel')) {
      clearInterval(checkExist);
      initProjectsCarousel();
    }
  }, 100);
});
