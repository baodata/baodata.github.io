// Central projects configuration data (with robust fallbacks against GitHub rate-limits)
const PROJECTS_DATA = [
  {
    title: 'This website',
    repo: 'baodata/baodata.github.io',
    url: 'https://github.com/baodata/baodata.github.io',
    description: "It's a website, not much to say about it.",
    languages: { CSS: 47.8, HTML: 29.4, JavaScript: 22.8 }
  },
  {
    title: 'Pikachu',
    repo: 'baodata/phikachuuuu',
    url: 'https://github.com/baodata/phikachuuuu',
    description: 'My first programming project, a basic Match-2 game',
    languages: { 'C++': 93.3, C: 6.7 }
  },
  {
    title: 'Trading bots',
    repo: 'baodata/labaodutCrypto',
    url: 'https://github.com/baodata/labaodutCrypto',
    description: 'An attempt to learn more about deep learning, GNNs, and PPO',
    languages: { Python: 100 }
  },
  {
    title: 'Dummy',
    repo: null,
    url: null,
    description: 'This is what my forth project would look like, if I had one.',
    languages: { 'Line 1': 60, 'Line 2': 40 }
  }
];

// GitHub and custom language color mappings
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
  Ruby: '#701516',
  'Line 1': '#3178c6',
  'Line 2': '#dea584'
};

/**
 * Renders language progress bar and tags into their respective container elements
 * Supports both byte counts (from GitHub API) and percentage objects
 */
function renderLanguages(langBar, langTags, langData) {
  if (!langBar || !langTags || !langData) return;

  langBar.innerHTML = '';
  langTags.innerHTML = '';

  const entries = Object.entries(langData);
  if (!entries.length) return;

  const total = entries.reduce((sum, [, val]) => sum + val, 0);
  if (total <= 0) return;

  entries.forEach(([lang, val]) => {
    const percent = ((val / total) * 100).toFixed(1);
    if (parseFloat(percent) < 1.0) return; // Skip negligible < 1%

    const color = GITHUB_LANG_COLORS[lang] || '#10b981';

    // Segment in bar
    const segment = document.createElement('span');
    segment.className = 'lang-segment';
    segment.style.width = `${percent}%`;
    segment.style.backgroundColor = color;
    segment.title = `${lang}: ${percent}%`;
    langBar.appendChild(segment);

    // Tag label
    const tag = document.createElement('span');
    tag.className = 'lang-tag';
    tag.innerHTML = `<span class="lang-dot" style="background-color: ${color};"></span>${lang} ${percent}%`;
    langTags.appendChild(tag);
  });
}

/**
 * Builds a single project card DOM element
 */
function createProjectCard(project, index) {
  const card = document.createElement('article');
  card.className = 'project-card';
  card.dataset.index = index;
  if (project.repo) card.dataset.repo = project.repo;

  // Title & link
  const titleEl = document.createElement('h3');
  titleEl.className = 'project-title';

  if (project.url) {
    titleEl.innerHTML = `
      <a href="${project.url}" target="_blank" rel="noopener noreferrer" class="project-title-link">
        <span>${project.title}</span>
        <svg class="external-icon" xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
      </a>
    `;
  } else {
    titleEl.innerHTML = `
      <span class="project-title-link">
        <span>${project.title}</span>
      </span>
    `;
  }
  card.appendChild(titleEl);

  // Language bar
  const langBar = document.createElement('div');
  langBar.className = 'lang-bar';
  card.appendChild(langBar);

  // Language tags
  const langTags = document.createElement('div');
  langTags.className = 'lang-tags';
  card.appendChild(langTags);

  // Render language breakdown
  renderLanguages(langBar, langTags, project.languages);

  // Description
  const descEl = document.createElement('p');
  descEl.className = 'project-desc';
  descEl.textContent = project.description || '';
  card.appendChild(descEl);

  return card;
}

/**
 * Populates the horizontal track with cards generated from PROJECTS_DATA
 */
function renderAllProjectCards() {
  const track = document.getElementById('projects-track');
  if (!track) return false;

  track.innerHTML = '';
  PROJECTS_DATA.forEach((project, index) => {
    const card = createProjectCard(project, index);
    track.appendChild(card);
  });

  return true;
}

/**
 * Syncs latest data from GitHub API in the background with localStorage cache (6h TTL)
 * Gracefully preserves existing fallback data if rate limited or offline
 */
async function syncGitHubData() {
  const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
  const reposToSync = PROJECTS_DATA.filter(p => Boolean(p.repo));

  await Promise.all(reposToSync.map(async (project) => {
    const cacheKey = `gh_cache_${project.repo}`;
    let cached = null;

    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        cached = JSON.parse(raw);
      }
    } catch {
      // localStorage may be disabled or quota reached
    }

    const isCacheValid = cached && cached.timestamp && (Date.now() - cached.timestamp < CACHE_TTL_MS);

    if (isCacheValid) {
      applyRepoUpdate(project.repo, cached.data);
      return;
    }

    try {
      const [repoRes, langRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${project.repo}`),
        fetch(`https://api.github.com/repos/${project.repo}/languages`)
      ]);

      if (repoRes.ok && langRes.ok) {
        const repoData = await repoRes.json();
        const langData = await langRes.json();
        const payload = { repoData, langData };

        try {
          localStorage.setItem(cacheKey, JSON.stringify({ timestamp: Date.now(), data: payload }));
        } catch {}

        applyRepoUpdate(project.repo, payload);
      }
    } catch {
      // Gracefully silent: Keep default reliable card content
    }
  }));
}

/**
 * Updates matching cards with fresh GitHub metadata
 */
