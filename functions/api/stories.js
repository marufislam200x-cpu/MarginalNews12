
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
  if (!env.NEWS) return json({ error: "KV binding NEWS is missing" }, 500);

  const method = request.method;

  if (method === "GET") {
    const list = await env.NEWS.list({ prefix: "story:" });
    const stories = [];

    for (const key of list.keys) {
      const story = await env.NEWS.get(key.name, "json");
      if (story && story.status === "published") {
        if (!story.publishAt || new Date(story.publishAt) <= new Date()) {
          stories.push(story);
        }
      }
    }

    stories.sort((a, b) => (b.ts || 0) - (a.ts || 0));
    return json(stories);
  }

  if (!(await authorized(request, env))) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (method === "POST") {
    const story = await request.json();
    if (!story.title || !story.summary || !story.body) {
      return json({ error: "Title, summary and body are required" }, 400);
    }

    const id = crypto.randomUUID();
    const record = {
      ...story,
      id,
      ts: Date.now(),
      status: story.status || "draft"
    };

    await env.NEWS.put("story:" + id, JSON.stringify(record));
    return json(record, 201);
  }

  if (method === "PUT") {
    const story = await request.json();
    if (!story.id) return json({ error: "Story ID required" }, 400);

    const key = "story:" + story.id;
    const old = await env.NEWS.get(key, "json");
    if (!old) return json({ error: "Story not found" }, 404);

    const updated = { ...old, ...story, ts: Date.now() };
    await env.NEWS.put(key, JSON.stringify(updated));
    return json(updated);
  }

  if (method === "DELETE") {
    const { id } = await request.json();
    if (!id) return json({ error: "Story ID required" }, 400);

    await env.NEWS.delete("story:" + id);
    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, 405);
}
