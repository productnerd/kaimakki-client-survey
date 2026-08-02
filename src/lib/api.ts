import { createClient } from "@supabase/supabase-js";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config";
import type { Answers } from "./survey";

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export type SurveyLink = {
  slug: string;
  client_name: string;
  contact_name: string | null;
  welcome_message: string | null;
  account_manager: string;
  answers: Answers;
  completed: boolean;
  /** Whether a reveal was written, so the welcome screen only promises a real one. */
  has_reveal: boolean;
  /** Both null until they complete — the server withholds them. */
  reveal_feedback: string | null;
  reveal_recommendations: string[] | null;
};

export type AdminLink = {
  id: string;
  slug: string;
  client_name: string;
  contact_name: string | null;
  welcome_message: string | null;
  account_manager: string;
  reveal_feedback: string | null;
  reveal_recommendations: string[] | null;
  created_at: string;
  opened_at: string | null;
  archived: boolean;
  answers: Answers | null;
  started_at: string | null;
  updated_at: string | null;
  completed_at: string | null;
};

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

/** Returns null when the slug does not exist or has been archived. */
export function openSurvey(slug: string) {
  return rpc<SurveyLink | null>("kaimakki_survey_open", { p_slug: slug });
}

export function saveSurvey(slug: string, answers: Answers, complete = false) {
  return rpc<{ ok: boolean; error?: string }>("kaimakki_survey_save", {
    p_slug: slug,
    p_answers: answers,
    p_complete: complete,
  });
}

export function adminList(passcode: string) {
  return rpc<{ ok: boolean; error?: string; links?: AdminLink[] }>(
    "kaimakki_survey_admin_list",
    { p_passcode: passcode },
  );
}

export function adminCreate(
  passcode: string,
  fields: {
    client_name: string;
    contact_name: string;
    welcome_message: string;
    account_manager: string;
    reveal_feedback: string;
    reveal_recommendations: string[];
  },
) {
  return rpc<{ ok: boolean; error?: string; slug?: string }>(
    "kaimakki_survey_admin_create",
    {
      p_passcode: passcode,
      p_client_name: fields.client_name,
      p_contact_name: fields.contact_name,
      p_welcome_message: fields.welcome_message,
      p_account_manager: fields.account_manager,
      p_reveal_feedback: fields.reveal_feedback,
      p_reveal_recommendations: fields.reveal_recommendations,
    },
  );
}

export type SurveyReport = {
  markdown: string;
  response_count: number;
  created_at: string;
};

/** The number of completed responses before a synthesis is worth generating. */
export const REPORT_MINIMUM = 5;

/** Last stored report, or null if none has been generated yet. */
export function adminReport(passcode: string) {
  return rpc<{ ok: boolean; error?: string; report?: SurveyReport | null }>(
    "kaimakki_survey_admin_report",
    { p_passcode: passcode },
  );
}

/** Generates a fresh synthesis. Costs a model call, so it's always explicit. */
export async function generateReport(passcode: string) {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/kaimakki-survey-report`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ passcode }),
  });
  return (await res.json()) as { ok: boolean; error?: string; report?: SurveyReport };
}

export function adminArchive(passcode: string, linkId: string, archived: boolean) {
  return rpc<{ ok: boolean; error?: string }>("kaimakki_survey_admin_archive", {
    p_passcode: passcode,
    p_link_id: linkId,
    p_archived: archived,
  });
}
