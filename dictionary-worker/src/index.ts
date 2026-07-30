export interface Env {
  DICTIONARY_KV: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    if (url.pathname === "/validate" && request.method === "POST") {
      try {
        const body = await request.json() as { word?: string };
        const word = body.word;
        
        if (!word || typeof word !== "string") {
          return new Response(JSON.stringify({ error: "Missing word parameter" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const normalized = word.trim().toUpperCase();

        if (!/^[A-Z]+$/.test(normalized)) {
          return new Response(JSON.stringify({ valid: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        if (normalized.length === 1 && normalized !== "A" && normalized !== "I") {
          return new Response(JSON.stringify({ valid: false }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" }
          });
        }

        const value = await env.DICTIONARY_KV.get(normalized);
        const isValid = value !== null;

        return new Response(JSON.stringify({ valid: isValid }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    if (url.pathname === "/random" && request.method === "GET") {
      try {
        // Pick a random date between Jan 1, 2020 and Dec 31, 2045
        const start = new Date(2020, 0, 1).getTime();
        const end = new Date(2045, 11, 31).getTime();
        const randomTimestamp = start + Math.random() * (end - start);
        const randomDate = new Date(randomTimestamp);
        
        const yyyy = randomDate.getUTCFullYear();
        const mm = String(randomDate.getUTCMonth() + 1).padStart(2, '0');
        const dd = String(randomDate.getUTCDate()).padStart(2, '0');
        const dateString = `${yyyy}-${mm}-${dd}`;

        const res = await fetch(`https://wordfrogwordoftheday.superjeffc.com/getword?date=${dateString}`);
        if (!res.ok) {
          throw new Error("Failed to fetch word from daily API");
        }
        
        const json = await res.json() as { word: string };
        return new Response(JSON.stringify({ word: json.word.toUpperCase() }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        // Fallback word if fetch fails
        const fallbacks = ["FROG", "LEAP", "POND", "TOAD", "WATER", "GREEN", "JUMP", "CROAK"];
        const fallbackWord = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        return new Response(JSON.stringify({ word: fallbackWord, error: "Failed to fetch random date word, using fallback" }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }
    }

    return new Response(JSON.stringify({ error: "Not Found" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
};
