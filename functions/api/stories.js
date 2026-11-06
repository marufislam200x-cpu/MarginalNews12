
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

const categoryNames = {
  intl: "World",
  geo: "Politics",
  eco: "Business",
  sci: "Technology",
  env: "Environment",
  edu: "Education",
  fact: "Fact-Check",
  read: "Long Read",
  op: "Opinion"
};

function normalizeStory(story) {
  const createdAt = story.createdAt ||
    (story.ts ? new Date(story.ts).toISOString() : "");

  return {
    ...story,
    category: story.category || categoryNames[story.sec] || story.sec || "News",
    publishedAt: story.publishedAt || story.publishAt || createdAt,
    createdAt
  };
}

async function getAllStories(env) {
  const stories = [];
  let cursor;

  do {
    const options = { prefix: "story:" };
    if (cursor) options.cursor = cursor;

    const result = await env.NEWS.list(options);

    const records = await Promise.all(
      result.keys.map(key => env.NEWS.get(key.name, "json"))
    );

    for (const story of records) {
      if (story) stories.push(normalizeStory(story));
    }

    cursor = result.list_complete ? undefined : result.cursor;
  } while (cursor);

  return stories;
}

export async function onRequest({ request, env }) {
  if (!env.NEWS) {
    return json({ error: "KV binding NEWS is missing" }, 500);
  }

  const method = request.method;

  if (method === "GET") {
    const passwordProvided = request.headers.has("x-admin-password");

    if (passwordProvided && !(await authorized(request, env))) {
      return json({ error: "Incorrect admin password" }, 401);
    }

    let stories = await getAllStories(env);

    if (!passwordProvided) {
      const now = Date.now();

      stories = stories.filter(story => {
        if (story.status !== "published") return false;

        if (!story.publishAt) return true;

        const scheduledTime = new Date(story.publishAt).getTime();

        return !Number.isFinite(scheduledTime) || scheduledTime <= now;
      });
    }

    stories.sort((a, b) =>
      (b.ts || 0) - (a.ts || 0)
    );

    return json(stories);
  }

  if (!(await authorized(request, env))) {
    return json({ error: "Unauthorized" }, 401);
  }

  if (method === "POST") {
    let story;

    try {
      story = await request.json();
    } catch {
      return json({ error: "Invalid JSON data" }, 400);
    }

    if (
      !story.title?.trim() ||
      !story.summary?.trim() ||
      !story.body?.trim()
    ) {
      return json({
        error: "Title, summary and body are required"
      }, 400);
    }

    const id = crypto.randomUUID();

    const record = {
      ...story,
      id,
      title: story.title.trim(),
      summary: story.summary.trim(),
      body: story.body.trim(),
      ts: Date.now(),
      status: story.status || "draft"
    };

    await env.NEWS.put(
      "story:" + id,
      JSON.stringify(record)
    );

    return json(normalizeStory(record), 201);
  }

  if (method === "PUT") {
    let story;

    try {
      story = await request.json();
    } catch {
      return json({ error: "Invalid JSON data" }, 400);
    }

    if (!story.id) {
      return json({ error: "Story ID required" }, 400);
    }

    const key = "story:" + story.id;
    const old = await env.NEWS.get(key, "json");

    if (!old) {
      return json({ error: "Story not found" }, 404);
    }

    const updated = {
      ...old,
      ...story,
      id: old.id,
      ts: Date.now()
    };

    await env.NEWS.put(key, JSON.stringify(updated));

    return json(normalizeStory(updated));
  }

  if (method === "DELETE") {
    let data;

    try {
      data = await request.json();
    } catch {
      return json({ error: "Invalid JSON data" }, 400);
    }

    if (!data.id) {
      return json({ error: "Story ID required" }, 400);
    }

    const key = "story:" + data.id;
    const existing = await env.NEWS.get(key);

    if (!existing) {
      return json({ error: "Story not found" }, 404);
    }

    await env.NEWS.delete(key);

    return json({ success: true });
  }

  return json({ error: "Method not allowed" }, 405);
}
