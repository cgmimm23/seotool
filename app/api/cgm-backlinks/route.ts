import { NextRequest, NextResponse } from "next/server";
import { cgmsearch } from "@/lib/cgmsearch";

export const dynamic = "force-dynamic";

// Backlink explorer powered by our OWN crawler (CGM Search -> web_backlink),
// not Moz. Given a domain, returns totals, referring domains, top anchors, and
// a paged list of backlinks (source -> anchor -> dofollow/nofollow).
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const raw = searchParams.get("siteUrl") || "";
  const limit = Math.min(parseInt(searchParams.get("limit") || "100", 10) || 100, 500);
  const domain = raw
    .replace(/^https?:\/\//i, "")
    .replace(/^www\./i, "")
    .replace(/\/.*$/, "")
    .trim()
    .toLowerCase();
  if (!domain) return NextResponse.json({ error: "siteUrl param required" }, { status: 400 });

  try {
    const [summary, rows, anchors] = await Promise.all([
      cgmsearch.$queryRawUnsafe<any[]>(
        `SELECT count(*)::int AS total,
                count(DISTINCT src_host)::int AS refdomains,
                count(*) FILTER (WHERE NOT nofollow)::int AS dofollow,
                (SELECT dr FROM web_domain_rank WHERE host = $1) AS dr
         FROM web_backlink WHERE dst_host = $1`,
        domain,
      ),
      cgmsearch.$queryRawUnsafe<any[]>(
        `SELECT b.src_url, b.src_host, b.anchor, b.nofollow, b.last_seen, r.dr AS src_dr
         FROM web_backlink b
         LEFT JOIN web_domain_rank r ON r.host = b.src_host
         WHERE b.dst_host = $1
         ORDER BY r.dr DESC NULLS LAST, b.last_seen DESC LIMIT $2`,
        domain,
        limit,
      ),
      cgmsearch.$queryRawUnsafe<any[]>(
        `SELECT anchor, count(*)::int AS n FROM web_backlink
         WHERE dst_host = $1 AND anchor <> ''
         GROUP BY anchor ORDER BY n DESC LIMIT 15`,
        domain,
      ),
    ]);

    const s = summary[0] || { total: 0, refdomains: 0, dofollow: 0 };
    return NextResponse.json({
      domain,
      metrics: {
        dr: s.dr ?? null,
        totalLinks: s.total,
        linkingDomains: s.refdomains,
        dofollow: s.dofollow,
        nofollow: s.total - s.dofollow,
      },
      backlinks: rows.map((r) => ({
        domain: r.src_host,
        dr: r.src_dr ?? null,
        sourceUrl: r.src_url,
        anchor: r.anchor || "",
        type: r.nofollow ? "nofollow" : "dofollow",
        lastSeen: r.last_seen
          ? new Date(r.last_seen).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : "",
      })),
      topAnchors: anchors.map((a) => ({ anchor: a.anchor, count: a.n })),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
