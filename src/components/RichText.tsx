import { Fragment } from "react";

/**
 * Any Giphy URL in the text is swapped for the GIF itself and the link is
 * dropped, so a pasted URL reads as the picture it points at.
 *
 * Giphy hands out several shapes for the same GIF:
 *   giphy.com/gifs/some-slug-aBcD123      (id is the last dash-separated token)
 *   giphy.com/embed/aBcD123
 *   media.giphy.com/media/aBcD123/giphy.gif
 *   media3.giphy.com/media/v1.Y2lkPT.../aBcD123/giphy.gif
 *   i.giphy.com/aBcD123.gif
 * All of them serve from the same canonical media URL once you have the id.
 */
const GIPHY = /https?:\/\/(?:[a-z0-9-]+\.)?giphy\.com\/\S+/gi;

function giphyId(url: string): string | null {
  const clean = url.replace(/[).,]+$/, "");

  const media = clean.match(/\/media\/(?:v1\.[^/]+\/)?([A-Za-z0-9]+)\//);
  if (media) return media[1];

  const embed = clean.match(/\/(?:embed|clips)\/([A-Za-z0-9]+)/);
  if (embed) return embed[1];

  const direct = clean.match(/i\.giphy\.com\/([A-Za-z0-9]+)\./);
  if (direct) return direct[1];

  // /gifs/funny-cat-aBcD123 — the id is the trailing token.
  const slug = clean.match(/\/gifs\/([A-Za-z0-9-]+)/);
  if (slug) {
    const last = slug[1].split("-").pop();
    if (last && last.length >= 6) return last;
  }
  return null;
}

/** Text with any Giphy links rendered as the GIF instead of the URL. */
export default function RichText({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  const gifs: string[] = [];
  const stripped = value.replace(GIPHY, (url) => {
    const id = giphyId(url);
    if (!id) return url; // not a GIF we can resolve, leave the text alone
    gifs.push(id);
    return "";
  });

  const text = stripped.replace(/[ \t]{2,}/g, " ").trim();

  return (
    <>
      {text && <p className={`whitespace-pre-wrap ${className}`}>{text}</p>}
      {gifs.map((id, i) => (
        <Fragment key={`${id}-${i}`}>
          {/* Not lazy: these sit inside the copy the reader is already looking
              at, and they are small, so deferring only delays them. */}
          <img
            src={`https://media.giphy.com/media/${id}/giphy.gif`}
            alt=""
            className={`max-h-64 w-auto max-w-full rounded-2xl border border-cream-20 ${
              text || i > 0 ? "mt-3" : ""
            }`}
          />
        </Fragment>
      ))}
    </>
  );
}
