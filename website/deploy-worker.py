#!/usr/bin/env python3
"""Deploy website/index.html as the `diplomamate-website` Cloudflare Worker.

The website is a single self-contained file (inline CSS + JS), so the Worker
script just serves it.

How the HTML gets into the Worker (no template-literal nesting tricks):
- The page source is embedded in the execute code as a JSON string literal
  (valid JS), so backticks / `${` / quotes inside the HTML cannot break it.
- Inside the sandbox, JSON.stringify(html) re-escapes it into the Worker
  script, which is uploaded with PUT /workers/scripts/diplomamate-website.

Usage:  python3 deploy-worker.py [--print-code]
Uploads via the Cloudflare connector CLI (`cloudflare execute`). The route
`www.diplomamate.online/*` is pointed at this Worker separately.
"""
import json
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
HTML = (HERE / "index.html").read_text(encoding="utf-8")
HTML_JSON = json.dumps(HTML)  # valid JS double-quoted string literal

WORKER_FETCH = """addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.pathname === '/health') {
    event.respondWith(new Response('ok', {headers: {'content-type': 'text/plain'}}));
    return;
  }
  event.respondWith(new Response(HTML, {headers: {'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=3600'}}));
});"""
assert "`" not in WORKER_FETCH and "${" not in WORKER_FETCH

# JS code for `cloudflare execute`. It must be a function expression; the CLI
# calls it. `html` is the page source (JSON string literal); `script` is the
# Worker source, built with JSON.stringify + a template literal.
# NOTE: the \\n below is a literal backslash-n in the generated JS string
# escape (Python '\\\\n' would be wrong here — this file is written with the
# two characters backslash + n inside the Python string).
CODE = (
    "async () => {\n"
    "  const html = " + HTML_JSON + ";\n"
    "  const script = 'const HTML = ' + JSON.stringify(html) + ';\\n' + `"
    + WORKER_FETCH
    + "`;\n"
    "  const res = await cloudflare.request({method: 'PUT', path: '/accounts/' + accountId + '/workers/scripts/diplomamate-website', body: script, contentType: 'application/javascript'});\n"
    "  return {success: res.success, id: res.result ? res.result.id : null, errors: res.errors};\n"
    "}"
)

if "--print-code" in sys.argv:
    Path("/tmp/code.js").write_text(CODE, encoding="utf-8")
    print("code written to /tmp/code.js,", len(CODE), "chars")
    sys.exit(0)

result = subprocess.run(
    ["/opt/hatch/bin/cloudflare", "execute", "--arguments-json", json.dumps({"code": CODE})],
    capture_output=True, text=True, timeout=180,
)
print(result.stdout)
print(result.stderr, file=sys.stderr)
sys.exit(result.returncode)
