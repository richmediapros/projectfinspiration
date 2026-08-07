# Project TrustConstellation

## Stack

- **Frontend**: Astro v6 (SSR, `output: 'server'`)
- **Hosting**: Cloudflare Workers
- **Adapter**: `@astrojs/cloudflare`

## Local Dev

```bash
npm install
npm run dev   # http://localhost:4321
```

Requires Node v22.12+.

## Deploy

Manual deploy, no CI. From the project root:

```bash
npm run deploy
```
