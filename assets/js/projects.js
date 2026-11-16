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

// Initialize infinite looping carousel with mouse drag and navigation controls
function initProjectsCarousel() {
  const track = document.getElementById('projects-track');
  if (!track || track.dataset.carouselInit === 'true') return;

  const originalCards = Array.from(track.querySelectorAll('.project-card:not(.is-clone)'));
  if (originalCards.length < 2) return;

  track.dataset.carouselInit = 'true';

  // Prepend clones of the set (for infinite left scrolling)
  originalCards.slice().reverse().forEach(card => {
    const clone = card.cloneNode(true);
    clone.classList.add('is-clone');
    track.prepend(clone);
  });

  // Append clones of the set (for infinite right scrolling)
  originalCards.forEach(card => {
    const clone = card.cloneNode(true);
    clone.classList.add('is-clone');
    track.appendChild(clone);
  });

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
  function checkInfiniteWrap() {
    const setWidth = getSetWidth();
    if (setWidth <= 0) return;

    if (track.scrollLeft >= setWidth * 2) {
      track.scrollLeft -= setWidth;
    } else if (track.scrollLeft < setWidth) {
      track.scrollLeft += setWidth;
    }
  }

  // Set initial scroll position to the start of the middle set
  const initialSetWidth = getSetWidth();
  track.scrollLeft = initialSetWidth;
  requestAnimationFrame(() => {
    track.scrollLeft = getSetWidth();
  });

  // Setup Next & Prev buttons
  const prevBtn = document.getElementById('projects-prev');
  const nextBtn = document.getElementById('projects-next');

  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      const step = getCardStep();
      const setWidth = getSetWidth();
      if (track.scrollLeft >= setWidth * 2 - step) {
        track.scrollLeft -= setWidth;
      }
      track.scrollBy({ left: step, behavior: 'smooth' });
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
    });
  }

  // Setup mouse drag-to-scroll
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
    checkInfiniteWrap();
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

    // Wrap dynamically during continuous dragging
    if (newScrollLeft >= setWidth * 2) {
      newScrollLeft -= setWidth;
      scrollStart -= setWidth;
    } else if (newScrollLeft < setWidth) {
      newScrollLeft += setWidth;
      scrollStart += setWidth;
    }

    track.scrollLeft = newScrollLeft;
  });

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
    if (isDown) return; // Handled directly in mousemove
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(checkInfiniteWrap, 60);
  }, { passive: true });

  window.addEventListener('resize', () => {
    checkInfiniteWrap();
  });
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
