#!/usr/bin/env python3
import argparse
import json
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from urllib.request import Request, urlopen
from zoneinfo import ZoneInfo

TZ = ZoneInfo('Asia/Shanghai')
ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = ROOT / 'data'
RUNTIME_DIR = ROOT / 'runtime'
ARCHIVE_ROOT = RUNTIME_DIR / 'archives'

URLS = {
    'feed-all.json': 'https://raw.githubusercontent.com/Valiant-Cat/daily-ai-trends/main/data/feed-all.json',
    'feed-github.json': 'https://raw.githubusercontent.com/Valiant-Cat/daily-ai-trends/main/data/feed-github.json',
    'feed-huggingface.json': 'https://raw.githubusercontent.com/Valiant-Cat/daily-ai-trends/main/data/feed-huggingface.json',
    'feed-x.json': 'https://raw.githubusercontent.com/Valiant-Cat/daily-ai-trends/main/data/feed-x.json',
    'feed-reddit.json': 'https://raw.githubusercontent.com/Valiant-Cat/daily-ai-trends/main/data/feed-reddit.json',
}

PROVIDERS = ['github', 'huggingface', 'x', 'reddit']


def fetch_json(url: str):
    req = Request(url, headers={'User-Agent': 'daily-ai-trends/prepare-daily-snapshot'})
    with urlopen(req, timeout=30) as resp:
        return json.loads(resp.read().decode('utf-8'))


def parse_iso(value: str | None):
    if not value:
        return None
    return datetime.fromisoformat(value.replace('Z', '+00:00')).astimezone(TZ)


def is_recent(feed_all: dict, max_age_hours: int):
    generated_at = parse_iso(feed_all.get('generatedAt'))
    if not generated_at:
        return False, None
    threshold = datetime.now(TZ) - timedelta(hours=max_age_hours)
    return generated_at >= threshold, generated_at.isoformat()


def has_complete_sources(feed_all: dict):
    source_status = {}
    complete = True
    for provider in PROVIDERS:
        payload = feed_all.get(provider) or {}
        count = int(payload.get('count') or 0)
        items = payload.get('items') or []
        mode = payload.get('mode')
        ok = count > 0 and len(items) > 0 and mode != 'error'
        source_status[provider] = {
            'count': count,
            'items': len(items),
            'mode': mode,
            'updatedAt': payload.get('updatedAt'),
            'ok': ok,
        }
        if not ok:
            complete = False
    return complete, source_status


def load_remote_snapshot(max_age_hours: int):
    feed_all = fetch_json(URLS['feed-all.json'])
    recent, generated_at = is_recent(feed_all, max_age_hours)
    complete, source_status = has_complete_sources(feed_all)
    if not recent or not complete:
        return None, {
            'reason': 'remote_stale_or_incomplete',
            'generatedAt': generated_at,
            'recent': recent,
            'complete': complete,
            'sources': source_status,
        }

    payloads = {'feed-all.json': feed_all}
    for name, url in URLS.items():
        if name == 'feed-all.json':
            continue
        payloads[name] = fetch_json(url)
    return payloads, {
        'reason': 'remote_ok',
        'generatedAt': generated_at,
        'recent': recent,
        'complete': complete,
        'sources': source_status,
    }


def run_local_regeneration():
    proc = subprocess.run(
        'npm run generate',
        cwd=str(ROOT),
        shell=True,
        text=True,
        capture_output=True,
    )
    if proc.returncode != 0:
        raise RuntimeError(proc.stderr or proc.stdout or 'npm run generate failed')

    payloads = {}
    for name in URLS:
        path = DATA_DIR / name
        if not path.exists():
            raise RuntimeError(f'missing local output: {path}')
        payloads[name] = json.loads(path.read_text())

    complete, source_status = has_complete_sources(payloads['feed-all.json'])
    if not complete:
        raise RuntimeError(f'local regeneration still incomplete: {json.dumps(source_status, ensure_ascii=False)}')

    return payloads, {
        'reason': 'local_regenerated',
        'sources': source_status,
    }


def write_archive(payloads: dict, archive_date: str, metadata: dict):
    out_dir = ARCHIVE_ROOT / archive_date
    out_dir.mkdir(parents=True, exist_ok=True)

    for name, payload in payloads.items():
        (out_dir / name).write_text(json.dumps(payload, ensure_ascii=False, indent=2))

    manifest = {
        'archiveDate': archive_date,
        'preparedAt': datetime.now(TZ).isoformat(),
        **metadata,
        'files': sorted(payloads.keys()),
    }
    (out_dir / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2))
    return out_dir, manifest


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--date', help='Archive date in YYYY-MM-DD. Defaults to today in Asia/Shanghai.')
    parser.add_argument('--max-age-hours', type=int, default=8)
    args = parser.parse_args()

    archive_date = args.date or datetime.now(TZ).date().isoformat()
    remote_payloads, remote_meta = load_remote_snapshot(args.max_age_hours)
    if remote_payloads is not None:
        out_dir, manifest = write_archive(remote_payloads, archive_date, {
            'source': 'remote',
            'maxAgeHours': args.max_age_hours,
            'remoteCheck': remote_meta,
        })
    else:
        local_payloads, local_meta = run_local_regeneration()
        out_dir, manifest = write_archive(local_payloads, archive_date, {
            'source': 'local-regenerated',
            'maxAgeHours': args.max_age_hours,
            'remoteCheck': remote_meta,
            'localCheck': local_meta,
        })

    print(json.dumps({
        'status': 'ok',
        'archiveDir': str(out_dir),
        'manifest': manifest,
    }, ensure_ascii=False))


if __name__ == '__main__':
    try:
        main()
    except Exception as exc:
        print(json.dumps({'status': 'error', 'error': str(exc)}, ensure_ascii=False), file=sys.stderr)
        raise
