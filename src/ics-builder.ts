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

// --- Match → summary / description ---

const isHome = (match: Match): boolean =>
  match.homeTeam.id === config.teamId;

const buildSummary = (match: Match): string => {
  const home = match.homeTeam.shortName || match.homeTeam.name;
  const away = match.awayTeam.shortName || match.awayTeam.name;
  return `${home} vs ${away}`;
};

const buildDescription = (match: Match): string => {
  const lines: string[] = [];
  lines.push(`Competition: ${match.competition.name}`);
  if (match.matchday != null) {
    lines.push(`Matchday: ${match.matchday}`);
  }
  if (match.venue) {
    lines.push(`Venue: ${match.venue}`);
  }
  lines.push(isHome(match) ? "Home" : "Away");

  const ft = match.score?.fullTime;
  if (match.status === "FINISHED" && ft?.home != null && ft?.away != null) {
    lines.push(`Score: ${ft.home} - ${ft.away}`);
  }
  return lines.join("\n");
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

const buildEvent = (match: Match): string => {
  const dtStart = toIcsDate(match.utcDate);
  const dtEnd = toIcsDate(addMinutesIso(match.utcDate, config.matchDurationMinutes));
  const uid = `match-${match.id}@${config.calendarDomain}`;
  const now = toIcsDate(new Date().toISOString());

  const lines = [
    "BEGIN:VEVENT",
    foldLine(`UID:${uid}`),
    `DTSTAMP:${now}`,
    `DTSTART:${dtStart}`,
    `DTEND:${dtEnd}`,
    foldLine(`SUMMARY:${escapeText(buildSummary(match))}`),
    foldLine(`DESCRIPTION:${escapeText(buildDescription(match))}`),
    `STATUS:${mapStatus(match.status)}`,
    `TRANSP:OPAQUE`,
  ];

  if (match.venue) {
    lines.push(foldLine(`LOCATION:${escapeText(match.venue)}`));
  }

  // Only add alarm for upcoming matches
  if (match.status !== "FINISHED") {
    lines.push(
      "BEGIN:VALARM",
      "TRIGGER:-PT3H",
      "ACTION:DISPLAY",
      `DESCRIPTION:${config.teamName} plays in 3 hours!`,
      "END:VALARM"
    );
  }

  lines.push("END:VEVENT");
  return lines.join("\r\n");
};

// --- Full calendar builder ---

export const buildCalendar = (matches: readonly Match[]): string => {
  const header = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${config.calendarDomain}//Barca Calendar//EN`,
    `X-WR-CALNAME:${config.calendarName}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ].join("\r\n");

  const events = matches.map(buildEvent).join("\r\n");

  const footer = "END:VCALENDAR";

  return `${header}\r\n${events}\r\n${footer}\r\n`;
};
