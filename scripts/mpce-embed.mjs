// The only browser script the site emits. It sizes the MPCE board iframe on
// the homepage from height messages posted by /MPCE/#/embed (same origin).
// build.mjs inlines it; check.mjs rejects any other <script> element.
export const MPCE_FRAME_ID = "mpce-board";

export const MPCE_EMBED_SCRIPT = `(() => {
  const frame = document.getElementById("${MPCE_FRAME_ID}");
  if (!frame) return;
  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin || event.source !== frame.contentWindow) return;
    const data = event.data;
    if (!data || data.type !== "mpce-embed-height") return;
    const height = Number(data.height);
    if (!Number.isFinite(height) || height < 200 || height > 6000) return;
    frame.style.height = \`\${Math.ceil(height)}px\`;
  });
})();`;

export const MPCE_EMBED_SCRIPT_TAG = `<script>${MPCE_EMBED_SCRIPT}</script>`;
