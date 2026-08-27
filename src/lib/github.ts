import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { loadEnv } from 'vite';
import { DATA } from '@/data/resume';

const GRAPHQL_URL = 'https://api.github.com/graphql';
const REST_URL = 'https://api.github.com';
const FALLBACK_CONTRIBUTIONS_URL = 'https://github-contributions-api.jogruber.de/v4';
const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = 'allenjohn-portfolio';
const CACHE_TTL_MS = 10 * 60 * 1000;
const RATE_LIMIT_COOLDOWN_MS = 5 * 60 * 1000;
const CACHE_PATH = join(process.cwd(), '.cache', 'github.json');

const LEVEL_FROM_GITHUB = {
  NONE: 0,
  FIRST_QUARTILE: 1,
  SECOND_QUARTILE: 2,
  THIRD_QUARTILE: 3,
  FOURTH_QUARTILE: 4,
} as const;

export type ContributionDay = {
  date: string;
  count: number;
  level: number;
};

export type ContributionWeek = {
  days: (ContributionDay | null)[];
};

export type ContributionCalendar = {
  total: number;
  weeks: ContributionWeek[];
  currentStreak: number;
  longestStreak: number;
  source: 'graphql' | 'fallback' | 'empty';
};

export type GitHubUser = {
  login: string;
  name: string;
  avatarUrl: string;
  url: string;
  publicRepos: number;
  bio: string | null;
};

export type FeaturedRepo = {
  fullName: string;
  name: string;
  title: string;
  description: string;
  url: string;
  homepage: string | null;
  stars: number;
  forks: number;
  language: string | null;
  updatedAt: string;
  iconUrl: string;
  iconUrlDark: string | null;
  activity: number[];
};

export type GitHubPageData = {
  user: GitHubUser;
  calendar: ContributionCalendar;
  repos: FeaturedRepo[];
  banner: string;
  avatar: string;
};

type GraphQLCalendarResponse = {
  data?: {
    user?: {
      contributionsCollection?: {
        contributionCalendar?: {
          totalContributions: number;
          weeks: {
            contributionDays: {
              date: string;
              contributionCount: number;
              contributionLevel: keyof typeof LEVEL_FROM_GITHUB | string;
            }[];
          }[];
        };
      };
    };
  };
  errors?: { message: string }[];
};

type FallbackCalendarResponse = {
  total?: Record<string, number>;
  contributions?: { date: string; count: number; level: number }[];
};

type RestUser = {
  login?: string;
  name?: string | null;
  avatar_url?: string;
  html_url?: string;
  public_repos?: number;
  bio?: string | null;
};

type RestRepo = {
  full_name?: string;
  name?: string;
  description?: string | null;
  html_url?: string;
  homepage?: string | null;
  stargazers_count?: number;
  forks_count?: number;
  language?: string | null;
  pushed_at?: string;
  message?: string;
  owner?: {
    login?: string;
    avatar_url?: string;
  };
};

type CachedPage = {
  savedAt: number;
  data: GitHubPageData;
};

let memoryCache: CachedPage | null = null;
let skipGithubUntil = 0;
let tokenWarned = false;

function githubToken(): string | undefined {
  const fromProcess = process.env['GITHUB_TOKEN'];
  const fromVite = (import.meta.env as Record<string, string | undefined>)['GITHUB_TOKEN'];
  if (fromProcess && fromProcess.length > 0) return fromProcess;
  if (fromVite && fromVite.length > 0) return fromVite;

  const loaded = loadEnv(import.meta.env.MODE ?? 'development', process.cwd(), '');
  const fromFile = loaded['GITHUB_TOKEN'];
  if (fromFile && fromFile.length > 0) {
    process.env['GITHUB_TOKEN'] = fromFile;
    return fromFile;
  }

  if (!tokenWarned) {
    tokenWarned = true;
    console.warn(
      'GITHUB_TOKEN is missing. GitHub REST is limited to 60 unauthenticated requests/hour; add it to .env for local dev.',
    );
  }
  return undefined;
}

function githubUnavailable(): boolean {
  return Date.now() < skipGithubUntil;
}

function warn(message: string, error?: unknown) {
  const detail = error instanceof Error ? error.message : error;
  console.warn(detail ? `${message} ${detail}` : message);
}

