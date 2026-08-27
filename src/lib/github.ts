import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { DATA } from '@/data/resume';

const GRAPHQL_URL = 'https://api.github.com/graphql';
const REST_URL = 'https://api.github.com';
const FALLBACK_CONTRIBUTIONS_URL = 'https://github-contributions-api.jogruber.de/v4';
const FETCH_TIMEOUT_MS = 10_000;
const USER_AGENT = 'allenjohn-portfolio';

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
  language: string | null;
  updatedAt: string;
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
  language?: string | null;
  pushed_at?: string;
  message?: string;
};

function githubToken(): string | undefined {
  const token = process.env['GITHUB_TOKEN'];
  return token && token.length > 0 ? token : undefined;
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
  if (token) {
    try {
      return await fetchCalendarFromGraphQL(login, token);
    } catch (error) {
      console.warn('GitHub GraphQL contributions failed, using fallback.', error);
    }
  }

  try {
    return await fetchCalendarFromFallback(login);
  } catch (error) {
    console.warn('Contribution fallback failed.', error);
    return emptyCalendar();
  }
}

async function fetchUser(login: string): Promise<GitHubUser> {
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
    console.warn('GitHub user fetch failed.', error);
    return fallbackUser(login);
  }
}

async function fetchRepo(config: (typeof DATA.github.featured)[number]): Promise<FeaturedRepo | null> {
  try {
    const json = await fetchJson<RestRepo>(`${REST_URL}/repos/${config.repo}`, {
      headers: headers(),
    });
    if (json.message || !json.html_url || !json.name) {
      throw new Error(json.message ?? `Missing repo ${config.repo}`);
    }

    const homepage = config.homepage ?? (json.homepage && json.homepage.length > 0 ? json.homepage : null);

    return {
      fullName: json.full_name ?? config.repo,
      name: json.name,
      title: config.title,
      description: config.description,
      url: json.html_url,
      homepage,
      stars: json.stargazers_count ?? 0,
      language: json.language ?? null,
      updatedAt: json.pushed_at ?? '',
    };
  } catch (error) {
    console.warn(`GitHub repo fetch failed for ${config.repo}.`, error);
    return {
      fullName: config.repo,
      name: config.repo.split('/')[1] ?? config.repo,
      title: config.title,
      description: config.description,
      url: `https://github.com/${config.repo}`,
      homepage: config.homepage ?? null,
      stars: 0,
      language: null,
      updatedAt: '',
    };
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

export async function loadGitHub(): Promise<GitHubPageData> {
  const login = DATA.github.username;
  const [user, calendar, repos] = await Promise.all([
    fetchUser(login),
    fetchCalendar(login),
    Promise.all(DATA.github.featured.map((repo) => fetchRepo(repo))),
  ]);

  return {
    user,
    calendar,
    repos: repos.filter((repo): repo is FeaturedRepo => repo !== null),
    banner: resolveBanner(),
    avatar: resolveAvatar(user.avatarUrl),
  };
}
