import { config } from "./config.js";

// --- Types matching football-data.org v4 response shape ---

export interface Competition {
  readonly id: number;
  readonly name: string;
  readonly code: string;
}

export interface Team {
  readonly id: number;
  readonly name: string;
  readonly shortName: string;
}

export interface Score {
  readonly fullTime: { readonly home: number | null; readonly away: number | null };
}

export type MatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "LIVE"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "POSTPONED"
  | "SUSPENDED"
  | "CANCELLED";

export interface Match {
  readonly id: number;
  readonly competition: Competition;
  readonly utcDate: string;
  readonly status: MatchStatus;
  readonly matchday: number | null;
  readonly homeTeam: Team;
  readonly awayTeam: Team;
  readonly venue: string | null;
  readonly score: Score;
}

interface MatchesResponse {
  readonly matches: readonly Match[];
}

// --- Date helpers (pure functions, no deps) ---

const toDateString = (d: Date): string => d.toISOString().split("T")[0]!;

const addDays = (d: Date, days: number): Date => {
  const result = new Date(d);
  result.setDate(result.getDate() + days);
  return result;
};

// --- API client ---

const fetchPath = async (path: string): Promise<readonly Match[]> => {
  const apiKey = process.env.FOOTBALL_DATA_API_KEY;
  if (!apiKey) {
    throw new Error("FOOTBALL_DATA_API_KEY environment variable is not set");
  }

  const url = new URL(path, config.apiBaseUrl);
  url.searchParams.set("status", "SCHEDULED,TIMED,LIVE,IN_PLAY,PAUSED,FINISHED");

  const response = await fetch(url.toString(), {
    headers: { "X-Auth-Token": apiKey },
  });

  if (!response.ok) {
    throw new Error(
      `football-data.org API error: ${response.status} ${response.statusText}`
    );
  }

  const data = (await response.json()) as MatchesResponse;
  return data.matches;
};

export const fetchMatches = async (): Promise<readonly Match[]> => {
  const now = new Date();
  const dateFrom = toDateString(addDays(now, -config.lookbackDays));
  const dateTo = toDateString(addDays(now, config.lookforwardDays));
  return fetchPath(
    `/v4/teams/${config.teamId}/matches?dateFrom=${dateFrom}&dateTo=${dateTo}`
  );
};

// Every match of a competition (e.g. "WC" = FIFA World Cup) for its current season.
export const fetchCompetitionMatches = (code: string): Promise<readonly Match[]> =>
  fetchPath(`/v4/competitions/${code}/matches`);
