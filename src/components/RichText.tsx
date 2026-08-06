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

type Block = { kind: "text"; value: string } | { kind: "gif"; id: string };

/**
 * Splits the text at each GIF so the picture stays where it was pasted, on its
 * own line, with whatever was written before it above and after it below.
 */
function toBlocks(value: string): Block[] {
  const blocks: Block[] = [];
  let cursor = 0;

  for (const match of value.matchAll(GIPHY)) {
    const id = giphyId(match[0]);
    // Not a GIF we can resolve: leave the URL sitting in the text.
    if (!id || match.index === undefined) continue;

    const before = value.slice(cursor, match.index);
    if (before.trim()) blocks.push({ kind: "text", value: before.trim() });
    blocks.push({ kind: "gif", id });
    cursor = match.index + match[0].length;
  }

  const tail = value.slice(cursor);
  if (tail.trim()) blocks.push({ kind: "text", value: tail.trim() });

  return blocks;
}

/** Text with any Giphy links rendered as the GIF instead of the URL. */
export default function RichText({
  value,
  className = "",
}: {
  value: string;
  className?: string;
}) {
  const blocks = toBlocks(value);

  return (
    <>
      {blocks.map((block, i) =>
        block.kind === "text" ? (
          <p key={i} className={`whitespace-pre-wrap ${i > 0 ? "mt-3" : ""} ${className}`}>
            {block.value}
          </p>
        ) : (
          // Not lazy: these sit inside the copy the reader is already looking
          // at, and they are small, so deferring only delays them.
          <img
            key={i}
            src={`https://media.giphy.com/media/${block.id}/giphy.gif`}
            alt=""
            className={`mx-auto block h-auto w-3/4 rounded-2xl border border-cream-20 ${
              i > 0 ? "mt-3" : ""
            }`}
          />
        ),
      )}
    </>
  );
}
