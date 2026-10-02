# CodeUtsava X countdown

`/timer` reads the shared Django counter and is display-only: no start control or link back to the homepage. The homepage has no countdown or timer navigation. A separate random `/launch-…` page contains the guest's **Start Countdown** button and redirects to `/timer` after a backend read confirms the saved start. Both pages bypass the intro for direct use on the projector.

The launch page is absent from navigation and the sitemap, sends no-index/no-follow and no-referrer metadata, and uses a randomly generated URL. No authentication setup was added. The URL is unlisted rather than an access-control mechanism, and appears in the source repository. Keep the supplied URL within the ceremony team.

## Ceremony setup

1. In Django administration, prepare the existing counter for this year's event by unchecking **Flag** and saving. The API currently contains an expired 2025 counter with `flag: true`; frontend changes do not reset production data.
2. On the ceremony browser, sign in to Django admin if the API requires a session. Use the same hostname as the website so its session and CSRF cookies are available.
3. Open the unlisted ceremony URL supplied separately on the projector. It must show **28:00:00**, **Ready for the opening ceremony**, and **Start Countdown**. Open `/timer` on spectator screens; those screens have no start control.
4. The guest clicks **Start Countdown** once. The page confirms the backend state and redirects to `/timer`. Spectator screens refresh shared state every five seconds, and immediately on focus/reconnection. An already-started ceremony page redirects without restarting the backend counter.
5. Refreshing or joining later resumes the remaining time. At expiry the display stays at zero, the completion message appears, and the start button stays hidden.

## Reset and restart from Django admin

If the event needs restarting, uncheck **Flag** on the counter returned by `getcounter` and **Save**. You can leave **StartTime** and **EndTime** unchanged: the website ignores those timestamps while `flag` is false. `/timer` returns to **28:00:00**, removes the previous start/end schedule, and shows **Ready for the opening ceremony** on its next successful poll (normally within five seconds). This works during the countdown and after completion. A hidden/inactive tab refreshes when brought back into view. If the service is unavailable, the screen keeps its last confirmed state until syncing succeeds.

Reopen the same unlisted ceremony URL. Its **Start Countdown** button is available again. The next click writes fresh start/end timestamps for a new full 28-hour countdown, confirms the backend state, and redirects to `/timer`. Resetting `/timer` does not reveal a start button there. No frontend reset button is needed on the production website.

## API contract

- `GET https://codeutsava.nitrr.ac.in/server/getcounter/` returns `{ data: [{ flag, startTime, endTime }] }` or `{ data: { flag, startTime, endTime } }`.
- Server-side `/api/countdown` validates and forwards this read with no cache and a timeout. It also forwards the upstream HTTP Date as server time, falling back to the Next.js server clock. Client ticking uses a monotonic clock anchored to that time, with a network-latency estimate. Accuracy remains limited by HTTP Date's one-second resolution and network latency.
- The guest's browser posts JSON `{ flag: true, startTime, endTime }` directly to `/server/setcounter/`, preserving Django cookies and supplying `X-CSRFToken` when a `csrftoken` cookie exists. No template token or credential is embedded in the frontend.
- Times are epoch milliseconds. End is exactly `start + 100800000`. The frontend rechecks the flag immediately before starting, disables double clicks, and verifies saved state after the POST. The Django service must enforce atomic start-once behavior for simultaneous starts from different browsers; a frontend precheck cannot provide that guarantee.
- `COUNTDOWN_API_BASE_URL` overrides the server-side read base URL. The live write path requires `/server/` to remain routed to Django on the deployed website origin.
- Read failures retain an already-confirmed countdown and show a sync error. Without a confirmed counter, the display shows dashes and disables start. Unauthorized starts ask the operator to sign in; a failed/unconfirmed POST never starts an optimistic local timer.

## Local rehearsal

Run `pnpm dev`, open the unlisted ceremony path with `?demo=1`, and open `http://localhost:3000/timer?demo=1` on a spectator tab. Start on the ceremony page and verify redirection and spectator synchronization. Reload to check persistence. `pnpm test:countdown:demo` exercises outage, recovery, expiry, competing starts and resets the local demo for another rehearsal.

Demo state is shared through `/api/countdown/demo` and persisted in the ignored `.next/countdown-demo.json` file. Demo requests never call Django. The demo route and controls are unavailable in production builds. `/timer` in local development reads live state but does not expose the live start control.

Run `pnpm test:countdown` for timestamp/schema tests. With the local development server running, `pnpm test:countdown:demo` tests the shared demo API, including concurrent starts, outage/recovery, expiry and reset. That test resets only the local demo.

## Production preview and release

Use Node.js 24 (matching the deployment workflow) and pnpm 11.22.0. The countdown tests require Node.js 22.18 or newer for built-in TypeScript stripping.

Run `pnpm build`, then `pnpm preview:production`. Open the unlisted ceremony path under `http://localhost:3000` to start, and `/timer` to view the clock. This serves the actual standalone production build, including copied public assets and generated CSS, without the development overlay or rehearsal controls. A separate local proxy replaces the Django counter, so the guest can safely test the real Start Countdown control and redirection. It never forwards `/server/` requests to the live service. The mock does not validate Django authentication; any existing backend session/CSRF requirements still apply in production.

Type `reset`, `flag-off`, `finish`, `offline`, or `online` into the preview terminal to change the local counter. `flag-off` changes only the flag and retains the old timestamps, matching a Django admin reset. Other pages pick up changes within five seconds. Ctrl+C stops both local servers. `pnpm test:countdown:production` verifies the release assets, production metadata, disabled demo endpoint, shared start contract, flag-only reset and restart; type `reset` before and after this test.

The release workflow on `main` runs lint, countdown tests, TypeScript checks and the production build before deploying. Metadata defaults to `https://codeutsava.nitrr.ac.in`; the workflow sets the same `NEXT_PUBLIC_SITE_URL` explicitly. The standalone server reads the live API by default. Do not set `COUNTDOWN_API_BASE_URL` to the local preview URL on the production server. Preserve the web server's existing `/server/` routing to Django.

The website repository cannot change the external Django service. Before the ceremony, confirm the backend enforces a single start atomically, and verify the signed-in guest browser can create the counter. Reset only the local preview during testing; reset the real Django Flag once as part of event preparation.
