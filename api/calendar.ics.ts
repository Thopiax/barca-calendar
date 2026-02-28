import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchMatches } from "../src/football-data.js";
import { buildCalendar } from "../src/ics-builder.js";

export default async function handler(
  _req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  try {
    const matches = await fetchMatches();
    const ics = buildCalendar(matches);

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", 'inline; filename="barca.ics"');
    res.setHeader(
      "Cache-Control",
      "public, max-age=3600, s-maxage=3600, stale-while-revalidate=1800"
    );
    res.status(200).send(ics);
  } catch (error) {
    console.error("Failed to generate calendar:", error);

    const message =
      error instanceof Error ? error.message : "Unknown error";

    res.setHeader("Content-Type", "text/plain");
    res.status(500).send(`Calendar generation failed: ${message}`);
  }
}
