# Kaimakki Client Survey

Personalised feedback surveys for Kaimakki clients. Each client gets their own link
(`/acme-coffee-roasters_a7b4zu`) with their name and a message from their account manager.

**Live:** https://productnerd.github.io/kaimakki-client-survey/
**Admin:** append `/admin` — passcode-gated.

## The survey

Nine questions: Sean Ellis PMF question, three selling points, main benefit,
what to improve, NPS, a ten-dimension read on the account manager, advice for them,
where they shine, and an open box.

The account-manager rating uses Aristotle's golden mean — each dimension runs from a
deficiency to an excess and **the centre is the good answer**, so a client can say
"too cautious" or "too reckless" rather than just "good/bad". Scored as distance from
centre: dead centre 100, one step 50, extreme 0.

Answers autosave to the database on every step, so a client can close the tab and pick
up where they left off, and you can see who dropped out mid-way.

## Stack

Vite + React 19 + TypeScript + Tailwind, deployed to GitHub Pages by Actions on push to
`main`. Backend is the shared **SeeHer** Supabase project (`knftyqkhampkqchoncel`),
tables prefixed `kaimakki_survey_`.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # also emits 404.html for deep links on Pages
npm run lint
```

## How the data is protected

All three tables have RLS enabled with **zero policies**, so the anon key in
`src/lib/config.ts` reads nothing directly — a client cannot enumerate other clients'
links or read anybody's answers. Everything goes through `SECURITY DEFINER` functions:

| Function | Caller | Does |
| --- | --- | --- |
| `kaimakki_survey_open(slug)` | client | returns display fields for that one link plus their own draft |
| `kaimakki_survey_save(slug, answers, complete)` | client | upserts the draft; refuses once submitted |
| `kaimakki_survey_admin_list(passcode)` | admin | every link and response |
| `kaimakki_survey_admin_create(passcode, …)` | admin | mints a link, returns the slug |
| `kaimakki_survey_admin_archive(passcode, id, bool)` | admin | archive / restore |
| `kaimakki_survey_admin_set_passcode(passcode, new)` | admin | rotate the passcode (min 10 chars) |

The admin passcode is stored as a bcrypt hash (cost 12) in `kaimakki_survey_config` and
compared inside Postgres — it is never in the frontend bundle, and there is no
service_role key in the browser. The internal `kaimakki_survey_auth` helper is not
granted to `anon`, so it can't be used as a passcode oracle.

### Changing the passcode

From the SQL editor, or ask Claude to run it:

```sql
select public.kaimakki_survey_admin_set_passcode('current-passcode', 'your-new-passcode');
```

## Custom domain

To move from the github.io path to `clientsurvey.kaimakki.com`, add this DNS record at
the registrar for kaimakki.com:

```
CNAME   clientsurvey   productnerd.github.io
```

Then set the custom domain in the repo's Pages settings and change `base` in
`vite.config.ts` to `/`. Existing slugs keep working.
