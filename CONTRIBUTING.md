# Contributing

Notes for anyone working on the code. For running the site, see the README.

## Development

Requires Node.js.

```bash
npm run dev        # http://localhost:8080
npm run build      # minified production build in dist/ (run `npm install` first)
npm run preview    # serve dist/
npm run standalone # standalone build in standalone/ (run `npm install` first)
```

## Releases

The standalone build is the release artifact for users who don't want to run a server: a single download, no setup, no terminal. It is built from source and attached to a GitHub Release. The release asset is a zip of `standalone/`'s contents under a top folder named `miya-archive/`. Attach the zip, not the bare HTML — the HTML alone loads no images, since it needs `data/` and `assets/` beside it. It is not committed to the repo, and it is not a separate repo. A release is a snapshot; cut a new one when the viewer changes. The archive data is frozen (2019–2020) and never changes, so releases are for features and fixes only.

## Project layout

```
index.html           static shell with skeleton placeholders
css/                 one file per concern, loaded in this order: base, layout, tweet, media, embeds, forms,
                     profile, lightbox, share-toast, drawer, reader-mode, pull-to-refresh, print, skeleton
js/
  main.js            entry point
  app.js             fetch data/tweets.md, parse it, render
  router.js          #/route to page renderer, scroll restoration
  events.js          global click handling
  core/              config, shared state, DOM helpers, icons, formatting, localStorage
  data/              archive parser, retweet linking, keyword index
  search/            query language, search state, advanced-search dialog
  pages/             profile, timeline, thread, history, explore, search
  ui/                tweet card, rich text, lightbox, share menu, drawer, shell, skeletons, image events, like/bookmark
  embeds/            quote and link cards, live X embeds
  export/            thread to PDF
assets/              favicon
data/                the archive: tweets.md, miya.png, header.png and the media files tweets.md refers to
scripts/             dev server and build
```

## Code conventions

- Every dependency is an ES `import` (nothing on `window`).
- Shared mutable state is the single `state` object in `js/core/state.js`.
- State machines are explicit: one named field per machine (e.g. `state.loadStatus`, `ptrState`), changed through a single setter, not scattered flags, null checks, or DOM reads.
- Pages render HTML strings and use delegated event listeners.
- Side effects live in `init*()` functions called from `main.js`.

## Configuration

Display name, bio, and file locations are set in `js/core/config.js`.
