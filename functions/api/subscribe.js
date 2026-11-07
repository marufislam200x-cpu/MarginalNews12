
const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store"
    }
  });

async function authorized(request, env) {
  return Boolean(
    env.ADMIN_PASSWORD &&
    request.headers.get("x-admin-password") === env.ADMIN_PASSWORD
  );
}

async function getAllSubscribers(env) {
  const subscribers = [];
  let cursor;

  
  do {
    const options = { prefix: "subscriber:" };
    if (cursor) options.cursor = cursor;

    const result = await env.NEWS.list(options);

    const records = await Promise.all(
      result.keys.map(item => env.NEWS.get(item.name, "json"))
    );

    for (const data of records) {
      if (data?.email) subscribers.push(data);
    }

    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return subscribers;
}

export async function onRequest({ request, env }) {
  if (!env.NEWS) {
    return json({ error: "KV binding NEWS is missing" }, 500);
  }

  if (request.method === "GET") {
    if (!(await authorized(request, env))) {
      return json({ error: "Unauthorized" }, 401);
    }

    const subscribers = await getAllSubscribers(env);

    const rows = [
      ["Email", "Subscribed At"],
      ...subscribers.map(item => [
        item.email,
        item.createdAt || ""
      ])
    ];

    const csv = rows.map(row =>
      row.map(value =>
        '"' + String(value ?? "").replace(/"/g, '""') + '"'
      ).join(",")
    ).join("\r\n");

    return new Response("\uFEFF" + csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition":
          'attachment; filename="marginal-news-subscribers.csv"',
        "Cache-Control": "no-store"
      }
    });
  }

  if (request.method === "POST") {
    try {
      const { email } = await request.json();
      const cleanEmail = String(email || "").trim().toLowerCase();

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
        return json({
          error: "Please enter a valid email address"
        }, 400);
      }

      const key = "subscriber:" + cleanEmail;
      const existing = await env.NEWS.get(key);

      if (existing) {
        return json({
          success: true,
          message: "Already subscribed"
        });
      }

      await env.NEWS.put(key, JSON.stringify({
        email: cleanEmail,
        createdAt: new Date().toISOString()
      }));

      return json({
        success: true,
        message: "Subscription successful"
      }, 201);

    } catch {
      return json({ error: "Invalid request" }, 400);
    }
  }

  return json({ error: "Method not allowed" }, 405);
}
