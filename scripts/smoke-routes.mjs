import { spawn } from "node:child_process";
import { createServer } from "node:net";

const routes = [
  { path: "/", text: "Track market pulse with live-delayed charts and news." },
  { path: "/chart/AAPL", text: "AAPL" },
  { path: "/chart/BTC-USD", text: "BTC-USD" },
  { path: "/discover", text: "Discover" },
  { path: "/robots.txt", text: "sitemap" },
  { path: "/sitemap.xml", text: "snapcharts.com" },
];

const onePixelPng =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+yXJkAAAAASUVORK5CYII=";

async function getAvailablePort() {
  const server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  const address = server.address();
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve()))
  );
  return address.port;
}

async function waitForServer(baseUrl, child) {
  const deadline = Date.now() + 20_000;
  let lastError;

  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`Server exited early with code ${child.exitCode}`);
    }
    try {
      const response = await fetch(baseUrl);
      if (response.ok) return;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  throw new Error(`Server did not become ready: ${lastError?.message || "timeout"}`);
}

async function startServer() {
  const port = await getAvailablePort();
  const child = spawn(
    process.execPath,
    ["node_modules/next/dist/bin/next", "start"],
    {
      env: {
        ...process.env,
        HOSTNAME: "127.0.0.1",
        PORT: String(port),
        NODE_ENV: "production",
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );

  let output = "";
  child.stdout.on("data", (chunk) => {
    output += chunk.toString();
  });
  child.stderr.on("data", (chunk) => {
    output += chunk.toString();
  });

  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    await waitForServer(baseUrl, child);
  } catch (error) {
    child.kill("SIGTERM");
    throw new Error(`${error.message}\n${output}`);
  }

  return { baseUrl, child };
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function run() {
  const targetUrl = process.env.SMOKE_BASE_URL?.trim();
  const { baseUrl, child } = targetUrl
    ? { baseUrl: targetUrl.replace(/\/$/, ""), child: null }
    : await startServer();
  try {
    for (const route of routes) {
      const response = await fetch(new URL(route.path, baseUrl));
      const text = await response.text();
      assert(response.ok, `${route.path} returned ${response.status}`);
      if (!text.includes(route.text)) {
        // Debug: log what we got vs what we expected
        const snippet = text.length > 500 
          ? text.slice(0, 500) + '...' 
          : text;
        console.error(`Debug: Expected text not found in ${route.path}`);
        console.error(`Looking for: "${route.text}"`);
        console.error(`Response snippet: ${snippet}`);
      }
      assert(text.includes(route.text), `${route.path} missing ${route.text}`);
    }

    const shareResponse = await fetch(new URL("/api/charts/share", baseUrl), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        symbol: "AAPL",
        range: "1y",
        imageData: `data:image/png;base64,${onePixelPng}`,
      }),
    });
    const share = await shareResponse.json();
    assert(shareResponse.ok, `share POST returned ${shareResponse.status}`);
    assert(typeof share.id === "string", "share POST did not return an id");
    assert(typeof share.url === "string", "share POST did not return a url");
    assert(typeof share.image_url === "string", "share POST did not return an image_url");
    assert(share.noindex === true, "share POST did not return noindex: true");
    assert(share.image_url.includes(`/api/charts/share/${share.id}/image`), 
      "share image_url does not match expected pattern");

    const imageResponse = await fetch(
      new URL(`/api/charts/share/${share.id}/image`, baseUrl)
    );
    assert(imageResponse.ok, `share image returned ${imageResponse.status}`);
    assert(
      imageResponse.headers.get("content-type")?.includes("image/png"),
      "share image did not return PNG content"
    );

    const sharePageResponse = await fetch(new URL(`/chart/${share.id}`, baseUrl));
    assert(sharePageResponse.ok, `share page returned ${sharePageResponse.status}`);
    const sharePageHtml = await sharePageResponse.text();
    const robotsMatch = sharePageHtml.match(/<meta\s+name="robots"\s+content="([^"]+)"/i);
    assert(robotsMatch, "share page missing robots meta tag");
    assert(
      robotsMatch[1].includes('noindex') && robotsMatch[1].includes('nofollow'),
      `share page robots meta should be noindex,nofollow but got: ${robotsMatch[1]}`
    );
    assert(
      sharePageHtml.includes('property="og:image"'),
      "share page missing og:image meta tag"
    );
    console.log(`Route smoke checks passed against ${baseUrl}`);
  } finally {
    child?.kill("SIGTERM");
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
