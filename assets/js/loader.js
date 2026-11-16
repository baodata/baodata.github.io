// Component loader: fetches HTML fragments and replaces placeholder elements
async function loadComponents() {
  const targets = document.querySelectorAll('[data-include]');
  const cacheBuster = Date.now();
  const tasks = Array.from(targets).map(async (element) => {
    const filePath = element.getAttribute('data-include');
    try {
      // Prevent browser from caching components during local development
      const response = await fetch(`${filePath}?_=${cacheBuster}`, { cache: 'no-cache' });
      if (!response.ok) {
        throw new Error(`Failed to load ${filePath}: ${response.statusText}`);
      }
      const html = await response.text();
      element.outerHTML = html;
    } catch (error) {
      console.error(`Component load error (${filePath}):`, error);
    }
  });

  await Promise.all(tasks);
  document.dispatchEvent(new CustomEvent('componentsLoaded'));
}

document.addEventListener('DOMContentLoaded', loadComponents);
