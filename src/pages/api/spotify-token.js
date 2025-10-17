let cachedToken = null;
let tokenExpiry = 0;

export async function GET() {
  const now = Date.now();
  if (cachedToken && now < tokenExpiry) {
    return new Response(JSON.stringify({ access_token: cachedToken }));
  }

  const clientId = import.meta.env.SPOTIFY_CLIENT_ID;
  const clientSecret = import.meta.env.SPOTIFY_CLIENT_SECRET;
  const token = btoa(`${clientId}:${clientSecret}`);

  const res = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${token}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });

  const data = await res.json();
  cachedToken = data.access_token;
  tokenExpiry = now + data.expires_in * 1000 - 60 * 1000; // renew 1 min before expiry

  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
}
