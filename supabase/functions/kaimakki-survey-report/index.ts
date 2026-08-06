// Synthesises every completed client survey into one dense, actionable report.
// Auth is the shared admin passcode, verified against the bcrypt hash in Postgres,
// the same gate as the dashboard. verify_jwt is off because the dashboard has no
// Supabase user session.

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const MIN_RESPONSES = 5;

const VIRTUES: Record<string, [string, string]> = {
  courage: ["plays it too safe", "reckless with the brand"],
  temperance: ["never rides a trend", "chases every trend"],
  generosity: ["hard to reach, does the minimum", "always on, no boundaries"],
  ambition: ["thinks too small", "grand ideas, shaky execution"],
  self_regard: ["undersells their own worth", "makes the work about themselves"],
  composure: ["too unbothered when things go wrong", "gets rattled or defensive"],
  truthfulness: ["undersells the work", "overpromises"],
  humour: ["all business, very dry", "all jokes, hard to take seriously"],
  friendliness: ["cold, purely transactional", "agrees with everything"],
  accountability: ["shrugs off mistakes", "over-apologises for small things"],
};

/** Each value statement, labelled with the company value it belongs to. */
const VALUES: Record<string, string> = {
  reliability: "Reliability (Freedom with ownership)",
  ownership: "Ownership (Freedom with ownership)",
  integrity: "Moral integrity (Ethics above profit)",
  trust: "Trust (Ethics above profit)",
  creativity: "Creativity (Craft over content)",
  meraki: "Meraki (Craft over content)",
  respect: "Respect and psychological safety (Empathy without ego)",
  humanity: "Humanity (Empathy without ego)",
};

function describeVirtues(virtues: Record<string, number> | undefined): string {
  if (!virtues) return "not answered";
  const parts: string[] = [];
  for (const [key, pos] of Object.entries(virtues)) {
    const pair = VIRTUES[key];
    if (!pair) continue;
    if (pos === 0) {
      parts.push(`${key}: balanced`);
    } else {
      const side = pos < 0 ? pair[0] : pair[1];
      const strength = Math.abs(pos) === 3 ? "strongly" : Math.abs(pos) === 2 ? "clearly" : "slightly";
      parts.push(`${key}: ${strength} ${side} (${pos > 0 ? "+" : ""}${pos})`);
    }
  }
  return parts.join("; ") || "not answered";
}

function describeValues(values: Record<string, number> | undefined): string {
  if (!values) return "not answered";
  const parts = Object.entries(values).map(([k, n]) => `${VALUES[k] ?? k}: ${n}/10`);
  return parts.join("; ") || "not answered";
}

const VALUE_GROUP_NAMES: Record<string, string> = {
  freedom: "Freedom with ownership",
  ethics: "Ethics above profit",
  craft: "Craft over content",
  empathy: "Empathy without ego",
};

function describeValueNotes(notes: Record<string, string> | undefined): string {
  if (!notes) return "none";
  const parts = Object.entries(notes)
    .filter(([, v]) => v?.trim())
    .map(([k, v]) => `${VALUE_GROUP_NAMES[k] ?? k}: "${v.trim()}"`);
  return parts.join(" | ") || "none";
}

