# allenjohn.me

Source code for my personal portfolio and blog.

## Stack
- **Astro**
- **Vanilla CSS**
- **Content Collections**
- **GitHub Pages**

## Development
```sh
npm install
npm run dev      # local dev server
npm run build    # build to dist/
```

Pushing to `main` deploys the site via `.github/workflows/deploy.yml`.

## Blog
To write a post, I add a `.md` file to `src/content/blog/`:

```md
---
title: "Post title"
description: "Optional one-line summary"
date: 2026-10-30
tags: []
draft: false
---

Post content in Markdown.
```

The file name becomes the URL (`/blog/<file-name>/`). Set `draft: true` to hide a post.
