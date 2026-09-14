# ZhaoXiang Lan — Personal Website

A lightweight, responsive personal site for ZhaoXiang Lan, an Electrical Engineering student at Temple University.

## Stack

- Semantic HTML
- Modern CSS (no framework)
- Small vanilla JavaScript enhancement layer
- GitHub Pages hosting

There is no package manager, build step, or generated output. All site files are served directly from the repository root.

## Local preview

From the repository directory, start any static file server. For example:

```powershell
python -m http.server 8000
```

Then visit `http://localhost:8000`.

## Deploy to GitHub Pages

1. Commit and push the changes to the `master` branch.
2. In the repository on GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select `master` and `/ (root)`, then save.

The site will be available at <https://zhaoxianglan.github.io/> after GitHub finishes the deployment.

## Content map

- `index.html` — all page content and metadata
- `assets/css/styles.css` — layout, theme, and responsive rules
- `assets/js/main.js` — navigation, active section, and reveal enhancements
- `assets/images/` — profile image and favicon
- `404.html` — GitHub Pages fallback page

## Previous site backup

The former Academic Pages/Jekyll site is preserved in the local Git branch `backup/academic-pages-2026-09-14`.
