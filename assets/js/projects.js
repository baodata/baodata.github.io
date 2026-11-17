// GitHub language color mappings
const GITHUB_LANG_COLORS = {
  CSS: '#563d7c',
  HTML: '#e34c26',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  Python: '#3572A5',
  Go: '#00ADD8',
  Shell: '#89e051',
  Rust: '#dea584',
  C: '#555555',
  'C++': '#f34b7d',
  Java: '#b07219',
  Vue: '#41b883',
  Ruby: '#701516'
};

// In-memory cache for GitHub API responses to prevent redundant requests
const repoDataCache = new Map();

// Render fetched repository metadata into a project card
function renderRepoCard(card, { repoData, langData }) {
  if (!card) return;

  // Update repository description
  const descEl = card.querySelector('.project-desc');
  if (descEl && repoData.description) {
    descEl.textContent = repoData.description;
  }

  // Update repository hyperlink
  const linkEl = card.querySelector('.project-title-link');
  if (linkEl && repoData.html_url) {
    linkEl.href = repoData.html_url;
  }

  // Compute language percentage breakdown
  const totalBytes = Object.values(langData).reduce((sum, bytes) => sum + bytes, 0);
  if (totalBytes > 0) {
    const langBar = card.querySelector('.lang-bar');
    const langTags = card.querySelector('.lang-tags');

    if (langBar && langTags) {
      langBar.innerHTML = '';
      langTags.innerHTML = '';

      Object.entries(langData).forEach(([lang, bytes]) => {
        const percent = ((bytes / totalBytes) * 100).toFixed(1);
        if (parseFloat(percent) < 1.0) return; // Skip negligible < 1%

        const color = GITHUB_LANG_COLORS[lang] || '#10b981';

        // Add colored progress bar segment
        const segment = document.createElement('span');
        segment.className = 'lang-segment';
        segment.style.width = `${percent}%`;
        segment.style.backgroundColor = color;
        segment.title = `${lang}: ${percent}%`;
        langBar.appendChild(segment);

        // Add tag label below progress bar
        const tag = document.createElement('span');
        tag.className = 'lang-tag';
        tag.innerHTML = `<span class="lang-dot" style="background-color: ${color};"></span>${lang} ${percent}%`;
        langTags.appendChild(tag);
      });
    }
  }
}

// Fetch GitHub metadata and languages for all cards with data-repo
async function fetchAllRepoData() {
  const cards = document.querySelectorAll('[data-repo]');
  if (!cards.length) return;

  const uniqueRepos = [...new Set(Array.from(cards).map(c => c.getAttribute('data-repo')).filter(Boolean))];

  await Promise.all(uniqueRepos.map(async (repoPath) => {
    let data = repoDataCache.get(repoPath);

    if (!data) {
      try {
        const [repoRes, langRes] = await Promise.all([
          fetch(`https://api.github.com/repos/${repoPath}`),
          fetch(`https://api.github.com/repos/${repoPath}/languages`)
        ]);

        if (repoRes.ok && langRes.ok) {
          const repoData = await repoRes.json();
          const langData = await langRes.json();
          data = { repoData, langData };
          repoDataCache.set(repoPath, data);
        }
      } catch (err) {
        console.warn(`Could not fetch GitHub data for ${repoPath}:`, err);
      }
    }

    if (data) {
      document.querySelectorAll(`[data-repo="${repoPath}"]`).forEach(card => {
        renderRepoCard(card, data);
      });
    }
  }));
}

