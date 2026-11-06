
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" }
  });

async function authorized(request, env) {
  return !!env.ADMIN_PASSWORD &&
    request.headers.get("x-admin-password") === env.ADMIN_PASSWORD;
}

export async function onRequest({ request, env }) {
  if (!env.NEWS) {
    return json({ error: "KV binding NEWS is missing" }, 500);
  }

  // Admin: download subscriber list as CSV
  if (request.method === "GET") {
    if (!(await authorized(request, env))) {
      return json({ error: "Unauthorized" }, 401);
    }

    const list = await env.NEWS.list({ prefix: "subscriber:" });
    const rows = [["Email", "Subscribed At"]];

    for (const item of list.keys) {
      const data = await env.NEWS.get(item.name, "json");
      if (data) {
        rows.push([data.email, data.createdAt || ""]);
      }
    }

    const csv = rows.map(row =>
      row.map(value =>
        '"' + String(value || "").replace(/"/g, '""') + '"'
      ).join(",")
    ).join("\n");

    return new Response("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": 'attachment; filename="marginal-news-subscribers.csv"'
      }
    });
  }

  // Public newsletter subscription
  if (request.method === "POST") {
    try {
      const { email } = await request.json();
      const cleanEmail = String(email || "").trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return json({ error: "Please enter a valid email address" }, 400);
      }

      const key = "subscriber:" + cleanEmail;
      const existing = await env.NEWS.get(key);

      if (existing) {
        return json({ success: true, message: "Already subscribed" });
      }

      await env.NEWS.put(key, JSON.stringify({
        email: cleanEmail,
        createdAt: new Date().toISOString()
      }));

      return json({ success: true, message: "Subscription successful" });
    } catch {
      return json({ error: "Invalid request" }, 400);
    }
  }

  return json({ error: "Method not allowed" }, 405);
}
