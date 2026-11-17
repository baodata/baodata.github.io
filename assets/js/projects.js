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

  // Update repository hyperlink
  const linkEl = card.querySelector('.project-title-link');
  if (linkEl && repoData.html_url) {
    linkEl.href = repoData.html_url;
  }

  // Compute language percentage breakdown
  const totalBytes = Object.values(langData).reduce((sum, bytes) => sum + bytes, 0);
  if (totalBytes > 0) {
    let langBar = card.querySelector('.lang-bar');
    let langTags = card.querySelector('.lang-tags');

    // Create .lang-bar dynamically if not present
    if (!langBar) {
      langBar = document.createElement('div');
      langBar.className = 'lang-bar';
      const titleEl = card.querySelector('.project-title');
      if (titleEl && titleEl.nextSibling) {
        card.insertBefore(langBar, titleEl.nextSibling);
      } else {
        card.appendChild(langBar);
      }
    }

    // Create .lang-tags dynamically if not present
    if (!langTags) {
      langTags = document.createElement('div');
      langTags.className = 'lang-tags';
      if (langBar.nextSibling) {
        card.insertBefore(langTags, langBar.nextSibling);
      } else {
        card.appendChild(langTags);
      }
    }

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

  // Update or create repository description
  if (repoData.description) {
    let descEl = card.querySelector('.project-desc');
    if (!descEl) {
      descEl = document.createElement('p');
      descEl.className = 'project-desc';
      card.appendChild(descEl);
    }
    descEl.textContent = repoData.description;
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

// Initialize infinite looping carousel with mouse drag and navigation controls
function initProjectsCarousel() {
  const track = document.getElementById('projects-track');
  if (!track || track.dataset.carouselInit === 'true') return;

  const originalCards = Array.from(track.querySelectorAll('.project-card:not(.is-clone)'));
  if (originalCards.length < 2) return;

  track.dataset.carouselInit = 'true';

  // Prepend 2 clone sets (for ample infinite left scroll buffer)
  for (let s = 0; s < 2; s++) {
    originalCards.slice().reverse().forEach(card => {
      const clone = card.cloneNode(true);
      clone.classList.add('is-clone');
      track.prepend(clone);
    });
  }

  // Append 2 clone sets (for ample infinite right scroll buffer)
  for (let s = 0; s < 2; s++) {
    originalCards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.classList.add('is-clone');
      track.appendChild(clone);
    });
  }

  // Calculate width of one card + gap
  function getCardStep() {
    const firstCard = track.querySelector('.project-card');
    if (!firstCard) return 300;
    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.gap) || 20;
    return firstCard.getBoundingClientRect().width + gap;
  }

  // Calculate width of one entire set of cards
  function getSetWidth() {
    return getCardStep() * originalCards.length;
  }

  // Normalize position to maintain infinite seamless loop
  // Initialize indicator dots
  const dotsContainer = document.getElementById('projects-dots');
  if (dotsContainer) {
    dotsContainer.innerHTML = '';
    for (let i = 0; i < originalCards.length; i++) {
      const dot = document.createElement('button');
      dot.type = 'button';
      dot.className = 'carousel-dot';
      dot.setAttribute('aria-label', `Go to project ${i + 1}`);
      dot.dataset.dotIndex = i;
      dot.addEventListener('click', () => {
        scrollToOriginalIndex(i);
      });
      dotsContainer.appendChild(dot);
    }
  }

  // Smooth scroll to card matching original index closest to current viewport
  function scrollToOriginalIndex(targetIdx) {
    stopMomentum();
    const matchingCards = Array.from(track.querySelectorAll(`.project-card[data-index="${targetIdx}"]`));
    if (!matchingCards.length) return;
    let closestCard = matchingCards[0];
    let minDiff = Infinity;
    const currentLeft = track.scrollLeft;
    matchingCards.forEach(card => {
      const diff = Math.abs(card.offsetLeft - track.offsetLeft - currentLeft);
      if (diff < minDiff) {
        minDiff = diff;
        closestCard = card;
      }
    });
    track.scrollTo({ left: closestCard.offsetLeft - track.offsetLeft, behavior: 'smooth' });
  }

  // Update dots based on which cards are currently visible in viewport
  function updateDots() {
    const dots = document.querySelectorAll('.carousel-dot');
    if (!dots.length) return;

    const trackRect = track.getBoundingClientRect();
    const visibleIndices = new Set();
    const allCards = track.querySelectorAll('.project-card');

    allCards.forEach(card => {
      const cardRect = card.getBoundingClientRect();
      const overlap = Math.max(0, Math.min(cardRect.right, trackRect.right) - Math.max(cardRect.left, trackRect.left));
      // Card is considered visible if at least 35% of its width is within track bounds
      if (overlap > cardRect.width * 0.35) {
        const idx = parseInt(card.getAttribute('data-index'), 10);
        if (!isNaN(idx)) {
          visibleIndices.add(idx);
        }
      }
    });

    dots.forEach((dot, i) => {
      if (visibleIndices.has(i)) {
        dot.classList.add('active');
      } else {
        dot.classList.remove('active');
      }
    });
  }

  // Normalize position to maintain infinite seamless loop
  function normalizeScroll() {
    const setWidth = getSetWidth();
    if (setWidth <= 0) return;

    // Buffer range: [setWidth, 3 * setWidth)
    if (track.scrollLeft >= 3 * setWidth) {
      track.scrollLeft -= setWidth;
    } else if (track.scrollLeft < setWidth) {
      track.scrollLeft += setWidth;
    }
    updateDots();
  }

  // Target card index for arrow navigation to guarantee rounding
  let targetIndex = null;

  function getBaseIndex() {
    const step = getCardStep();
    if (step <= 0) return 0;
    return Math.round(track.scrollLeft / step);
  }

  // Set initial scroll position to the center set (index 2 of 5 sets), perfectly card-aligned
  function resetToCenter() {
    const setWidth = getSetWidth();
    const step = getCardStep();
    if (setWidth > 0 && step > 0) {
      targetIndex = null;
      track.scrollLeft = Math.round((setWidth * 2) / step) * step;
      updateDots();
    }
  }

  resetToCenter();
  requestAnimationFrame(resetToCenter);
  setTimeout(resetToCenter, 100);

  // Smooth momentum and pointer drag-to-scroll implementation
  let isDown = false;
  let startX = 0;
  let scrollStart = 0;
  let hasDragged = false;
  let lastX = 0;
  let lastTime = 0;
  let velocity = 0;
  let momentumRaf = null;

  function stopMomentum() {
    if (momentumRaf) {
      cancelAnimationFrame(momentumRaf);
      momentumRaf = null;
    }
  }

  // Smoothly snaps the closest card into view
  function snapToNearest() {
    stopMomentum();
    targetIndex = null;
    const step = getCardStep();
    if (step <= 0) return;

    normalizeScroll();
    const targetScroll = Math.round(track.scrollLeft / step) * step;
    track.scrollTo({ left: targetScroll, behavior: 'smooth' });
  }

  // Natural momentum glide with exponential friction
  function startMomentum() {
    stopMomentum();
    const minVelocity = 0.05;
    const friction = 0.94;
    let lastFrameTime = performance.now();

    function stepMomentum(now) {
      const dt = Math.min(now - lastFrameTime, 32);
      lastFrameTime = now;

      if (Math.abs(velocity) < minVelocity) {
        snapToNearest();
        return;
      }

      let newScroll = track.scrollLeft - (velocity * dt);
      const setWidth = getSetWidth();

      if (setWidth > 0) {
        if (newScroll >= 3 * setWidth) {
          newScroll -= setWidth;
        } else if (newScroll < setWidth) {
          newScroll += setWidth;
        }
      }

      track.scrollLeft = newScroll;
      updateDots();

      velocity *= Math.pow(friction, dt / 16);
      momentumRaf = requestAnimationFrame(stepMomentum);
    }

    momentumRaf = requestAnimationFrame(stepMomentum);
  }

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      stopMomentum();
      const step = getCardStep();
      const setWidth = getSetWidth();
      if (step <= 0 || setWidth <= 0) return;

      if (track.scrollLeft >= 3 * setWidth - step) {
        track.scrollLeft -= setWidth;
        if (targetIndex !== null) targetIndex = Math.round(track.scrollLeft / step);
      }

      const base = targetIndex !== null ? targetIndex : getBaseIndex();
      targetIndex = base + 1;
      const targetScroll = targetIndex * step;

      track.scrollTo({ left: targetScroll, behavior: 'smooth' });
      requestAnimationFrame(updateDots);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      stopMomentum();
      const step = getCardStep();
      const setWidth = getSetWidth();
      if (step <= 0 || setWidth <= 0) return;

      if (track.scrollLeft <= setWidth) {
        track.scrollLeft += setWidth;
        if (targetIndex !== null) targetIndex = Math.round(track.scrollLeft / step);
      }

      const base = targetIndex !== null ? targetIndex : getBaseIndex();
      targetIndex = base - 1;
      const targetScroll = targetIndex * step;

      track.scrollTo({ left: targetScroll, behavior: 'smooth' });
      requestAnimationFrame(updateDots);
    });
  }

  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;

    stopMomentum();
    targetIndex = null;
    isDown = true;
    hasDragged = false;
    startX = e.clientX;
    lastX = e.clientX;
    lastTime = performance.now();
    scrollStart = track.scrollLeft;
    velocity = 0;

    track.style.scrollBehavior = 'auto';

    try {
      track.setPointerCapture(e.pointerId);
    } catch {}
  });

  track.addEventListener('pointermove', (e) => {
    if (!isDown) return;

    const x = e.clientX;
    const now = performance.now();
    const walk = x - startX;

    if (Math.abs(walk) > 4) {
      hasDragged = true;
      track.classList.add('is-dragging');
    }

    if (hasDragged) {
      const dt = now - lastTime;
      if (dt > 0) {
        const instantVelocity = (x - lastX) / dt;
        velocity = velocity * 0.5 + instantVelocity * 0.5;
      }
      lastX = x;
      lastTime = now;

      let newScrollLeft = scrollStart - walk;
      const setWidth = getSetWidth();

      if (setWidth > 0) {
        if (newScrollLeft >= 3 * setWidth) {
          newScrollLeft -= setWidth;
          scrollStart -= setWidth;
        } else if (newScrollLeft < setWidth) {
          newScrollLeft += setWidth;
          scrollStart += setWidth;
        }
      }

      track.scrollLeft = newScrollLeft;
      requestAnimationFrame(updateDots);
    }
  });

  function endDrag(e) {
    if (!isDown) return;
    isDown = false;
    track.classList.remove('is-dragging');
    track.style.scrollBehavior = '';

    try {
      if (e && e.pointerId && track.hasPointerCapture(e.pointerId)) {
        track.releasePointerCapture(e.pointerId);
      }
    } catch {}

    if (hasDragged) {
      if (Math.abs(velocity) > 0.15) {
        startMomentum();
      } else {
        snapToNearest();
      }
    }
  }

  track.addEventListener('pointerup', endDrag);
  track.addEventListener('pointercancel', endDrag);

  // Prevent navigating to repo link if the mouse was dragged
  track.addEventListener('click', (e) => {
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  // Passive listener for touch/wheel scroll wrap
  let scrollTimeout = null;
  track.addEventListener('scroll', () => {
    requestAnimationFrame(updateDots);
    if (isDown || momentumRaf) return;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      targetIndex = null;
      normalizeScroll();
    }, 100);
  }, { passive: true });

  window.addEventListener('resize', () => {
    stopMomentum();
    targetIndex = null;
    normalizeScroll();
    updateDots();
  });
}

// Master initialization
async function setupProjects() {
  await fetchAllRepoData();
  initProjectsCarousel();
}

// Trigger setup on component loader event and DOMContentLoaded
document.addEventListener('componentsLoaded', setupProjects);
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(setupProjects, 350);
});
