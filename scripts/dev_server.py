#!/usr/bin/env python3
import json
import os
import posixpath
import sys
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


def _safe_relpath(raw: str) -> str:
    value = (raw or "").strip().replace("\\", "/")
    value = value.split("?", 1)[0].split("#", 1)[0]
    value = value.lstrip("/")
    # Normalize while keeping it relative.
    value = posixpath.normpath(value)
    if value.startswith("../") or value == "..":
        raise ValueError("Path traversal blocked")
    return value


def _write_bytes(root: str, rel: str, data: bytes) -> None:
    abs_path = os.path.normpath(os.path.join(root, rel))
    if not abs_path.startswith(os.path.normpath(root) + os.sep):
        raise ValueError("Path traversal blocked")
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    with open(abs_path, "wb") as f:
        f.write(data)


class Handler(SimpleHTTPRequestHandler):
    server_version = "ResumeDevServer/1.0"

    def end_headers(self):
        # Local dev only: disable browser caching so updated assets show immediately.
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        super().end_headers()

    def _send_json(self, code: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.startswith("/__cms/ping"):
            return self._send_json(200, {"ok": True})
        return super().do_GET()

    def do_POST(self):
        if self.path.startswith("/__cms/ping"):
            return self._send_json(200, {"ok": True})

        root = os.path.abspath(self.directory or os.getcwd())

        if self.path.startswith("/__cms/save"):
            length = int(self.headers.get("Content-Length", "0") or "0")
            raw = self.rfile.read(length) if length > 0 else b"{}"
            try:
                payload = json.loads(raw.decode("utf-8"))
                rel = _safe_relpath(payload.get("path", ""))
                html = payload.get("html", "")
                if not rel.endswith(".html"):
                    raise ValueError("Only .html can be saved")
                _write_bytes(root, rel, str(html).encode("utf-8"))
                return self._send_json(200, {"ok": True, "path": rel})
            except Exception as e:
                return self._send_json(400, {"ok": False, "error": str(e)})

        if self.path.startswith("/__cms/upload"):
            ctype = self.headers.get("Content-Type", "")
            if "multipart/form-data" not in ctype:
                return self._send_json(400, {"ok": False, "error": "Expected multipart/form-data"})

            # Use cgi for multipart parsing (deprecated but fine for local dev).
            import cgi

            env = {
                "REQUEST_METHOD": "POST",
                "CONTENT_TYPE": ctype,
            }
            form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ=env)
            try:
                rel = _safe_relpath(form.getfirst("path", ""))
                if not rel.startswith("assets/"):
                    raise ValueError("Uploads must be inside assets/")
                file_field = form["file"] if "file" in form else None
                if file_field is None or not getattr(file_field, "file", None):
                    raise ValueError("Missing file")
                data = file_field.file.read()
                if not isinstance(data, (bytes, bytearray)) or len(data) == 0:
                    raise ValueError("Empty upload")
                _write_bytes(root, rel, bytes(data))
                return self._send_json(200, {"ok": True, "path": rel})
            except Exception as e:
                return self._send_json(400, {"ok": False, "error": str(e)})

        self.send_error(HTTPStatus.NOT_FOUND, "Unknown endpoint")


def main():
    port = int(os.environ.get("PORT", "4173"))
    host = os.environ.get("HOST", "127.0.0.1")
    directory = os.path.abspath(os.environ.get("ROOT", os.getcwd()))

    Handler.directory = directory
    httpd = ThreadingHTTPServer((host, port), Handler)
    print(f"Serving on http://{host}:{port} (root={directory})")
    print("CMS endpoints: /__cms/ping, /__cms/save, /__cms/upload")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    sys.exit(main())