function applyRepoUpdate(repoPath, { repoData, langData }) {
  const cards = document.querySelectorAll(`[data-repo="${repoPath}"]`);
  cards.forEach(card => {
    if (repoData && repoData.description) {
      const descEl = card.querySelector('.project-desc');
      if (descEl) descEl.textContent = repoData.description;
    }

    if (langData && Object.keys(langData).length > 0) {
      const langBar = card.querySelector('.lang-bar');
      const langTags = card.querySelector('.lang-tags');
      renderLanguages(langBar, langTags, langData);
    }
  });
}

/**
 * Initializes infinite looping carousel with drag, navigation arrows, and dots
 */
function initProjectsCarousel() {
  const track = document.getElementById('projects-track');
  if (!track || track.dataset.carouselInit === 'true') return;

  const originalCards = Array.from(track.querySelectorAll('.project-card:not(.is-clone)'));
  if (originalCards.length < 2) return;

  track.dataset.carouselInit = 'true';

  // Prepend 2 clone sets (infinite left buffer)
  for (let s = 0; s < 2; s++) {
    originalCards.slice().reverse().forEach(card => {
      const clone = card.cloneNode(true);
      clone.classList.add('is-clone');
      track.prepend(clone);
    });
  }

  // Append 2 clone sets (infinite right buffer)
  for (let s = 0; s < 2; s++) {
    originalCards.forEach(card => {
      const clone = card.cloneNode(true);
      clone.classList.add('is-clone');
      track.appendChild(clone);
    });
  }

  function getCardStep() {
    const firstCard = track.querySelector('.project-card');
    if (!firstCard) return 300;
    const style = window.getComputedStyle(track);
    const gap = parseFloat(style.gap) || 20;
    return firstCard.getBoundingClientRect().width + gap;
  }

  function getSetWidth() {
    return getCardStep() * originalCards.length;
  }

  // Setup indicator dots
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

  function scrollToOriginalIndex(targetIdx) {
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

  function updateDots() {
    const dots = document.querySelectorAll('.carousel-dot');
    if (!dots.length) return;

    const trackRect = track.getBoundingClientRect();
    const visibleIndices = new Set();
    const allCards = track.querySelectorAll('.project-card');

    allCards.forEach(card => {
      const cardRect = card.getBoundingClientRect();
      const overlap = Math.max(0, Math.min(cardRect.right, trackRect.right) - Math.max(cardRect.left, trackRect.left));
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

  function normalizeScroll() {
    const setWidth = getSetWidth();
    if (setWidth <= 0) return;

    if (track.scrollLeft >= 3 * setWidth) {
      track.scrollLeft -= setWidth;
    } else if (track.scrollLeft < setWidth) {
      track.scrollLeft += setWidth;
    }
    updateDots();
  }

  function resetToCenter() {
    const setWidth = getSetWidth();
    if (setWidth > 0) {
      track.scrollLeft = setWidth * 2;
      updateDots();
    }
  }

  resetToCenter();
  requestAnimationFrame(resetToCenter);
  setTimeout(resetToCenter, 100);

  // Setup navigation arrows
  const prevBtn = document.getElementById('projects-prev');
  const nextBtn = document.getElementById('projects-next');

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const step = getCardStep();
      const setWidth = getSetWidth();
      if (track.scrollLeft >= 3 * setWidth - step) {
        track.scrollLeft -= setWidth;
      }
      track.scrollBy({ left: step, behavior: 'smooth' });
      requestAnimationFrame(updateDots);
    });
  }

  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      const step = getCardStep();
      const setWidth = getSetWidth();
      if (track.scrollLeft <= setWidth) {
        track.scrollLeft += setWidth;
      }
      track.scrollBy({ left: -step, behavior: 'smooth' });
      requestAnimationFrame(updateDots);
    });
  }

  // Setup drag-to-scroll
  let isDown = false;
  let startX = 0;
  let scrollStart = 0;
  let hasDragged = false;

  track.addEventListener('mousedown', (e) => {
    isDown = true;
    hasDragged = false;
    startX = e.pageX - track.offsetLeft;
    scrollStart = track.scrollLeft;
  });

  window.addEventListener('mouseup', () => {
    if (!isDown) return;
    isDown = false;
    track.classList.remove('is-dragging');
    normalizeScroll();
  });

  track.addEventListener('mousemove', (e) => {
    if (!isDown) return;
    e.preventDefault();
    const x = e.pageX - track.offsetLeft;
    const walk = x - startX;

    if (Math.abs(walk) > 4) {
      hasDragged = true;
      track.classList.add('is-dragging');
    }

    let newScrollLeft = scrollStart - walk;
    const setWidth = getSetWidth();

    if (newScrollLeft >= 3 * setWidth) {
      newScrollLeft -= setWidth;
      scrollStart -= setWidth;
    } else if (newScrollLeft < setWidth) {
      newScrollLeft += setWidth;
      scrollStart += setWidth;
    }

    track.scrollLeft = newScrollLeft;
    requestAnimationFrame(updateDots);
  });

  track.addEventListener('click', (e) => {
    if (hasDragged) {
      e.preventDefault();
      e.stopPropagation();
    }
  }, true);

  let scrollTimeout = null;
  track.addEventListener('scroll', () => {
    requestAnimationFrame(updateDots);
    if (isDown) return;
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(normalizeScroll, 80);
  }, { passive: true });

  window.addEventListener('resize', () => {
    normalizeScroll();
    updateDots();
  });
}

/**
 * Master initialization
 */
function setupProjects() {
  const rendered = renderAllProjectCards();
  if (!rendered) return;

  initProjectsCarousel();
  syncGitHubData();
}

document.addEventListener('componentsLoaded', setupProjects);
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(setupProjects, 350);
});
