#!/usr/bin/env python3
import json
import ipaddress
import os
import posixpath
import sys
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse


MAX_SAVE_BYTES = 5 * 1024 * 1024
MAX_UPLOAD_BYTES = 10 * 1024 * 1024


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
    root_path = os.path.realpath(root)
    abs_path = os.path.realpath(os.path.join(root_path, rel))
    if os.path.commonpath([root_path, abs_path]) != root_path:
        raise ValueError("Path traversal blocked")
    os.makedirs(os.path.dirname(abs_path), exist_ok=True)
    with open(abs_path, "wb") as f:
        f.write(data)


class Handler(SimpleHTTPRequestHandler):
    server_version = "ResumeDevServer/1.0"

    def _is_local_client(self) -> bool:
        try:
            return ipaddress.ip_address(self.client_address[0]).is_loopback
        except ValueError:
            return False

    def _has_trusted_origin(self) -> bool:
        origin = (self.headers.get("Origin") or "").strip()
        if not origin:
            return True
        try:
            parsed = urlparse(origin)
            hostname = (parsed.hostname or "").lower()
            is_loopback_host = hostname == "localhost"
            if not is_loopback_host:
                is_loopback_host = ipaddress.ip_address(hostname).is_loopback
            port = parsed.port or (443 if parsed.scheme == "https" else 80)
            return (
                parsed.scheme in {"http", "https"}
                and is_loopback_host
                and port == self.server.server_port
            )
        except (ValueError, TypeError):
            return False

    def _content_length(self, maximum: int) -> int:
        try:
            length = int(self.headers.get("Content-Length", "0") or "0")
        except ValueError as exc:
            raise ValueError("Invalid Content-Length") from exc
        if length <= 0 or length > maximum:
            raise ValueError("Request body is empty or too large")
        return length

    def _get_security_headers(self, path: str):
        default_csp = (
            "default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data: blob: https:; "
            "media-src 'self' data: blob: https:; script-src 'self'; style-src 'self' 'unsafe-inline' "
            "https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; connect-src 'self' https:; "
            "form-action 'self'; frame-ancestors 'none'"
        )
        if path == "/admin/dashboard.html":
            return {
                "Content-Security-Policy": (
                    "default-src 'self'; base-uri 'self'; object-src 'none'; img-src 'self' data: blob: https:; "
                    "media-src 'self' data: blob: https:; script-src 'self' "
                    "'sha256-j6jze/KNzX7uxTlJ985Eb7uarz/gAZrqLrei3C3EUSI=' "
                    "'sha256-E55ktwBxfSE0PATbK3U9nbBLFjleqJdN1pwDYz6i4Pk='; "
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; "
                    "connect-src 'self' https:; form-action 'self'; frame-ancestors 'none'"
                ),
                "Referrer-Policy": "strict-origin-when-cross-origin",
                "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY",
            }
        if path.endswith(".html") or path in {"/", ""}:
            return {
                "Content-Security-Policy": default_csp,
                "Referrer-Policy": "strict-origin-when-cross-origin",
                "Permissions-Policy": "camera=(), geolocation=(), microphone=()",
                "X-Content-Type-Options": "nosniff",
                "X-Frame-Options": "DENY",
            }
        return {}

    def end_headers(self):
        # Local dev only: disable browser caching so updated assets show immediately.
        self.send_header("Cache-Control", "no-store, no-cache, must-revalidate, max-age=0")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        path = self.path.split("?", 1)[0].split("#", 1)[0]
        for header, value in self._get_security_headers(path).items():
            self.send_header(header, value)
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
        if self.path.startswith("/__cms/"):
            if not self._is_local_client() or not self._has_trusted_origin():
                return self._send_json(403, {"ok": False, "error": "Forbidden"})

        if self.path.startswith("/__cms/ping"):
            return self._send_json(200, {"ok": True})

        root = os.path.abspath(self.directory or os.getcwd())

        if self.path.startswith("/__cms/save"):
            try:
                length = self._content_length(MAX_SAVE_BYTES)
                raw = self.rfile.read(length)
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

            try:
                length = self._content_length(MAX_UPLOAD_BYTES + 512 * 1024)
                # Use cgi for multipart parsing (deprecated but fine for local dev).
                import cgi

                env = {
                    "REQUEST_METHOD": "POST",
                    "CONTENT_TYPE": ctype,
                    "CONTENT_LENGTH": str(length),
                }
                form = cgi.FieldStorage(fp=self.rfile, headers=self.headers, environ=env)
                rel = _safe_relpath(form.getfirst("path", ""))
                if not rel.startswith("assets/"):
                    raise ValueError("Uploads must be inside assets/")
                file_field = form["file"] if "file" in form else None
                if file_field is None or not getattr(file_field, "file", None):
                    raise ValueError("Missing file")
                data = file_field.file.read()
                if not isinstance(data, (bytes, bytearray)) or not 0 < len(data) <= MAX_UPLOAD_BYTES:
                    raise ValueError("Upload is empty or too large")
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