// Initialize infinite looping carousel with mouse drag, navigation controls, and pagination dots
function initProjectsCarousel() {
  const frame = document.getElementById('projects-frame');
  const track = document.getElementById('projects-track');
  const dotsContainer = document.getElementById('carousel-dots');
  if (!frame || !track || track.dataset.carouselInit === 'true') return;

  const originalCards = Array.from(track.querySelectorAll('.project-card:not(.is-clone)'));
  const count = originalCards.length;
  if (count < 2) return;

  track.dataset.carouselInit = 'true';

  // Prepend 1 clone set and append 1 clone set for seamless infinite loop
  originalCards.slice().reverse().forEach(card => {
    const clone = card.cloneNode(true);
    clone.classList.add('is-clone');
    track.prepend(clone);
  });

  originalCards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.classList.add('is-clone');
    track.appendChild(clone);
  });

  let currentIndex = count; // Start at the original (middle) set
  let isTransitioning = false;

  // Dynamically calculate card dimensions so exactly 3 cards fit on desktop
  function updateCardSizing() {
    const frameWidth = frame.clientWidth;
    if (frameWidth <= 0) return;

    let visibleCount = 3;
    let gap = 20;

    if (window.innerWidth <= 600) {
      visibleCount = 1;
      gap = 12;
    } else if (window.innerWidth <= 880) {
      visibleCount = 2;
      gap = 16;
    }

    const totalGaps = (visibleCount - 1) * gap;
    const cardWidth = Math.floor((frameWidth - totalGaps) / visibleCount);

    const allCards = track.querySelectorAll('.project-card');
    allCards.forEach(c => {
      c.style.flex = `0 0 ${cardWidth}px`;
      c.style.width = `${cardWidth}px`;
      c.style.minWidth = `${cardWidth}px`;
      c.style.maxWidth = `${cardWidth}px`;
    });

    track.style.gap = `${gap}px`;
  }

  function getStep() {
    const first = track.querySelector('.project-card');
    if (!first) return 300;
    const gap = parseFloat(track.style.gap) || 20;
    return first.offsetWidth + gap;
  }

  function updateDots() {
    if (!dotsContainer) return;
    const dots = dotsContainer.querySelectorAll('.carousel-dot');
    const activeIdx = ((currentIndex - count) % count + count) % count;
    dots.forEach((dot, idx) => {
      if (idx === activeIdx) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  function updateTransform(animate = true) {
    const step = getStep();
    if (!animate) {
      track.classList.add('no-transition');
    } else {
      track.classList.remove('no-transition');
    }

    const offset = -(currentIndex * step);
    track.style.transform = `translateX(${offset}px)`;

    if (!animate) {
      track.offsetHeight; // Force DOM reflow
      track.classList.remove('no-transition');
    }
    updateDots();
  }

  function goToIndex(index, animate = true) {
    if (isTransitioning && animate) return;
    if (animate) isTransitioning = true;
    currentIndex = index;
    updateTransform(animate);
  }

  function next() {
    goToIndex(currentIndex + 1);
  }

  function prev() {
    goToIndex(currentIndex - 1);
  }

  // Handle loop reset at boundary after animation finishes
  track.addEventListener('transitionend', (e) => {
    if (e.target !== track || e.propertyName !== 'transform') return;
    isTransitioning = false;

    if (currentIndex >= count * 2) {
      currentIndex -= count;
      updateTransform(false);
    } else if (currentIndex < count) {
      currentIndex += count;
      updateTransform(false);
    }
  });

  // Next & Prev header buttons
  const prevBtn = document.getElementById('projects-prev');
  const nextBtn = document.getElementById('projects-next');
  if (nextBtn) nextBtn.addEventListener('click', next);
  if (prevBtn) prevBtn.addEventListener('click', prev);

  // Pagination dots click handler
  if (dotsContainer) {
    const dots = dotsContainer.querySelectorAll('.carousel-dot');
    dots.forEach((dot, idx) => {
      dot.addEventListener('click', () => {
        goToIndex(count + idx);
      });
    });
  }

  // Mouse & Touch Dragging gestures
  let isDown = false;
  let startX = 0;
  let diffX = 0;
  let hasMoved = false;

  function handleStart(clientX) {
    if (isTransitioning) return;
    isDown = true;
    hasMoved = false;
    startX = clientX;
    diffX = 0;
    frame.classList.add('is-dragging');
    track.classList.add('no-transition');
  }

  function handleMove(clientX, e) {
    if (!isDown) return;
    diffX = clientX - startX;
    if (Math.abs(diffX) > 6) {
      hasMoved = true;
      if (e && e.cancelable) e.preventDefault();
    }
    const step = getStep();
    const currentOffset = -(currentIndex * step);
    track.style.transform = `translateX(${currentOffset + diffX}px)`;
  }

  function handleEnd() {
    if (!isDown) return;
    isDown = false;
    frame.classList.remove('is-dragging');
    track.classList.remove('no-transition');

    const threshold = 45;
    if (diffX < -threshold) {
      next();
    } else if (diffX > threshold) {
      prev();
    } else {
      updateTransform(true); // Snap back if drag threshold wasn't met
    }
    diffX = 0;
  }

  frame.addEventListener('mousedown', (e) => handleStart(e.clientX));
  window.addEventListener('mousemove', (e) => handleMove(e.clientX, e));
  window.addEventListener('mouseup', handleEnd);

  frame.addEventListener('touchstart', (e) => {
    if (e.touches.length === 1) handleStart(e.touches[0].clientX);
  }, { passive: true });

  frame.addEventListener('touchmove', (e) => {
    if (e.touches.length === 1) handleMove(e.touches[0].clientX, e);
  }, { passive: false });

  frame.addEventListener('touchend', handleEnd);

  // Prevent link click when dragged
  track.addEventListener('click', (e) => {
    if (hasMoved) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // Handle window resizing
  window.addEventListener('resize', () => {
    updateCardSizing();
    updateTransform(false);
  });

  // Initial render
  updateCardSizing();
  updateTransform(false);
  requestAnimationFrame(() => {
    updateCardSizing();
    updateTransform(false);
  });
  setTimeout(() => {
    updateCardSizing();
    updateTransform(false);
  }, 100);
}

// Master initialization
async function setupProjects() {
  initProjectsCarousel();
  await fetchAllRepoData();
}

// Trigger setup on component loader event and DOMContentLoaded
document.addEventListener('componentsLoaded', setupProjects);
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(setupProjects, 350);
});
