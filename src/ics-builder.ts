import { config } from "./config.js";
import type { Match, MatchStatus } from "./football-data.js";

// --- ICS date formatting (UTC) ---

const toIcsDate = (iso: string): string =>
  iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
// "2025-03-15T20:00:00Z" → "20250315T200000Z"

const addMinutesIso = (iso: string, minutes: number): string => {
  const d = new Date(iso);
  d.setMinutes(d.getMinutes() + minutes);
  return d.toISOString();
};

// --- ICS text escaping (RFC 5545 §3.3.11) ---

const escapeText = (text: string): string =>
  text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");

// --- Line folding (RFC 5545 §3.1: max 75 octets per line) ---

const foldLine = (line: string): string => {
  const maxLen = 75;
  if (line.length <= maxLen) return line;

  const parts: string[] = [line.slice(0, maxLen)];
  let i = maxLen;
  while (i < line.length) {
    parts.push(" " + line.slice(i, i + maxLen - 1));
    i += maxLen - 1;
  }
  return parts.join("\r\n");
};

// --- Calendar options: parameterize per-feed behavior ---

export interface CalendarOptions {
  readonly calendarName: string;
  readonly uidPrefix: string;
  // Label home/away relative to this team. Omit for neutral feeds (e.g. World Cup).
  readonly teamId?: number;
  // Minutes-before reminder. Omit for no notifications.
  readonly alarmMinutesBefore?: number;
  readonly alarmLabel?: string;
}

// --- Match → summary / description ---

// Human round name for knockout stages; null for the group stage (always has teams).
const STAGE_LABELS: Record<string, string> = {
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-final",
  SEMI_FINALS: "Semi-final",
  THIRD_PLACE: "Third-place Play-off",
  FINAL: "Final",
};

const stageLabel = (stage: string): string | null => STAGE_LABELS[stage] ?? null;

const buildSummary = (match: Match): string => {
  const home = match.homeTeam.shortName || match.homeTeam.name;
  const away = match.awayTeam.shortName || match.awayTeam.name;
  // Undetermined knockout slot → show the round instead of "null vs null".
  if (!home || !away) return stageLabel(match.stage) ?? "TBD";
  return `${home} vs ${away}`;
};

const buildDescription = (match: Match, opts: CalendarOptions): string => {
  const lines: string[] = [];
  lines.push(`Competition: ${match.competition.name}`);
  const round = stageLabel(match.stage);
  if (round) {
    lines.push(`Round: ${round}`);
  }
  if (match.matchday != null) {
    lines.push(`Matchday: ${match.matchday}`);
  }
  if (match.venue) {
    lines.push(`Venue: ${match.venue}`);
  }
  if (opts.teamId != null) {
    lines.push(match.homeTeam.id === opts.teamId ? "Home" : "Away");
  }

  const ft = match.score?.fullTime;
  if (match.status === "FINISHED" && ft?.home != null && ft?.away != null) {
    lines.push(`Score: ${ft.home} - ${ft.away}`);
  }
  return lines.join("\n"); // real newline; escapeText encodes it to \n per RFC 5545
};

const mapStatus = (status: MatchStatus): string => {
  switch (status) {
    case "POSTPONED":
    case "CANCELLED":
      return "CANCELLED";
    default:
      return "CONFIRMED";
  }
};

// --- VEVENT builder ---

const buildEvent = (match: Match, opts: CalendarOptions): string => {
  const dtStart = toIcsDate(match.utcDate);
  const dtEnd = toIcsDate(addMinutesIso(match.utcDate, config.matchDurationMinutes));
  const uid = `${opts.uidPrefix}-${match.id}@${config.calendarDomain}`;
  const now = toIcsDate(new Date().toISOString());

  const lines = [
    "BEGIN:VEVENT",
    foldLine(`UID:${uid}`),
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    foldLine(`SUMMARY:${escapeText(buildSummary(match))}`),
    foldLine(`DESCRIPTION:${escapeText(buildDescription(match, opts))}`),
    `STATUS:${mapStatus(match.status)}`,
    `TRANSP:OPAQUE`,
  ];

  if (match.venue) {
    lines.push(foldLine(`LOCATION:${escapeText(match.venue)}`));
  }

  // Only add alarm if the feed opted in, and only for upcoming matches.
  if (opts.alarmMinutesBefore != null && match.status !== "FINISHED") {
    lines.push(
      "BEGIN:VALARM",
      `TRIGGER:-PT${opts.alarmMinutesBefore}M`,
      "ACTION:DISPLAY",
      `DESCRIPTION:${escapeText(opts.alarmLabel ?? "Upcoming match")}`,
      "END:VALARM"
    );
  }

  lines.push("END:VEVENT");
  return lines.join("\r\n");
};

// --- Full calendar builder ---

export const buildCalendar = (
  matches: readonly Match[],
  opts: CalendarOptions
): string => {
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${config.calendarDomain}//${opts.calendarName}//EN`,
    `X-WR-CALNAME:${opts.calendarName}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ].join("\r\n");

  const events = matches.map((m) => buildEvent(m, opts)).join("\r\n");

  const footer = "END:VCALENDAR";

  return `${header}\r\n${events}\r\n${footer}\r\n`;
};
