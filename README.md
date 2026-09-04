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

### The admin key

The admin endpoints on `https://api.legapaupermilano.it` are protected by a
shared secret sent as `X-API-Key`.

There is no `ADMIN_API_KEY` environment variable and nothing to configure on the
server. The organiser types the key into the field at the top of `/admin`, and
it is held in component state for as long as the page is open — not in
`localStorage`, not in a cookie, not on disk. Reloading the page loses it, which
is deliberate: nothing is left behind on a shared machine.

If the key ever leaks, rotate it in repo settings and re-run the backend deploy
workflow.

### How the calls are routed

The browser only ever talks to this app. It sends the typed key as
`X-Admin-Key`; three route handlers swap that for the `X-API-Key` the Go API
expects and forward the call. The hop through the server is required regardless
of where the key lives, because the Go API has no CORS middleware and a direct
cross-origin request would be blocked at preflight.

| Route                | Forwards to                          |
| -------------------- | ------------------------------------ |
| `/api/admin/import`  | `POST /admin/import/melee?season_id=`|
| `/api/admin/seasons` | `POST /admin/seasons`                |
| `/api/admin/reset`   | `POST /admin/reset?confirm=RESET`    |

`app/lib/adminApi.ts` is the only module that talks to the upstream API, and it
takes the key as an argument rather than reading it from anywhere. Client
components import types from `app/lib/adminTypes.ts`.
