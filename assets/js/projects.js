// Fetch repository metadata and language statistics dynamically from GitHub API
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

async function loadGitHubRepoData() {
  const cards = document.querySelectorAll('[data-repo]');
  if (!cards.length) return;

  cards.forEach(async (card) => {
    const repoPath = card.getAttribute('data-repo');
    if (!repoPath) return;

    try {
      // Fetch repo general info and language breakdown concurrently
      const [repoRes, langRes] = await Promise.all([
        fetch(`https://api.github.com/repos/${repoPath}`),
        fetch(`https://api.github.com/repos/${repoPath}/languages`)
      ]);

      if (!repoRes.ok || !langRes.ok) return;

      const repoData = await repoRes.json();
      const langData = await langRes.json();

      // Update description if available on GitHub
      const descEl = card.querySelector('.project-desc');
      if (descEl && repoData.description) {
        descEl.textContent = repoData.description;
      }

      // Update link URL
      const linkEl = card.querySelector('.project-title-link');
      if (linkEl && repoData.html_url) {
        linkEl.href = repoData.html_url;
      }

      // Compute language percentages
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

            // Append progress segment
            const segment = document.createElement('span');
            segment.className = 'lang-segment';
            segment.style.width = `${percent}%`;
            segment.style.backgroundColor = color;
            segment.title = `${lang}: ${percent}%`;
            langBar.appendChild(segment);

            // Append legend tag
            const tag = document.createElement('span');
            tag.className = 'lang-tag';
            tag.innerHTML = `<span class="lang-dot" style="background-color: ${color};"></span>${lang} ${percent}%`;
            langTags.appendChild(tag);
          });
        }
      }
    } catch (err) {
      console.warn(`Could not fetch live GitHub data for ${repoPath}:`, err);
    }
  });
}

// Run after components are injected by loader.js
document.addEventListener('componentsLoaded', loadGitHubRepoData);
document.addEventListener('DOMContentLoaded', () => {
  // Fallback in case components were already loaded
  setTimeout(loadGitHubRepoData, 300);
});
