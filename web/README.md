# Research Agent Web UI

Next.js frontend for the Multi-Agent Research & Report Generator.

See the root [`README.md`](../README.md) for full project setup.

## Commands

```bash
npm install
npm run dev

npm run lint
npm run test
npm run build

npx playwright install
npm run test:e2e
```

The dev server proxies `/api/*` to the FastAPI backend. Set `API_URL` for container/server deployments; it defaults to `http://localhost:8000`.

## Key Components

- `components/research/research-workspace.tsx` — main client workflow
- `components/research/topic-form.tsx` — validated topic input
- `components/research/report-history.tsx` — recent reports
- `components/research/report-viewer.tsx` — markdown + PDF export

## Testing

Playwright tests mock `/api/*` responses by default so they do not call OpenRouter or Tavily.
