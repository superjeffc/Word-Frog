const COMMON_WORDS = [
  // 4 letters
  "FROG", "TOAD", "LEAP", "POND", "BARK", "BLUE", "WIND", "CAMP", "DRUM", "FACT", 
  "GAME", "HAND", "JUMP", "KING", "LION", "MIND", "NEST", "RIDE", "SONG", "TENT", 
  "UNIT", "VEST", "WAVE", "YARD", "ZEAL", "ROAD", "WORK", "SHIP", "FISH", "BIRD", 
  "MILK", "COLD", "FIRE", "WOOD", "ROCK", "SAND", "DUST", "LUCK", "BOAT", "COAT",
  "DEER", "DUCK", "EAST", "WEST", "GATE", "HILL", "LAKE", "MOON", "RAIN", "SNOW",
  
  // 5 letters
  "GREEN", "WATER", "CROAK", "APPLE", "BREAD", "CHAIR", "DANCE", "EARTH", "FRUIT", 
  "GRASS", "HOUSE", "LIGHT", "MOUSE", "NIGHT", "PAPER", "QUEEN", "RIVER", "SHIRT", 
  "TABLE", "TRAIN", "VOICE", "WORLD", "YOUTH", "ZEBRA", "SHARK", "CLOUD", "STORM", 
  "FLAME", "STONE", "GLASS", "METAL", "BRICK", "PLANT", "SWEET", "MATCH", "SMOKE",
  "BEACH", "CLOCK", "FLUTE", "HEART", "LEMON", "ONION", "PIANO", "SNAKE", "TIGER",
  
  // 6 letters
  "YELLOW", "SPRING", "SUMMER", "WINTER", "AUTUMN", "FLOWER", "GARDEN", "FOREST", 
  "STREAM", "BRIDGE", "CASTLE", "PALACE", "TEMPLE", "CHURCH", "SCHOOL", "MARKET", 
  "STREET", "OFFICE", "POLICY", "SYSTEM", "METHOD", "ENGINE", "CAMERA", "SCREEN", 
  "PLAYER", "HOCKEY", "SOCCER", "TENNIS", "SADDLE", "BOTTLE", "KETTLE", "BASKET",
  "ANIMAL", "BUBBLE", "CANDLE", "DOLLAR", "FLIGHT", "GUITAR", "MONKEY", "PENCIL",
  
  // 7 letters
  "WEATHER", "JOURNEY", "BICYCLE", "AIRPORT", "STATION", "LIBRARY", "THEATER", 
  "COUNTRY", "VILLAGE", "BLANKET", "LANTERN", "CHIMNEY", "KITCHEN", "BEDROOM", 
  "HEADSET", "MONITOR", "PRINTER", "SCANNER", "SEASIDE", "BONFIRE", "HARVEST", 
  "SUNRISE", "SUNSET", "EVENING", "MORNING", "ACADEMY", "CAPTAIN", "DIAMOND",
  "JOURNAL", "OCTOPUS", "PENGUIN", "SILENCE", "SURGERY", "VICTORY", "WHISPER",
  
  // 8 letters
  "MOUNTAIN", "ELEPHANT", "COMPUTER", "KEYBOARD", "HOSPITAL", "BUILDING", 
  "BUSINESS", "MOVEMENT", "POSITION", "ACTIVITY", "LANGUAGE", "QUESTION", 
  "DOCUMENT", "STRENGTH", "FOREHEAD", "SHOULDER", "RAINBOW", "FEATHER", 
  "CHAMPION", "STRATEGY", "TREASURE", "MOONLIGHT", "SUNSHINE", "FIREWORK",
  "ACCIDENT", "BEAUTIFUL", "CALENDAR", "FESTIVAL", "FRIENDLY", "GARDENER",
  "SATELLITE", "SQUIRREL", "TRIANGLE", "UMBRELLA", "VACATION", "WINDMILL"
];

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
        const foundWord = COMMON_WORDS[Math.floor(Math.random() * COMMON_WORDS.length)];

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
