import fallbackData from '@/data/shortlisted-teams-2026.json';

export interface RawShortlistedTeam {
  id?: number | string;
  team_name?: string;
  teamName?: string;
  name?: string;
  college?: string;
  institution?: string;
  track?: string;
  "open innovation"?: boolean;
  open_innovation?: boolean;
  openInnovation?: boolean;
  leader_name?: string;
  team_leader?: string;
  leader?: string;
  member1?: string;
  member_1?: string;
  member2?: string;
  member_2?: string;
  member3?: string;
  member_3?: string;
  member4?: string;
  member_4?: string;
  members?: Array<string | { name?: string; member_name?: string; role?: string }>;
}

export interface ParsedShortlistedTeam {
  id: number | string;
  teamName: string;
  college: string;
  openInnovation: boolean;
  members: string[];
}

const SHORTLISTED_API_URL =
  process.env.NEXT_PUBLIC_SHORTLISTED_API_URL ??
  'https://codeutsava.nitrr.ac.in/server/shortlistedTeams/2026';

function cleanMemberName(name: unknown): string | null {
  if (typeof name !== 'string') return null;
  const trimmed = name.trim();
  if (
    !trimmed ||
    trimmed.toLowerCase() === 'n/a' ||
    trimmed.toLowerCase() === 'none' ||
    trimmed.toLowerCase() === 'null' ||
    trimmed.toLowerCase() === 'nil' ||
    trimmed === '-' ||
    trimmed.toLowerCase() === 'to be announced'
  ) {
    return null;
  }
  return trimmed;
}

export function parseShortlistedTeam(raw: RawShortlistedTeam, index: number): ParsedShortlistedTeam {
  const teamName =
    raw.team_name?.trim() ||
    raw.teamName?.trim() ||
    raw.name?.trim() ||
    `TEAM // 0${index + 1}`;

  const college =
    raw.college?.trim() ||
    raw.institution?.trim() ||
    'NIT Raipur';

  const memberList: string[] = [];

  if (Array.isArray(raw.members) && raw.members.length > 0) {
    for (const m of raw.members) {
      if (typeof m === 'string') {
        const cleaned = cleanMemberName(m);
        if (cleaned) memberList.push(cleaned);
      } else if (m && typeof m === 'object') {
        const cleaned = cleanMemberName(m.name || m.member_name);
        if (cleaned) memberList.push(cleaned);
      }
    }
  } else {
    const candidates = [
      raw.leader_name || raw.team_leader || raw.leader || raw.member1 || raw.member_1,
      raw.member2 || raw.member_2,
      raw.member3 || raw.member_3,
      raw.member4 || raw.member_4,
    ];

    for (const c of candidates) {
      const cleaned = cleanMemberName(c);
      if (cleaned) memberList.push(cleaned);
    }
  }

  return {
    id: raw.id ?? index + 1,
    teamName,
    college,
    openInnovation:
      raw['open innovation'] === true ||
      raw.open_innovation === true ||
      raw.openInnovation === true,
    members: memberList.length > 0 ? memberList : ['Member 1', 'Member 2'],
  };
}

export const FALLBACK_SHORTLISTED_TEAMS: ParsedShortlistedTeam[] = (
  fallbackData as RawShortlistedTeam[]
).map((t, idx) => parseShortlistedTeam(t, idx));

export async function fetchShortlistedTeams(year = 2026): Promise<ParsedShortlistedTeam[]> {
  const url = SHORTLISTED_API_URL.replace(/2026/, String(year));

  try {
    const isDev = process.env.NODE_ENV === 'development';
    const res = await fetch(url, {
      ...(isDev ? { cache: 'no-store' } : { next: { revalidate: 60 } }),
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      const json = await res.json();
      const rawList = Array.isArray(json.data)
        ? json.data
        : Array.isArray(json)
          ? json
          : null;

      if (rawList && rawList.length > 0) {
        return rawList.map((t: RawShortlistedTeam, idx: number) =>
          parseShortlistedTeam(t, idx)
        );
      }
    }
  } catch (err) {
    console.warn('[shortlisted-api] Live fetch failed or timed out, using fallback data:', err);
  }

  return FALLBACK_SHORTLISTED_TEAMS;
}
