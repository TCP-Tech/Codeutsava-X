const SHORTLISTED_API_URL =
    process.env.NEXT_PUBLIC_SHORTLISTED_API_URL ??
    'https://codeutsava.nitrr.ac.in/server/shortlistedTeams/2026';

export async function GET(request: Request) {
    const requestedYear = new URL(request.url).searchParams.get('year') ?? '2026';
    const year = /^\d{4}$/.test(requestedYear) ? requestedYear : '2026';
    const upstreamUrl = SHORTLISTED_API_URL.replace(/2026/, year);

    try {
        const upstreamResponse = await fetch(upstreamUrl, {
            headers: { Accept: 'application/json' },
            next: { revalidate: 60 },
            signal: AbortSignal.timeout(15000),
        });

        if (!upstreamResponse.ok) {
            return Response.json(
                { error: 'Shortlisted teams could not be loaded.' },
                { status: 502, headers: { 'Cache-Control': 'no-store' } },
            );
        }

        return Response.json(await upstreamResponse.json(), {
            headers: { 'Cache-Control': 'no-store' },
        });
    } catch (error) {
        console.error('[shortlisted-proxy] Upstream request failed:', error);
        return Response.json(
            { error: 'Shortlisted teams could not be loaded.' },
            { status: 502, headers: { 'Cache-Control': 'no-store' } },
        );
    }
}