function readDiskCache(): CachedPage | null {
  try {
    if (!existsSync(CACHE_PATH)) return null;
    const parsed = JSON.parse(readFileSync(CACHE_PATH, 'utf8')) as CachedPage;
    if (!parsed?.data || typeof parsed.savedAt !== 'number') return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeDiskCache(data: GitHubPageData) {
  try {
    mkdirSync(dirname(CACHE_PATH), { recursive: true });
    const entry: CachedPage = { savedAt: Date.now(), data };
    writeFileSync(CACHE_PATH, JSON.stringify(entry));
    memoryCache = entry;
  } catch {
    memoryCache = { savedAt: Date.now(), data };
  }
}

function cachedPage(allowStale = false): GitHubPageData | null {
  const hit = memoryCache ?? readDiskCache();
  if (!hit) return null;
  memoryCache = hit;
  if (allowStale || Date.now() - hit.savedAt < CACHE_TTL_MS) return hit.data;
  return null;
}

function isDegraded(data: GitHubPageData): boolean {
  return (
    data.user.publicRepos === 0 &&
    data.calendar.source === 'empty' &&
    data.repos.every((repo) => repo.stars === 0 && repo.activity.length === 0)
  );
}

function headers(withJson = false): HeadersInit {
  const token = githubToken();
  const result: Record<string, string> = {
    Accept: withJson ? 'application/json' : 'application/vnd.github+json',
    'User-Agent': USER_AGENT,
  };
  if (token) result['Authorization'] = `Bearer ${token}`;
  return result;
}

async function fetchJson<T>(url: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  if (!response.ok) {
    if (response.status === 403 || response.status === 429) {
      skipGithubUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      throw new Error('rate limited');
    }
    throw new Error(`${url} failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as T;
}

function emptyCalendar(): ContributionCalendar {
  return {
    total: 0,
    weeks: [],
    currentStreak: 0,
    longestStreak: 0,
    source: 'empty',
  };
}

function fallbackUser(login: string): GitHubUser {
  return {
    login,
    name: DATA.name,
    avatarUrl: `https://github.com/${login}.png?size=240`,
    url: `https://github.com/${login}`,
    publicRepos: 0,
    bio: null,
  };
}

function levelFromGithub(level: string, count: number): number {
  if (level in LEVEL_FROM_GITHUB) {
    return LEVEL_FROM_GITHUB[level as keyof typeof LEVEL_FROM_GITHUB];
  }
  if (count <= 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 9) return 3;
  return 4;
}

function flattenDays(weeks: ContributionWeek[]): ContributionDay[] {
  const days: ContributionDay[] = [];
  for (const week of weeks) {
    for (const day of week.days) {
      if (day) days.push(day);
    }
  }
  return days;
}

function computeStreaks(days: ContributionDay[]): { current: number; longest: number } {
  let longest = 0;
  let run = 0;
  for (const day of days) {
    if (day.count > 0) {
      run += 1;
      if (run > longest) longest = run;
    } else {
      run = 0;
    }
  }

  let current = 0;
  for (let i = days.length - 1; i >= 0; i -= 1) {
    const day = days[i];
    if (!day) break;
    if (day.count > 0) {
      current += 1;
      continue;
    }
    if (current === 0 && i === days.length - 1) continue;
    break;
  }

  return { current, longest };
}

function withStreaks(
  weeks: ContributionWeek[],
  total: number,
  source: ContributionCalendar['source'],
): ContributionCalendar {
  const { current, longest } = computeStreaks(flattenDays(weeks));
  return { total, weeks, currentStreak: current, longestStreak: longest, source };
}

function weeksFromFlatDays(contributions: ContributionDay[]): ContributionWeek[] {
  if (contributions.length === 0) return [];
  const first = contributions[0];
  if (!first) return [];
  const weekday = new Date(`${first.date}T00:00:00Z`).getUTCDay();
  const padded: (ContributionDay | null)[] = [
    ...Array.from({ length: weekday }, () => null),
    ...contributions,
  ];
  const weeks: ContributionWeek[] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push({ days: padded.slice(i, i + 7) });
  }
  return weeks;
}

async function fetchCalendarFromGraphQL(login: string, token: string): Promise<ContributionCalendar> {
  const body = {
    query: `query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                date
                contributionCount
                contributionLevel
              }
            }
          }
        }
      }
    }`,
    variables: { login },
  };

  const json = await fetchJson<GraphQLCalendarResponse>(GRAPHQL_URL, {
    method: 'POST',
    headers: {
      ...headers(true),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const calendar = json.data?.user?.contributionsCollection?.contributionCalendar;
  if (!calendar || json.errors?.length) {
    throw new Error(json.errors?.[0]?.message ?? 'GraphQL calendar missing');
  }

  const weeks: ContributionWeek[] = calendar.weeks.map((week) => ({
    days: week.contributionDays.map((day) => ({
      date: day.date,
      count: day.contributionCount,
      level: levelFromGithub(day.contributionLevel, day.contributionCount),
    })),
  }));

  return withStreaks(weeks, calendar.totalContributions, 'graphql');
}

async function fetchCalendarFromFallback(login: string): Promise<ContributionCalendar> {
  const json = await fetchJson<FallbackCalendarResponse>(
    `${FALLBACK_CONTRIBUTIONS_URL}/${login}?y=last`,
    { headers: headers(true) },
  );

  const contributions = (json.contributions ?? []).map((day) => ({
    date: day.date,
    count: day.count,
    level: Math.max(0, Math.min(4, day.level)),
  }));

  const total =
    json.total?.['lastYear'] ??
    contributions.reduce((sum, day) => sum + day.count, 0);

  return withStreaks(weeksFromFlatDays(contributions), total, 'fallback');
}

async function fetchCalendar(login: string): Promise<ContributionCalendar> {
  const token = githubToken();
  if (token && !githubUnavailable()) {
    try {
      return await fetchCalendarFromGraphQL(login, token);
    } catch (error) {
      warn('GitHub GraphQL contributions failed, using fallback.', error);
    }
  }

  try {
    return await fetchCalendarFromFallback(login);
  } catch (error) {
    warn('Contribution fallback failed.', error);
    return emptyCalendar();
  }
}

async function fetchUser(login: string): Promise<GitHubUser> {
  if (githubUnavailable()) return fallbackUser(login);
  try {
    const json = await fetchJson<RestUser>(`${REST_URL}/users/${login}`, {
      headers: headers(),
    });
    return {
      login: json.login ?? login,
      name: json.name ?? DATA.name,
      avatarUrl: json.avatar_url ?? `https://github.com/${login}.png?size=240`,
      url: json.html_url ?? `https://github.com/${login}`,
      publicRepos: json.public_repos ?? 0,
      bio: json.bio ?? null,
    };
  } catch (error) {
    warn('GitHub user fetch failed.', error);
    return fallbackUser(login);
  }
}

async function fetchCommitActivity(repo: string): Promise<number[]> {
  if (githubUnavailable()) return [];
  try {
    const response = await fetch(`${REST_URL}/repos/${repo}/stats/commit_activity`, {
      headers: headers(),
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      if (response.status === 403 || response.status === 429) {
        skipGithubUntil = Date.now() + RATE_LIMIT_COOLDOWN_MS;
      }
      return [];
    }
    const weeks = (await response.json()) as { total?: number }[];
    if (!Array.isArray(weeks) || weeks.length === 0) return [];
    return weeks.slice(-16).map((week) => week.total ?? 0);
  } catch {
    return [];
  }
}

function ownerFromRepo(repo: string): string {
  return repo.split('/')[0] ?? repo;
}

function resolveRepoIcon(
  config: (typeof DATA.github.featured)[number],
  fallback: string,
): string {
  return 'icon' in config ? config.icon : fallback;
}

function resolveRepoIconDark(config: (typeof DATA.github.featured)[number]): string | null {
  return 'iconDark' in config ? config.iconDark : null;
}

function placeholderRepo(config: (typeof DATA.github.featured)[number]): FeaturedRepo {
  const owner = ownerFromRepo(config.repo);
  return {
    fullName: config.repo,
    name: config.repo.split('/')[1] ?? config.repo,
    title: config.title,
    description: config.description,
    url: `https://github.com/${config.repo}`,
    homepage: config.homepage ?? null,
    stars: 0,
    forks: 0,
    language: null,
    updatedAt: '',
    iconUrl: resolveRepoIcon(config, `https://github.com/${owner}.png?size=80`),
    iconUrlDark: resolveRepoIconDark(config),
    activity: [],
  };
}

export function sparklinePath(values: number[], width = 88, height = 28): string {
  const points = values.length > 1 ? values : [0, 0];
  const max = Math.max(...points, 1);
  const step = (width - 2) / Math.max(points.length - 1, 1);
  return points
    .map((value, index) => {
      const x = 1 + index * step;
      const y = height - 2 - (value / max) * (height - 4);
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
}

async function fetchRepo(config: (typeof DATA.github.featured)[number]): Promise<FeaturedRepo | null> {
  if (githubUnavailable()) return placeholderRepo(config);
  try {
    const [json, activity] = await Promise.all([
      fetchJson<RestRepo>(`${REST_URL}/repos/${config.repo}`, {
        headers: headers(),
      }),
      fetchCommitActivity(config.repo),
    ]);
    if (json.message || !json.html_url || !json.name) {
      throw new Error(json.message ?? `Missing repo ${config.repo}`);
    }

    const owner = json.owner?.login ?? ownerFromRepo(config.repo);
    const homepage = config.homepage ?? (json.homepage && json.homepage.length > 0 ? json.homepage : null);

    return {
      fullName: json.full_name ?? config.repo,
      name: json.name,
      title: config.title,
      description: config.description,
      url: json.html_url,
      homepage,
      stars: json.stargazers_count ?? 0,
      forks: json.forks_count ?? 0,
      language: json.language ?? null,
      updatedAt: json.pushed_at ?? '',
      iconUrl: resolveRepoIcon(
        config,
        json.owner?.avatar_url ?? `https://github.com/${owner}.png?size=80`,
      ),
      iconUrlDark: resolveRepoIconDark(config),
      activity,
    };
  } catch (error) {
    warn(`GitHub repo fetch failed for ${config.repo}.`, error);
    return placeholderRepo(config);
  }
}

function firstExistingPublicFile(names: string[]): string | undefined {
  const dir = join(process.cwd(), 'public');
  for (const name of names) {
    if (existsSync(join(dir, name))) return `/${name}`;
  }
  return undefined;
}

export function resolveBanner(): string {
  return (
    firstExistingPublicFile(['banner.jpg', 'banner.jpeg', 'banner.png', 'banner.webp']) ??
    '/banner.svg'
  );
}

export function resolveAvatar(githubAvatar: string): string {
  return (
    firstExistingPublicFile(['avatar.jpg', 'avatar.jpeg', 'avatar.png', 'avatar.webp']) ??
    githubAvatar
  );
}

function withCurrentIcons(data: GitHubPageData): GitHubPageData {
  const byRepo = new Map(DATA.github.featured.map((config) => [config.repo, config]));
  return {
    ...data,
    repos: data.repos.map((repo) => {
      const config = byRepo.get(repo.fullName);
      if (!config) return repo;
      return {
        ...repo,
        iconUrl: resolveRepoIcon(config, repo.iconUrl),
        iconUrlDark: resolveRepoIconDark(config),
      };
    }),
  };
}

export async function loadGitHub(): Promise<GitHubPageData> {
  const fresh = cachedPage();
  if (fresh) return withCurrentIcons(fresh);

  const stale = cachedPage(true);
  if (githubUnavailable() && stale) return withCurrentIcons(stale);

  const login = DATA.github.username;
  const [user, calendar, repos] = await Promise.all([
    fetchUser(login),
    fetchCalendar(login),
    Promise.all(DATA.github.featured.map((repo) => fetchRepo(repo))),
  ]);

  const data: GitHubPageData = {
    user,
    calendar,
    repos: repos.filter((repo): repo is FeaturedRepo => repo !== null),
    banner: resolveBanner(),
    avatar: resolveAvatar(user.avatarUrl),
  };

  if (isDegraded(data)) return withCurrentIcons(stale ?? data);
  writeDiskCache(data);
  return withCurrentIcons(data);
}
