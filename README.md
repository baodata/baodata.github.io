# baodata.github.io

Personal portfolio of **Lữ Bảo Đạt** — Built from scratch with vanilla HTML, CSS, and JavaScript.

## Architecture & Directory Structure

```text
baodata.github.io/
├── index.html                  # Minimal HTML shell / component orchestrator
├── README.md                   # Project documentation
│
├── components/                 # Modular HTML fragments
│   ├── header.html             # Top bar navigation & brand logo
│   ├── hero.html               # Central hero section
│   ├── about.html              # About section
│   ├── projects.html           # Projects showcase section
│   ├── contact.html            # Contact & get in touch section
│   └── footer.html             # Bottom bar & social media links
│
└── assets/
    ├── css/
    │   ├── variables.css       # Design tokens & color system
    │   └── style.css           # Layout, typography & effects
    ├── js/
    │   ├── loader.js           # Lightweight dynamic component loader
    │   ├── glow.js             # Mouse glow tracking logic
    │   ├── floaters.js         # Floating logo physics & boundary collision
    │   ├── carousel.js         # Projects horizontal drag & glide carousel
    │   └── main.js             # Entry point for general interactions
    ├── images/
    │   └── projects/           # Screenshots and media assets
    └── icons/                  # SVG icons
```

## Local Development

Because components are loaded dynamically via `fetch()`, run a local static server to test locally:

```bash
python3 -m http.server 8000
```
Then visit: `http://localhost:8000`
