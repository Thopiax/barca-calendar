export const config = {
  teamId: 81,
  teamName: "Barça",
  calendarName: "FC Barcelona Matches",
  calendarDomain: "barca-calendar.vercel.app",
  alarmMinutesBefore: 180,
  matchDurationMinutes: 120,
  lookbackDays: 7,
  lookforwardDays: 60,
  apiBaseUrl: "https://api.football-data.org/v4",
} as const;
