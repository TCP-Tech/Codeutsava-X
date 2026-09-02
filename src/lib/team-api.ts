/**
 * team-api.ts
 * Smart Live/Hybrid Django Backend Team Data Provider:
 * - Live-fetches from https://codeutsava.nitrr.ac.in/server/team/2026/
 * - Caches with Next.js ISR (60s revalidation) for locked 60 FPS performance.
 * - When Django responds, merges it with the verified static dataset field by field.
 * - Missing live fields, social profiles, and rows are filled from the static data.
 * - If Django is unreachable, serves the complete static dataset.
 */

import type { TeamGroup, TeamMember, SocialLink } from '@/types/content';
import staticTeam2026 from '@/data/team-2026.json';

export interface ApiTeamMember {
  id: number;
  name: string;
  branch: string;
  image: string | null;
  member_type: string;
  year: number;
  domain: string;
  linkedin: string | null;
  instagram: string | null;
  github: string | null;
  email: string | null;
  drive_image_url: string | null;
}

interface ApiTeamResponse {
  message?: string;
  data?: ApiTeamMember[];
}

const TEAM_API_URL =
  process.env.NEXT_PUBLIC_TEAM_API_URL ??
  'https://codeutsava.nitrr.ac.in/server/team/2026/';

const MEMBER_TYPE_MAP: Record<string, TeamGroup> = {
  OCO: 'overall-coordinator',
  DL: 'domain-lead',
  DOM: 'domain-lead',
  LEAD: 'domain-lead',
  HCO: 'head-coordinator',
  MNG: 'manager',
  EXC: 'executive',
};

const DOMAIN_LEAD_NAMES = new Set([
  'nitesh kumar',
  'akshat mishra',
  'sankalp mittal',
  'somansh raj kashyap',
  'sanskar gupta',
  'rajveer singh',
  'rebekah dhone',
  'prasann trivedi',
]);

