import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchCompetitionMatches } from "../src/football-data.js";
import { buildCalendar } from "../src/ics-builder.js";

// FIFA World Cup, all matches, no notifications (no alarm, no team home/away).
export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    const matches = await fetchCompetitionMatches("WC");
    const ics = buildCalendar(matches, {
      calendarName: "FIFA World Cup",
      uidPrefix: "wc",
    });

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="worldcup.ics"');
    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=1800"
    );
    res.status(200).send(ics);
  } catch (error) {
    console.error("Failed to generate World Cup calendar:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    res.setHeader("Content-Type", "text/plain");
    res.status(500).send(`Calendar generation failed: ${message}`);
  }
}
