This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Admin page

`/admin` imports a Melee tournament into the LPM backend from the two CSVs the
organiser downloads from the tournament page on melee.gg, and holds the
destructive database reset.

### `ADMIN_API_KEY`

The admin endpoints on `https://api.legapaupermilano.it` are protected by a
shared secret sent as `X-API-Key`. It must stay server-side, both because it is
a secret and because the Go API has no CORS middleware, so the browser cannot
call it directly anyway.

Set it in the server environment — never in the repo, and never with a
`NEXT_PUBLIC_` prefix:

```bash
# local development
echo 'ADMIN_API_KEY=<the key>' > .env.local
```

In production it comes from the `ADMIN_API_KEY` repository secret and has to be
present in the container environment on the deploy host (`/opt/lpm`, the `web`
service in `docker-compose.yml`). Without it the page still renders, but says
the key is not configured and every admin action fails.

If the key ever leaks, rotate it in repo settings and re-run the deploy
workflow.

### How the calls are routed

The browser only ever talks to this app. Three route handlers attach the header
and forward to the Go API:

| Route                | Forwards to                          |
| -------------------- | ------------------------------------ |
| `/api/admin/import`  | `POST /admin/import/melee?season_id=`|
| `/api/admin/seasons` | `POST /admin/seasons`                |
| `/api/admin/reset`   | `POST /admin/reset?confirm=RESET`    |

`app/lib/adminApi.ts` is the only module that reads the key. Do not import it
from a Client Component — the shared types live in `app/lib/adminTypes.ts` for
that.
