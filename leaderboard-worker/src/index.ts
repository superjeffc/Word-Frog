export interface Env {
  DB: D1Database;
  STATS_KV: KVNamespace;
}

export default {
  // Scheduled trigger for 24-hour cleanup
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    ctx.waitUntil((async () => {
      try {
        // Keep only records from today and yesterday (last 24-48 hours window to cover all timezones)
        await env.DB.prepare(`
          DELETE FROM leaderboard 
          WHERE game_date < date('now', '-1 day')
        `).run();
      } catch (err) {
        console.error("Scheduled cleanup error:", err);
      }
    })());
  },

  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Shared headers for CORS and JSON
    const headers: Record<string, string> = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Content-Type": "application/json"
    };

    // 1. Handle Preflight (Required for React Native Web/Browsers)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers });
    }

    // 2. Health Check
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(JSON.stringify({
        status: "online",
        message: "Frog Leaderboard API is leaping!",
        date: new Date().toISOString()
      }), { headers });
    }

    // Helper to get total_all_time count (KV -> D1 game_stats fallback)
    async function getTotalAllTime(): Promise<number> {
      try {
        if (env.STATS_KV) {
          const kvVal = await env.STATS_KV.get("total_all_time");
          if (kvVal !== null) {
            return parseInt(kvVal, 10) || 0;
          }
        }
      } catch (e) {
        console.error("KV read error:", e);
      }

      // Fallback to D1 game_stats table
      try {
        const row = await env.DB.prepare(
          "SELECT stat_value FROM game_stats WHERE stat_key = 'total_all_time'"
        ).first<{ stat_value: number }>();
        const count = row?.stat_value ?? 0;
        if (env.STATS_KV && count > 0) {
          ctx.waitUntil(env.STATS_KV.put("total_all_time", count.toString()));
        }
        return count;
      } catch (e) {
        console.error("D1 game_stats read error:", e);
        return 0;
      }
    }

    // 3. GET: Fetch today's top 10 scores
    if (request.method === "GET" && url.pathname === "/leaderboard") {
      const clientDate = url.searchParams.get("date") || new Date().toISOString().split('T')[0];
      const isNewVersion = url.searchParams.get("v") === "2";

      try {
        // Run index-optimized queries in batch
        const [leaderboard, todayStats, totalAllTime] = await Promise.all([
          // Query 1: Top 10 uses index idx_leaderboard_date_score (game_date, score DESC)
          env.DB.prepare(`
            SELECT username, score 
            FROM leaderboard 
            WHERE game_date = ?
            ORDER BY score DESC 
            LIMIT 10
          `).bind(clientDate).all(),

          // Query 2: Total today uses covering index idx_leaderboard_date
          env.DB.prepare(`
            SELECT COUNT(*) as total_today 
            FROM leaderboard 
            WHERE game_date = ?
          `).bind(clientDate).first<{ total_today: number }>(),

          // Query 3: Total all-time read from KV (0 D1 row reads)
          getTotalAllTime()
        ]);

        // --- MASKING LOGIC START ---
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const maskedPlayers = (leaderboard.results || []).map((player: any) => ({
          ...player,
          username: uuidRegex.test(player.username) ? "Anonymous Frog" : player.username
        }));
        // --- MASKING LOGIC END ---

        const responseHeaders = {
          ...headers,
          // Short edge cache to absorb bursts without stale UX
          "Cache-Control": "public, max-age=30, stale-while-revalidate=60"
        };

        if (isNewVersion) {
          return Response.json({
            players: maskedPlayers,
            stats: {
              total_today: todayStats?.total_today ?? 0,
              total_all_time: totalAllTime
            }
          }, { headers: responseHeaders });
        } else {
          return Response.json(maskedPlayers, { headers: responseHeaders });
        }
      } catch (err) {
        console.error("Leaderboard read error:", err);
        return new Response(JSON.stringify({ error: "Database read error" }), { status: 500, headers });
      }
    }

    // 4. POST: Submit a new score
    if (request.method === "POST" && url.pathname === "/submit") {
      try {
        const { username, score, date, uuid } = await request.json() as any;

        // 1. Validation: Clean the name OR validate UUID (allowing # for character tags)
        let cleanName: string;
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(username);
        if (isUuid) {
          cleanName = username;
        } else {
          cleanName = (username || "").replace(/[^a-zA-Z0-9 #]/g, "").trim().substring(0, 20);
        }
        if (!cleanName) {
          return new Response(JSON.stringify({ error: "Invalid name" }), { status: 400, headers });
        }

        // 2. Handle missing date: Fallback to server UTC date if the app didn't send one
        const submissionDate = date || new Date().toISOString().split('T')[0];

        // 3. Check if we have a UUID (New Client) or not (Old Client)
        let result: any;
        let isNewInsert = false;

        if (uuid) {
          // Check if this UUID already exists for today before inserting/updating
          const existing = await env.DB.prepare(`
            SELECT id, username FROM leaderboard WHERE uuid = ?
          `).bind(uuid).first<{ id: number; username: string }>();

          result = await env.DB.prepare(`
            INSERT INTO leaderboard (username, score, game_date, uuid) 
            VALUES (?, ?, ?, ?) 
            ON CONFLICT(uuid) DO UPDATE SET 
              username = EXCLUDED.username
            WHERE uuid = EXCLUDED.uuid
          `).bind(cleanName, score, submissionDate, uuid).run();

          // Only count as a new game completion if this UUID wasn't already recorded
          if (!existing && result.meta.changes > 0) {
            isNewInsert = true;
          }
        } else {
          // Fallback for older clients without UUID
          result = await env.DB.prepare(`
            INSERT INTO leaderboard (username, score, game_date) 
            VALUES (?, ?, ?) 
            ON CONFLICT(username, game_date) DO NOTHING
          `).bind(cleanName, score, submissionDate).run();

          if (result.meta.changes > 0) {
            isNewInsert = true;
          }
        }

        // 4. Check if the row was actually inserted (Conflict check)
        if (result.meta.changes === 0) {
          return new Response(JSON.stringify({
            success: false,
            message: "This name is already taken for today's puzzle!"
          }), { status: 409, headers });
        }

        // 5. Update counters asynchronously if a new score was logged
        if (isNewInsert) {
          ctx.waitUntil((async () => {
            try {
              // Atomically increment counter in D1 game_stats table
              const updated = await env.DB.prepare(`
                INSERT INTO game_stats (stat_key, stat_value)
                VALUES ('total_all_time', 1)
                ON CONFLICT(stat_key) DO UPDATE SET stat_value = stat_value + 1
                RETURNING stat_value
              `).first<{ stat_value: number }>();

              const newCount = updated?.stat_value;
              if (env.STATS_KV && newCount !== undefined) {
                await env.STATS_KV.put("total_all_time", newCount.toString());
              }
            } catch (err) {
              console.error("Failed to update counter:", err);
            }
          })());
        }

        return new Response(JSON.stringify({ success: true }), { status: 201, headers });

      } catch (err) {
        console.error("Worker Error:", err);
        return new Response(JSON.stringify({ error: "Submission failed" }), { status: 400, headers });
      }
    }

    // 5. GET: Fetch top 10 total completed by username
    if (request.method === "GET" && url.pathname === "/total-completed") {
      const clientDate = url.searchParams.get("date") || new Date().toISOString().split('T')[0];
      const isNewVersion = url.searchParams.get("v") === "2";

      try {
        const [leaderboard, todayStats, totalAllTime] = await Promise.all([
          // Top 10 Completions
          env.DB.prepare(`
            SELECT 
              username, 
              COUNT(game_date) as total_days,
              MIN(id) as first_id
            FROM leaderboard 
            GROUP BY username 
            ORDER BY total_days DESC, first_id ASC 
            LIMIT 10
          `).all(),

          // Total today
          env.DB.prepare(`
            SELECT COUNT(*) as total_today 
            FROM leaderboard 
            WHERE game_date = ?
          `).bind(clientDate).first<{ total_today: number }>(),

          // Total all time from KV
          getTotalAllTime()
        ]);

        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        const maskedPlayers = (leaderboard.results || []).map((player: any) => ({
          username: uuidRegex.test(player.username) ? "Anonymous Frog" : player.username,
          total_days: player.total_days
        }));

        if (isNewVersion) {
          return Response.json({
            players: maskedPlayers,
            stats: {
              total_today: todayStats?.total_today ?? 0,
              total_all_time: totalAllTime
            }
          }, { headers });
        } else {
          return Response.json(maskedPlayers, { headers });
        }
      } catch (err) {
        return Response.json({ error: "Failed to fetch totals" }, { status: 500, headers });
      }
    }

    // 6. 404 for any other path
    return new Response(JSON.stringify({ error: "Path not found" }), { status: 404, headers });
  }
};
