/**
 * Copy text, surviving the cases where the async Clipboard API refuses.
 *
 * navigator.clipboard.writeText() is rejected by some browsers (Safari most
 * strictly) when it is called after an await, because the call no longer counts
 * as being inside the user's click. Creating a link involves a round trip to the
 * database first, so that is exactly the situation here — hence the
 * execCommand fallback, which has no such requirement.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return legacyCopy(text);
  }
}

function legacyCopy(text: string): boolean {
  const area = document.createElement("textarea");
  area.value = text;
  area.setAttribute("readonly", "");
  area.style.position = "fixed";
  area.style.top = "-9999px";
  document.body.appendChild(area);
  try {
    area.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    document.body.removeChild(area);
  }
}
