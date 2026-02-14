#!/usr/bin/env python3
"""
Upload all repo images under assets/images/ to Supabase Storage (via the cms-upload Edge Function).

Why Edge Function:
- Avoids putting the service_role key on the client.
- Uses upsert=true so you can overwrite images later.

This script requires a Supabase admin session (email + password) to obtain a JWT,
then calls the Edge Function for each file.

Usage:
  SUPABASE_ADMIN_PASSWORD='...' python3 scripts/migrate_images_to_supabase.py

Optional flags:
  --dry-run           Only print what would be uploaded.
  --delete-local      Delete local image files after successful upload.
  --manifest PATH     Write a JSON manifest (default: scripts/supabase_images_manifest.json).
"""

from __future__ import annotations

import argparse
import getpass
import json
import mimetypes
import os
import posixpath
import re
import sys
import time
import uuid
import urllib.request
import urllib.error
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def _parse_supabase_config(js_path: Path) -> dict:
    text = js_path.read_text(encoding="utf-8", errors="ignore")
    url_m = re.search(r"url:\s*'([^']+)'", text)
    key_m = re.search(r"anonKey:\s*'([^']+)'", text)
    email_m = re.search(r"adminEmail:\s*'([^']+)'", text)
    bucket_m = re.search(r"assetsBucket:\s*'([^']+)'", text)
    fn_m = re.search(r"uploadFunction:\s*'([^']+)'", text)
    pages_table_m = re.search(r"pagesTable:\s*'([^']+)'", text)

    return {
        "url": url_m.group(1) if url_m else "",
        "anonKey": key_m.group(1) if key_m else "",
        "adminEmail": email_m.group(1) if email_m else "",
        "bucket": bucket_m.group(1) if bucket_m else "resume-cms",
        "uploadFunction": fn_m.group(1) if fn_m else "cms-upload",
        "pagesTable": pages_table_m.group(1) if pages_table_m else "cms_pages",
    }


def _sign_in_with_password(supabase_url: str, anon_key: str, email: str, password: str) -> str:
    endpoint = f"{supabase_url.rstrip('/')}/auth/v1/token?grant_type=password"
    payload = json.dumps({"email": email, "password": password}).encode("utf-8")
    req = urllib.request.Request(endpoint, data=payload, method="POST")
    req.add_header("apikey", anon_key)
    req.add_header("Content-Type", "application/json")
    req.add_header("Accept", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            data = json.loads(r.read().decode("utf-8", errors="replace") or "{}")
    except urllib.error.HTTPError as e:
        body = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Auth failed (HTTP {e.code}): {body[:300]}") from None
    token = str(data.get("access_token") or "").strip()
    if not token:
        raise RuntimeError("Auth succeeded but no access_token was returned.")
    return token


def _encode_multipart(fields: dict[str, str], file_field: str, filename: str, content_type: str, file_bytes: bytes):
    boundary = f"----ResumeCMSBoundary{uuid.uuid4().hex}"
    crlf = b"\r\n"
    body = bytearray()

    for name, value in fields.items():
        body.extend(f"--{boundary}".encode("utf-8"))
        body.extend(crlf)
        body.extend(f'Content-Disposition: form-data; name="{name}"'.encode("utf-8"))
        body.extend(crlf)
        body.extend(crlf)
        body.extend(str(value).encode("utf-8"))
        body.extend(crlf)

    body.extend(f"--{boundary}".encode("utf-8"))
    body.extend(crlf)
    body.extend(
        f'Content-Disposition: form-data; name="{file_field}"; filename="{filename}"'.encode("utf-8")
    )
    body.extend(crlf)
    body.extend(f"Content-Type: {content_type}".encode("utf-8"))
    body.extend(crlf)
    body.extend(crlf)
    body.extend(file_bytes)
    body.extend(crlf)

    body.extend(f"--{boundary}--".encode("utf-8"))
    body.extend(crlf)
    return boundary, bytes(body)


def _upload_via_edge_function(
    *,
    supabase_url: str,
    anon_key: str,
    access_token: str,
    function_name: str,
    bucket: str,
    object_path: str,
    file_path: Path,
) -> str:
    endpoint = f"{supabase_url.rstrip('/')}/functions/v1/{function_name}"
    raw_bytes = file_path.read_bytes()
    guessed = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"
    boundary, body = _encode_multipart(
        {"bucket": bucket, "path": object_path},
        "file",
        file_path.name,
        guessed,
        raw_bytes,
    )

    req = urllib.request.Request(endpoint, data=body, method="POST")
    req.add_header("apikey", anon_key)
    req.add_header("Authorization", f"Bearer {access_token}")
    req.add_header("Content-Type", f"multipart/form-data; boundary={boundary}")
    req.add_header("Accept", "application/json")

    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            payload = json.loads(r.read().decode("utf-8", errors="replace") or "{}")
    except urllib.error.HTTPError as e:
        body_txt = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"Upload failed (HTTP {e.code}) for {file_path}: {body_txt[:400]}"
        ) from None

    if not payload or payload.get("ok") is not True:
        raise RuntimeError(f"Upload failed for {file_path}: {payload}")
    public_url = str(payload.get("publicUrl") or "").strip()
    if not public_url:
        raise RuntimeError(f"Upload succeeded but no publicUrl returned for {file_path}.")
    return public_url


