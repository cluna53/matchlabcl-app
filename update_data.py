#!/usr/bin/env python3
"""Publish safe, public football-data.org snapshots for a static GitHub Pages site.
Never writes or prints the API token. Standard library only.
"""
import datetime as dt
import json
import os
from pathlib import Path
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

ROOT = Path(__file__).resolve().parents[1]
DEST = ROOT / 'data' / 'football.json'
API = 'https://api.football-data.org/v4'
LEAGUES = {'PD': 'LaLiga', 'PL': 'Premier', 'ELC': 'Championship', 'CL': 'Champions League', 'SA': 'Serie A', 'DED': 'Eredivisie'}
TOKEN = os.getenv('FOOTBALL_DATA_TOKEN', '').strip()

def get(endpoint):
    req = urllib.request.Request(API + endpoint, headers={'X-Auth-Token': TOKEN, 'User-Agent': 'MatchLab/0.5'})
    for attempt in range(3):
        try:
            with urllib.request.urlopen(req, timeout=25) as response:
                return json.load(response)
        except urllib.error.HTTPError as e:
            if e.code == 429 and attempt < 2:
                time.sleep(65)
                continue
            raise RuntimeError(f'API returned HTTP {e.code} for {endpoint}') from None
        except (TimeoutError, urllib.error.URLError) as e:
            if attempt < 2:
                time.sleep(3)
                continue
            raise RuntimeError(f'Network error fetching {endpoint}: {type(e).__name__}') from None

def main():
    if not TOKEN:
        print('Missing FOOTBALL_DATA_TOKEN GitHub Actions secret.', file=sys.stderr)
        return 2
    today = dt.datetime.now(dt.timezone.utc).date()
    end = today + dt.timedelta(days=14)
    snapshot = {'source': 'football-data.org', 'updatedAt': dt.datetime.now(dt.timezone.utc).isoformat(), 'leagues': {}, 'matches': [], 'standings': {}, 'history': {}, 'errors': {}}
    successful = 0
    for code, name in LEAGUES.items():
        try:
            params = urllib.parse.urlencode({'dateFrom': today.isoformat(), 'dateTo': end.isoformat()})
            raw = get(f'/competitions/{code}/matches?{params}')
            matches = raw.get('matches', [])
            snapshot['leagues'][name] = {'code': code, 'count': len(matches)}
            for m in matches:
                home, away = m.get('homeTeam') or {}, m.get('awayTeam') or {}
                snapshot['matches'].append({
                    'id': m.get('id'), 'league': name, 'utcDate': m.get('utcDate'),
                    'status': m.get('status'), 'matchday': m.get('matchday'),
                    'home': {'id': home.get('id'), 'name': home.get('shortName') or home.get('name') or 'Por determinar', 'crest': home.get('crest')},
                    'away': {'id': away.get('id'), 'name': away.get('shortName') or away.get('name') or 'Por determinar', 'crest': away.get('crest')},
                    'score': {'home': (m.get('score') or {}).get('fullTime', {}).get('home'), 'away': (m.get('score') or {}).get('fullTime', {}).get('away')}
                })
            successful += 1
        except Exception as e:
            snapshot['errors'][name] = str(e)
        time.sleep(7)  # comfortably below the free plan's 10 requests/minute
        try:
            standings = get(f'/competitions/{code}/standings')
            total = next((t for t in standings.get('standings', []) if t.get('type') == 'TOTAL'), None)
            snapshot['standings'][name] = [{
                'teamId': r.get('team', {}).get('id'), 'position': r.get('position'),
                'played': r.get('playedGames'), 'won': r.get('won'), 'draw': r.get('draw'), 'lost': r.get('lost'),
                'goalsFor': r.get('goalsFor'), 'goalsAgainst': r.get('goalsAgainst'), 'points': r.get('points')
            } for r in (total or {}).get('table', [])]
        except Exception as e:
            snapshot['errors'][name + ' standings'] = str(e)
        time.sleep(7)
        # Historical completed matches, with actual final scores only.
        try:
            start_history = today - dt.timedelta(days=120)
            history_params = urllib.parse.urlencode({'dateFrom': start_history.isoformat(), 'dateTo': (today - dt.timedelta(days=1)).isoformat(), 'status': 'FINISHED'})
            historical = get(f'/competitions/{code}/matches?{history_params}')
            records = []
            for match in historical.get('matches', []):
                full = (match.get('score') or {}).get('fullTime') or {}
                home_goals, away_goals = full.get('home'), full.get('away')
                home_id = (match.get('homeTeam') or {}).get('id')
                away_id = (match.get('awayTeam') or {}).get('id')
                if match.get('status') == 'FINISHED' and all(isinstance(v, int) and not isinstance(v, bool) for v in (home_goals, away_goals, home_id, away_id)):
                    records.append({'id': match.get('id'), 'date': match.get('utcDate'), 'homeId': home_id, 'awayId': away_id, 'homeGoals': home_goals, 'awayGoals': away_goals})
            snapshot['history'][name] = records
        except Exception as e:
            snapshot['errors'][name + ' history'] = str(e)
        time.sleep(7)
    if not successful:
        print('No competition fixtures could be fetched; keeping previous snapshot.', file=sys.stderr)
        return 1
    snapshot['matches'].sort(key=lambda m: m.get('utcDate') or '')
    DEST.parent.mkdir(parents=True, exist_ok=True)
    DEST.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f'Updated {len(snapshot["matches"])} fixtures across {successful} leagues. Partial errors: {len(snapshot["errors"])}')
    return 0

if __name__ == '__main__':
    sys.exit(main())
