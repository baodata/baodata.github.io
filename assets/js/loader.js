// Component loader: fetches HTML fragments and replaces placeholder elements
async function loadComponents() {
  const targets = document.querySelectorAll('[data-include]');
  const tasks = Array.from(targets).map(async (element) => {
    const filePath = element.getAttribute('data-include');
    try {
      const response = await fetch(filePath);
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
}

document.addEventListener('DOMContentLoaded', loadComponents);