def _upload_via_storage_service_role(
    *,
    supabase_url: str,
    service_role_key: str,
    anon_key: str,
    bucket: str,
    object_path: str,
    file_path: Path,
) -> str:
    endpoint = f"{supabase_url.rstrip('/')}/storage/v1/object/{bucket}/{object_path}"
    raw_bytes = file_path.read_bytes()
    guessed = mimetypes.guess_type(str(file_path))[0] or "application/octet-stream"

    req = urllib.request.Request(endpoint, data=raw_bytes, method="POST")
    # Supabase expects apikey + Bearer JWT.
    req.add_header("apikey", anon_key)
    req.add_header("Authorization", f"Bearer {service_role_key}")
    req.add_header("Content-Type", guessed)
    req.add_header("x-upsert", "true")
    req.add_header("Accept", "application/json")

    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            _ = r.read()  # Body is not needed; read to finish request.
    except urllib.error.HTTPError as e:
        body_txt = e.read().decode("utf-8", errors="replace")
        raise RuntimeError(
            f"Storage upload failed (HTTP {e.code}) for {file_path}: {body_txt[:400]}"
        ) from None

    return f"{supabase_url.rstrip('/')}/storage/v1/object/public/{bucket}/{object_path}"


def _to_object_path(asset_path: str) -> str:
    # asset_path is like "assets/images/home/profile.png"
    clean = asset_path.replace("\\", "/").lstrip("/")
    if not clean.startswith("assets/"):
        raise ValueError(f"Expected an assets/ path, got: {asset_path}")
    return clean[len("assets/") :]


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--dry-run", action="store_true", help="Only print what would be uploaded.")
    parser.add_argument("--delete-local", action="store_true", help="Delete local files after successful upload.")
    parser.add_argument(
        "--manifest",
        default=str(REPO_ROOT / "scripts" / "supabase_images_manifest.json"),
        help="Write a JSON manifest mapping local asset paths to public URLs.",
    )
    args = parser.parse_args()

    cfg = _parse_supabase_config(REPO_ROOT / "js" / "supabase-config.js")
    supabase_url = str(cfg.get("url") or "").strip()
    anon_key = str(cfg.get("anonKey") or "").strip()
    email = str(cfg.get("adminEmail") or "").strip()
    bucket = str(cfg.get("bucket") or "resume-cms").strip() or "resume-cms"
    fn = str(cfg.get("uploadFunction") or "cms-upload").strip() or "cms-upload"

    if not supabase_url or not anon_key:
        print("ERROR: Missing Supabase URL/anonKey in js/supabase-config.js", file=sys.stderr)
        return 2
    if not email:
        print("ERROR: Missing adminEmail in js/supabase-config.js", file=sys.stderr)
        return 2

    images_dir = REPO_ROOT / "assets" / "images"
    if not images_dir.exists():
        print(f"ERROR: {images_dir} not found.", file=sys.stderr)
        return 2

    files: list[Path] = [p for p in images_dir.rglob("*") if p.is_file()]
    files.sort()
    if not files:
        print("No images found under assets/images.")
        return 0

    service_role_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or ""
    use_service_role = bool(service_role_key and not args.dry_run)

    access_token = ""
    if not args.dry_run and not use_service_role:
        password = os.environ.get("SUPABASE_ADMIN_PASSWORD") or ""
        if not password:
            # Prompt only when in an interactive terminal.
            if sys.stdin.isatty():
                password = getpass.getpass(f"Supabase password for {email}: ")
            else:
                print("ERROR: Set SUPABASE_ADMIN_PASSWORD or SUPABASE_SERVICE_ROLE_KEY in your environment.", file=sys.stderr)
                return 2
        access_token = _sign_in_with_password(supabase_url, anon_key, email, password)

    manifest: dict[str, str] = {}
    uploaded = 0
    started = time.time()

    for file_path in files:
        rel_asset = file_path.relative_to(REPO_ROOT).as_posix()
        if not rel_asset.startswith("assets/images/"):
            # Shouldn't happen given starting dir, but keep guard.
            continue
        object_path = _to_object_path(rel_asset)

        if args.dry_run:
            print(f"[dry-run] {rel_asset} -> {bucket}/{object_path}")
            continue

        if use_service_role:
            public_url = _upload_via_storage_service_role(
                supabase_url=supabase_url,
                service_role_key=service_role_key,
                anon_key=anon_key,
                bucket=bucket,
                object_path=object_path,
                file_path=file_path,
            )
        else:
            public_url = _upload_via_edge_function(
                supabase_url=supabase_url,
                anon_key=anon_key,
                access_token=access_token,
                function_name=fn,
                bucket=bucket,
                object_path=object_path,
                file_path=file_path,
            )
        manifest[rel_asset] = public_url
        uploaded += 1

        if args.delete_local:
            try:
                file_path.unlink()
            except Exception as e:
                print(f"WARN: Failed to delete {file_path}: {e}", file=sys.stderr)

        # Keep output short but informative.
        print(f"uploaded {uploaded}/{len(files)}: {posixpath.basename(rel_asset)}")

    if not args.dry_run:
        out_path = Path(args.manifest).expanduser().resolve()
        out_path.parent.mkdir(parents=True, exist_ok=True)
        out_path.write_text(json.dumps(manifest, indent=2, sort_keys=True), encoding="utf-8")

    elapsed = time.time() - started
    print(f"Done. Uploaded {uploaded} files in {elapsed:.1f}s.")
    if not args.dry_run:
        print(f"Manifest: {Path(args.manifest).expanduser().resolve()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
