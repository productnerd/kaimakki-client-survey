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
};

export type AdminLink = {
  id: string;
  slug: string;
  client_name: string;
  contact_name: string | null;
  welcome_message: string | null;
  account_manager: string;
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
    },
  );
}

export function adminArchive(passcode: string, linkId: string, archived: boolean) {
  return rpc<{ ok: boolean; error?: string }>("kaimakki_survey_admin_archive", {
    p_passcode: passcode,
    p_link_id: linkId,
    p_archived: archived,
  });
}
