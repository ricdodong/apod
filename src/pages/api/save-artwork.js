export const prerender = false;
import fs from "fs";
import path from "path";

export async function POST({ request }) {
  try {
    const { url, title } = await request.json();
    console.log("🎨 Save-artwork request:", { url, title });

    if (!url || !title) {
      console.error("⚠️ Missing url or title");
      return new Response(JSON.stringify({ error: "Missing data" }), {
        status: 400,
      });
    }

    const safeTitle = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    const artworkDir = path.join(process.cwd(), "public", "artworks");
    const filePath = path.join(artworkDir, `${safeTitle}.jpg`);

    // Make sure folder exists
    if (!fs.existsSync(artworkDir)) {
      fs.mkdirSync(artworkDir, { recursive: true });
      console.log("📁 Created directory:", artworkDir);
    }

    console.log("⬇️ Fetching image from:", url);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch artwork: ${response.status}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    console.log("✅ Saved artwork:", filePath);

    return new Response(
      JSON.stringify({ url: `/artworks/${safeTitle}.jpg` }),
      { status: 200 }
    );
  } catch (err) {
    console.error("❌ Save artwork error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
    });
  }
}
