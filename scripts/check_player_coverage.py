#!/usr/bin/env python3
"""Diagnostic only: query free API-Football coverage; never expose credentials."""
import json, os, urllib.request, urllib.error, datetime, pathlib
key=os.environ.get('API_FOOTBALL_KEY','').strip()
if not key:
    raise SystemExit('ERROR: API_FOOTBALL_KEY is not configured.')
base='https://v3.football.api-sports.io'
headers={'x-apisports-key':key,'User-Agent':'MatchLab-coverage-check/1.0'}
def get(path):
    req=urllib.request.Request(base+path,headers=headers)
    try:
        with urllib.request.urlopen(req,timeout=25) as response: return json.load(response)
    except urllib.error.HTTPError as e: return {'errors':{'http':e.code}}
    except Exception as e: return {'errors':{'network':type(e).__name__}}
result={'checkedAt':datetime.datetime.now(datetime.timezone.utc).isoformat(),'note':'Diagnostic only. Coverage varies by league and season.','checks':{}}
# Single endpoint tests authorization and displays remaining daily quota without leaking the key.
status=get('/status')
account=status.get('response') or {}
requests=account.get('requests') or {}
result['status']={'authorized':bool(account),'dailyLimit':requests.get('limit_day'),'usedToday':requests.get('current')}
# Query a handful of recent finished fixtures from two leagues, then inspect statistics availability.
for label,league in [('LaLiga',140),('Premier League',39)]:
    season=2024
    fixtures=get(f'/fixtures?league={league}&season={season}&from=2024-08-16&to=2024-08-18')
    items=fixtures.get('response') or []
    check={'leagueId':league,'season':season,'fixtureAvailable':bool(items),'fixtureErrors':fixtures.get('errors') or {}}
    if items:
        fid=(items[0].get('fixture') or {}).get('id')
        check['fixtureId']=fid
        stats=get(f'/fixtures/players?fixture={fid}')
        teams=stats.get('response') or []
        players=[p for team in teams for p in team.get('players',[])]
        keys=set()
        for player in players:
            for st in player.get('statistics') or []:
                for field in ('shots','fouls','cards'):
                    data=st.get(field)
                    if isinstance(data,dict): keys.update(field+'.'+k for k,v in data.items() if v is not None)
        check.update({'playerRecords':len(players),'availableFields':sorted(keys),'playerStatsErrors':stats.get('errors') or {}})
    result['checks'][label]=check
out=pathlib.Path('data/player_coverage_diagnostic.json');out.parent.mkdir(exist_ok=True)
out.write_text(json.dumps(result,indent=2,ensure_ascii=False)+'\n',encoding='utf-8')
print(json.dumps(result,indent=2,ensure_ascii=False))
