# ZhaoXiang Lan — Personal Website

A lightweight, responsive personal site for ZhaoXiang Lan, an Electrical Engineering student at Temple University.

## Stack

- Semantic HTML
- Modern CSS (no framework)
- Small vanilla JavaScript enhancement layer
- GitHub Pages hosting

There is no package manager, build step, or generated output. All site files are served directly from the repository root.

## Local preview

From the repository directory, start a static file server. With Node.js installed:

```powershell
npx serve .
```

Open the localhost URL printed by the command. VS Code Live Server also works.
Do not use `file://` for navigation testing because clean directory routes rely on
the server resolving each folder's `index.html`.

## Deploy to GitHub Pages

1. Commit and push the changes to the `master` branch.
2. In the repository on GitHub, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select `master` and `/ (root)`, then save.

The site will be available at <https://zhaoxianglan.github.io/> after GitHub finishes the deployment.

## Content map

- `index.html` — homepage
- `about/index.html` — clean `/about/` route
- `contact/index.html` — clean `/contact/` route
- `contact/assets/` — contact-only documents, including the resume
- `work/index.html` — clean `/work/` route
- `projects/mini-pupper/index.html` — Mini-Pupper project page
- `projects/mini-pupper/assets/` — Mini-Pupper-only images and source material
- `assets/css/styles.css` — shared layout, theme, and responsive rules
- `assets/js/main.js` — shared navigation, active section, and reveal enhancements
- `assets/images/` — shared identity images and favicon
- `404.html` — GitHub Pages fallback page

The root-level `about.html`, `contact.html`, `work.html`, and `mini-pupper.html`
files are compatibility redirects for old links. New internal links use directory routes.

## Previous site backup

The former Academic Pages/Jekyll site is preserved in the local Git branch `backup/academic-pages-2026-09-14`.
