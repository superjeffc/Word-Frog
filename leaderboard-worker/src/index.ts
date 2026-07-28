export interface Env {
  DB: D1Database;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
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

    // 2. Health Check (Visit your subdomain in a browser to see this)
    if (url.pathname === "/" || url.pathname === "") {
      return new Response(JSON.stringify({
        status: "online",
        message: "Frog Leaderboard API is leaping!",
        date: new Date().toISOString()
      }), { headers });
    }

    // 3. GET: Fetch today's top 10 scores
    if (request.method === "GET" && url.pathname === "/leaderboard") {
      // If date is missing, default to the server's current UTC date
      const clientDate = url.searchParams.get("date") || new Date().toISOString().split('T')[0];
      const isNewVersion = url.searchParams.get("v") === "2";

      try {
        const [leaderboard, stats] = await env.DB.batch([
          // Query 1: The actual leaderboard
          env.DB.prepare(`
            SELECT username, score 
            FROM leaderboard 
            WHERE game_date = ?
            ORDER BY score DESC 
            LIMIT 10
          `).bind(clientDate),

          // Query 2: The Solve Counters
          env.DB.prepare(`
            SELECT 
              (SELECT COUNT(*) FROM leaderboard WHERE game_date = ?) as total_today,
              (SELECT COUNT(*) FROM leaderboard) as total_all_time
          `).bind(clientDate)
        ]);

        // --- MASKING LOGIC START ---
        // Regex to check if the username is a UUID (Standard 8-4-4-4-12 format)
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        const maskedPlayers = (leaderboard.results || []).map((player: any) => ({
          ...player,
          username: uuidRegex.test(player.username) ? "Anonymous Frog" : player.username
        }));
        // --- MASKING LOGIC END ---

        if (isNewVersion) {
          return Response.json({
            players: maskedPlayers,
            stats: (stats.results || [])[0]
          }, { headers });
        } else {
          return Response.json(maskedPlayers, { headers });
        }
      } catch (err) {
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
        if (uuid) {
          /**
           * UPSERT Logic: 
           * If the UUID exists, update the name (replacing 'Anonymous Frog').
           * If the UUID doesn't exist, insert it.
           * If the NAME is already taken by a DIFFERENT UUID, the 'username' constraint handles it.
           */
          result = await env.DB.prepare(`
            INSERT INTO leaderboard (username, score, game_date, uuid) 
            VALUES (?, ?, ?, ?) 
            ON CONFLICT(uuid) DO UPDATE SET 
              username = EXCLUDED.username
            WHERE uuid = EXCLUDED.uuid
          `).bind(cleanName, score, submissionDate, uuid).run();

        } else {
          // Fallback for older clients without UUID
          result = await env.DB.prepare(`
            INSERT INTO leaderboard (username, score, game_date) 
            VALUES (?, ?, ?) 
            ON CONFLICT(username, game_date) DO NOTHING
          `).bind(cleanName, score, submissionDate).run();
        }

        // 4. Check if the row was actually inserted (Conflict check)
        if (result.meta.changes === 0) {
          return new Response(JSON.stringify({
            success: false,
            message: "This name is already taken for today's puzzle!"
          }), { status: 409, headers });
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
        const [leaderboard, stats] = await env.DB.batch([
          // Query 1: Top 10 Completions
          env.DB.prepare(`
            SELECT 
              username, 
              COUNT(game_date) as total_days,
              MIN(id) as first_id
            FROM leaderboard 
            GROUP BY username 
            ORDER BY total_days DESC, first_id ASC 
            LIMIT 10
          `),

          // Query 2: Global Stats (Total Today and All-Time)
          env.DB.prepare(`
            SELECT 
              (SELECT COUNT(*) FROM leaderboard WHERE game_date = ?) as total_today,
              (SELECT COUNT(*) FROM leaderboard) as total_all_time
          `).bind(clientDate)
        ]);

        // Masking Logic: Swap UUIDs for "Anonymous Frog"
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

        const maskedPlayers = (leaderboard.results || []).map((player: any) => ({
          username: uuidRegex.test(player.username) ? "Anonymous Frog" : player.username,
          total_days: player.total_days
        }));

        if (isNewVersion) {
          return Response.json({
            players: maskedPlayers,
            stats: (stats.results || [])[0]
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
