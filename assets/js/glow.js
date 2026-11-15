// Track pointer movement and update CSS variables in real-time
function initMouseGlow() {
  window.addEventListener('pointermove', (event) => {
    document.documentElement.style.setProperty('--mouse-x', `${event.clientX}px`);
    document.documentElement.style.setProperty('--mouse-y', `${event.clientY}px`);
  });
}

document.addEventListener('DOMContentLoaded', initMouseGlow);