export function extractDriveFileId(url: string): string | null {
  try {
    const trimmed = url.trim();
    if (!trimmed) return null;
    const match =
      trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/\/d\/([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
      trimmed.match(/id=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

export function normaliseDriveUrl(url: string): string {
  const id = extractDriveFileId(url);
  if (id) {
    return `https://lh3.googleusercontent.com/d/${id}=w600`;
  }
  return url.trim();
}

function resolveImageSrc(member: ApiTeamMember): string | null {
  if (member.drive_image_url?.trim()) {
    return normaliseDriveUrl(member.drive_image_url.trim());
  }
  if (member.image?.trim()) {
    const img = member.image.trim();
    if (img.startsWith('http://') || img.startsWith('https://')) {
      return normaliseDriveUrl(img);
    }
    return `https://codeutsava.nitrr.ac.in${img.startsWith('/') ? '' : '/'}${img}`;
  }
  return null;
}

const EMPTY_SOCIAL_VALUES = new Set(['n/a', 'na', 'none', 'nil', 'null', '-', '--']);

export function normalizeSocialUrl(
  value: string | null | undefined,
  platform: Exclude<SocialLink['platform'], 'source' | undefined>,
): string | null {
  const trimmed = value?.trim();
  if (!trimmed || EMPTY_SOCIAL_VALUES.has(trimmed.toLowerCase())) return null;

  if (/^https?:\/\//i.test(trimmed)) {
    try {
      return new URL(trimmed).toString();
    } catch {
      return null;
    }
  }

  if (/^(?:www\.)?(?:instagram\.com|linkedin\.com|github\.com)\//i.test(trimmed)) {
    return `https://${trimmed.replace(/^\/+/, '')}`;
  }

  const handle = trimmed
    .replace(/^@/, '')
    .replace(/^\/+|\/+$/g, '')
    .replace(/\s+/g, '');

  if (!handle) return null;

  if (platform === 'instagram') return `https://www.instagram.com/${handle}/`;
  if (platform === 'github') return `https://github.com/${handle}`;

  const linkedinHandle = handle.replace(/^in\//i, '');
  return linkedinHandle ? `https://www.linkedin.com/in/${linkedinHandle}/` : null;
}

function buildSocialLinks(member: ApiTeamMember): readonly SocialLink[] {
  const links: SocialLink[] = [];
  const add = (
    href: string | null | undefined,
    platform: SocialLink['platform'],
    label: string,
  ) => {
    if (!platform || platform === 'source') return;
    const normalizedHref = normalizeSocialUrl(href, platform);
    if (!normalizedHref) return;
    links.push({ label, href: normalizedHref, platform });
  };

  add(member.linkedin, 'linkedin', 'LinkedIn');
  add(member.instagram, 'instagram', 'Instagram');
  add(member.github, 'github', 'GitHub');
  return links;
}

function normalizeStoredMemberLinks(member: TeamMember): TeamMember {
  const socialLinks = member.socialLinks.flatMap((link) => {
    const platform = link.platform;
    if (!platform || platform === 'source') return [link];

    const href = normalizeSocialUrl(link.href, platform);
    return href ? [{ ...link, href }] : [];
  });

  return { ...member, socialLinks };
}

const STATIC_TEAM_MEMBERS = (staticTeam2026 as TeamMember[]).map(normalizeStoredMemberLinks);
const STATIC_MEMBERS_BY_ID = new Map(STATIC_TEAM_MEMBERS.map((member) => [member.id, member]));

function normalizeMemberName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, ' ');
}

const STATIC_MEMBERS_BY_NAME = new Map(
  STATIC_TEAM_MEMBERS.map((member) => [normalizeMemberName(member.name), member]),
);

function mergeSocialLinks(
  liveLinks: readonly SocialLink[],
  fallbackLinks: readonly SocialLink[],
): readonly SocialLink[] {
  const merged = [...liveLinks];
  const livePlatforms = new Set(liveLinks.map((link) => link.platform).filter(Boolean));

  for (const link of fallbackLinks) {
    if (link.platform && livePlatforms.has(link.platform)) continue;
    merged.push(link);
    if (link.platform) livePlatforms.add(link.platform);
  }

  return merged;
}

function hasReliableGroup(raw: ApiTeamMember): boolean {
  const memberType = (raw.member_type || '').trim().toUpperCase();
  const memberName = normalizeMemberName(raw.name || '');
  return memberType in MEMBER_TYPE_MAP || DOMAIN_LEAD_NAMES.has(memberName);
}

function mergeApiMemberWithFallback(raw: ApiTeamMember, fallback?: TeamMember): TeamMember {
  const live = mapApiMember(raw);
  if (!fallback) return live;

  const hasLiveName = live.name.trim() !== '' && live.name !== 'Unknown';
  const hasLiveRole = live.role.trim() !== '';
  const hasLiveTeam = Boolean(live.team?.trim());

  return {
    ...fallback,
    ...live,
    name: hasLiveName ? live.name : fallback.name,
    role: hasLiveRole ? live.role : fallback.role,
    group: hasReliableGroup(raw) ? live.group : fallback.group,
    team: hasLiveTeam ? live.team : fallback.team,
    bio: live.bio?.trim() ? live.bio : fallback.bio,
    imageSrc: live.imageSrc ?? fallback.imageSrc,
    socialLinks: mergeSocialLinks(live.socialLinks, fallback.socialLinks),
  };
}

function buildHybridTeamMembers(rawMembers: ApiTeamMember[]): TeamMember[] {
  const matchedStaticIds = new Set<string>();
  const liveMemberNames = new Set<string>();

  const mergedMembers = rawMembers.map((raw) => {
    const liveId = String(raw.id);
    const liveName = normalizeMemberName(raw.name || '');
    const fallback = STATIC_MEMBERS_BY_ID.get(liveId) ?? STATIC_MEMBERS_BY_NAME.get(liveName);

    if (fallback) matchedStaticIds.add(fallback.id);
    if (liveName) liveMemberNames.add(liveName);

    return mergeApiMemberWithFallback(raw, fallback);
  });

  for (const fallback of STATIC_TEAM_MEMBERS) {
    const fallbackName = normalizeMemberName(fallback.name);
    if (matchedStaticIds.has(fallback.id) || liveMemberNames.has(fallbackName)) continue;
    mergedMembers.push(fallback);
  }

  return mergedMembers;
}

function normalizeDomain(rawDomain: string): string {
  const d = (rawDomain || '').trim().toLowerCase();
  if (d === 'n/a' || d === 'na' || d === 'none' || d === '-' || !d) return '';
  if (d.includes('snm') || d.includes('mentor') || d.includes('skill')) return 'Skills & Mentorship';
  if (d.includes('project')) return 'Project';
  if (d.includes('social')) return 'Social Media';
  if (d.includes('video')) return 'Video Editing';
  if (d.includes('design')) return 'Design';
  if (d.includes('spons')) return 'Sponsorship';
  if (d.includes('doc')) return 'Documentation';
  if (d.includes('pr') || d.includes('market')) return 'PR & Marketing';
  if (d.includes('tech')) return 'Technical';
  return rawDomain.trim();
}

function resolveGroup(rawType: string, name?: string): TeamGroup {
  const code = (rawType || '').trim().toUpperCase();
  if (code === 'DL' || code === 'DOM' || code === 'LEAD') {
    return 'domain-lead';
  }
  if (name && DOMAIN_LEAD_NAMES.has(name.trim().toLowerCase())) {
    return 'domain-lead';
  }
  return MEMBER_TYPE_MAP[code] ?? 'executive';
}

export function mapApiMember(raw: ApiTeamMember): TeamMember {
  const group = resolveGroup(raw.member_type, raw.name);
  const isOco = group === 'overall-coordinator';
  const domain = normalizeDomain(raw.domain);

  return {
    id: String(raw.id),
    name: raw.name?.trim() || 'Unknown',
    role: isOco ? 'Overall Coordinator' : domain,
    group,
    team: isOco ? undefined : (domain ? `TCP // ${domain}` : undefined),
    imageSrc: resolveImageSrc(raw),
    socialLinks: buildSocialLinks(raw),
    status: 'published',
  };
}

export async function fetchTeamMembers(year = 2026): Promise<TeamMember[]> {
  const url = TEAM_API_URL.replace(/2026/, String(year));

  try {
    const isDev = process.env.NODE_ENV === 'development';
    const res = await fetch(url, {
      ...(isDev ? { cache: 'no-store' } : { next: { revalidate: 60 } }),
      headers: { Accept: 'application/json' },
      signal: AbortSignal.timeout(2000),
    });

    if (res.ok) {
      const json = (await res.json()) as ApiTeamResponse;
      if (Array.isArray(json.data) && json.data.length > 0) {
        return buildHybridTeamMembers(json.data);
      }
    }
  } catch (err) {
    console.warn('[team-api] Django live fetch failed or timed out, using fallback static data:', err);
  }

  // Fallback to static 2026 dataset
  return STATIC_TEAM_MEMBERS;
}
