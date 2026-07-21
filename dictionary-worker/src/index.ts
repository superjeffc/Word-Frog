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
        let attempts = 0;
        let foundWord = "";
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
        
        while (attempts < 10 && !foundWord) {
          attempts++;
          // Generate a random 2-letter prefix
          const randomPrefix = chars[Math.floor(Math.random() * 26)] + chars[Math.floor(Math.random() * 26)];
          
          const listResult = await env.DICTIONARY_KV.list({ prefix: randomPrefix, limit: 100 });
          const eligible = listResult.keys
            .map(k => k.name.toUpperCase())
            .filter(name => name.length >= 4 && name.length <= 8 && /^[A-Z]+$/.test(name) && /[AEIOUY]/.test(name));
            
          if (eligible.length > 0) {
            foundWord = eligible[Math.floor(Math.random() * eligible.length)];
          }
        }
        
        // Fallback if we couldn't find a word after 10 attempts
        if (!foundWord) {
          const fallbacks = ["FROG", "LEAP", "POND", "TOAD", "WATER", "GREEN", "JUMP", "CROAK"];
          foundWord = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        }

        return new Response(JSON.stringify({ word: foundWord }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Failed to generate random word" }), {
          status: 500,
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