/** Turn Anthropic's error envelope into something a non-engineer can act on. */
function explainAnthropicError(status: number, raw: string): string {
  let message = raw;
  try {
    message = JSON.parse(raw)?.error?.message ?? raw;
  } catch { /* keep raw */ }

  if (/credit balance is too low|insufficient.*credit/i.test(message)) {
    return "The Anthropic account behind this key is out of credit. Top it up in the Anthropic Console under Plans & Billing, then try again.";
  }
  if (status === 401 || /invalid x-api-key|authentication/i.test(message)) {
    return "The ANTHROPIC_API_KEY on this Supabase project is invalid or expired. Replace it in the project's Edge Function secrets.";
  }
  if (status === 429 || /rate.?limit/i.test(message)) {
    return "Anthropic rate-limited the request. Wait a minute and try again.";
  }
  if (status >= 500) {
    return "Anthropic had a server error. Try again in a moment.";
  }
  return message;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...CORS, "Content-Type": "application/json" },
    });

  try {
    const { passcode } = await req.json();
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY");

    if (!ANTHROPIC_API_KEY) {
      return json({ ok: false, error: "No ANTHROPIC_API_KEY is set on this Supabase project." }, 500);
    }

    const db = async (path: string, init: RequestInit = {}) => {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
        ...init,
        headers: {
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
          "Content-Type": "application/json",
          ...(init.headers ?? {}),
        },
      });
      if (!res.ok) throw new Error(`${path}: ${res.status} ${await res.text()}`);
      return res.json();
    };

    const authed = await db("rpc/kaimakki_survey_auth", {
      method: "POST",
      body: JSON.stringify({ p_passcode: passcode ?? "" }),
    });
    if (authed !== true) return json({ ok: false, error: "unauthorized" }, 401);

    const rows = await db(
      "kaimakki_survey_responses?select=answers,completed_at,kaimakki_survey_links(client_name,account_manager,archived)&completed_at=not.is.null",
    );

    // deno-lint-ignore no-explicit-any
    const responses = (rows as any[]).filter((r) => r.kaimakki_survey_links && !r.kaimakki_survey_links.archived);

    if (responses.length < MIN_RESPONSES) {
      return json({ ok: false, error: `Needs ${MIN_RESPONSES} completed responses, has ${responses.length}.` }, 400);
    }

    // deno-lint-ignore no-explicit-any
    const transcript = responses.map((r: any, i: number) => {
      const a = r.answers ?? {};
      const link = r.kaimakki_survey_links;
      const points = (a.selling_points ?? []).filter((p: string) => p?.trim());
      return [
        `### Client ${i + 1}: ${link.client_name} (account manager: ${link.account_manager})`,
        `Disappointment if Kaimakki disappeared (1 not at all, 7 very): ${a.pmf ?? "skipped"}`,
        `  Why: ${a.pmf_why?.trim() || "skipped"}`,
        `Would recommend to a business like theirs (NPS 0 to 10): ${a.nps ?? "skipped"}`,
        `Selling points they'd use: ${points.length ? points.join(" | ") : "skipped"}`,
        `The catch they'd warn a friend about: ${a.caveat?.trim() || "skipped"}`,
        `Main benefit: ${a.main_benefit?.trim() || "skipped"}`,
        `How we should improve: ${a.improve?.trim() || "skipped"}`,
        `Company values, rated 1 to 10: ${describeValues(a.values)}`,
        `Their comments on the values: ${describeValueNotes(a.value_notes)}`,
        `Account manager balance (0 = ideal middle, plus or minus 3 = extreme): ${describeVirtues(a.virtues)}`,
        `Their comments on ${link.account_manager}: ${a.virtues_note?.trim() || "none"}`,
        `What would make ${link.account_manager} 10x for them: ${a.am_advice?.trim() || "skipped"}`,
        `Where ${link.account_manager} shines: ${a.am_shines?.trim() || "skipped"}`,
        `Anything else: ${a.anything_else?.trim() || "skipped"}`,
      ].join("\n");
    }).join("\n\n");

    const prompt = `You are advising the founders of Kaimakki, a short-form social video agency. Below are ${responses.length} completed client feedback surveys.

Kaimakki's four company values are: Freedom with ownership, Ethics above profit, Craft over content, Empathy without ego. Clients rated two statements under each, 1 to 10.

Write the internal report the founders should read on a Monday morning. Dense, specific, and immediately actionable. No throat-clearing, no restating the methodology, no generic consulting language.

Rules:
- Quote clients verbatim when a quote makes the point better than a paraphrase. Attribute by client name.
- Name the specific client and account manager whenever a point traces to one. Do not anonymise.
- Distinguish a pattern (multiple clients) from a one-off (single client) and say which it is.
- If the evidence is thin for a claim, say so rather than inflating it.
- Prefer concrete actions with an owner over recommendations in the abstract.
- No praise padding. The founders want the problems.
- Write in plain words. Never use em dashes.

Structure it exactly as:

## The one thing
The single most important finding, in two or three sentences.

## What's working
The strengths that are real and repeatable, with evidence. Include the sharpest sales language clients gave us, which we reuse in pitches.

## What's broken
The problems, ordered by how much damage they're doing. Be blunt.

## Where we drift from our values
The value scores that are weakest, what the free text suggests is behind them, and whether it is one client or a pattern. Say which of the four values is under the most strain.

## Who we're not for
What the catches reveal about which prospects to disqualify.

## By account manager
A short, honest read on each account manager named in the data, including where they sit on the balance scales and what that means practically.

## Do these next
Five or fewer actions, each one sentence, most important first, each naming who should own it.

---

${transcript}`;

    const model = Deno.env.get("SURVEY_REPORT_MODEL") ?? "claude-opus-5";

    const aiRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiRes.ok) {
      return json({ ok: false, error: explainAnthropicError(aiRes.status, await aiRes.text()) }, 502);
    }

    const ai = await aiRes.json();
    const markdown = (ai.content ?? [])
      // deno-lint-ignore no-explicit-any
      .filter((b: any) => b.type === "text")
      // deno-lint-ignore no-explicit-any
      .map((b: any) => b.text)
      .join("\n")
      .trim();

    if (!markdown) return json({ ok: false, error: "The model returned no text. Try again." }, 502);

    await db("kaimakki_survey_reports", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify({ markdown, response_count: responses.length }),
    }).catch(() => {}); // storing is a convenience; still return the report if it fails

    return json({
      ok: true,
      report: {
        markdown,
        response_count: responses.length,
        created_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    return json({ ok: false, error: String(err) }, 500);
  }
});
