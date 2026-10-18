#!/usr/bin/env python3
"""Append-only prematch predictions and delayed settlement, without hindsight.
Run AFTER update_data.py and commit data/prediction_history.json with football.json.
"""
import datetime as dt
import json
from pathlib import Path
import subprocess

ROOT=Path(__file__).resolve().parents[1]
PATH=ROOT/'data'/'prediction_history.json'
DATA=ROOT/'data'/'football.json'
now=dt.datetime.now(dt.timezone.utc)
raw=json.loads(DATA.read_text(encoding='utf-8'))
archive=json.loads(PATH.read_text(encoding='utf-8')) if PATH.exists() else {'schema':1,'records':{}}
records=archive.setdefault('records',{})
finished={}
for league, rows in (raw.get('history') or {}).items():
    for row in rows:
        if isinstance(row.get('id'),int): finished[str(row['id'])]=(row['homeGoals'],row['awayGoals'])
for match in raw.get('matches',[]):
    if match.get('status')=='FINISHED':
        score=match.get('score') or {}
        if isinstance(score.get('home'),int) and isinstance(score.get('away'),int):
            finished[str(match['id'])]=(score['home'],score['away'])

def hit(name,h,a):
    if name=='Victoria local':return h>a
    if name=='Empate':return h==a
    if name=='Victoria visitante':return h<a
    if name=='Más de 2,5 goles':return h+a>=3
    if name=='Menos de 2,5 goles':return h+a<=2
    if name=='Ambos marcan · Sí':return h>0 and a>0
    if name=='Ambos marcan · No':return h==0 or a==0
    return None

settled=0
for key,record in records.items():
    if record.get('result') is not None or key not in finished:continue
    h,a=finished[key]
    record['result']={'homeGoals':h,'awayGoals':a,'evaluatedAt':now.isoformat(),
                      'hits':{name:hit(name,h,a) for name in record['predictions']}}
    settled+=1

# Predict only games that have NOT started. Never backfill a match after kickoff.
new_predictions=json.loads(subprocess.check_output(['node',str(ROOT/'scripts'/'capture_predictions.js')],cwd=ROOT,text=True))
added=0
for key,record in new_predictions.items():
    try: kickoff=dt.datetime.fromisoformat(record['utcDate'].replace('Z','+00:00'))
    except (ValueError,TypeError,KeyError):continue
    if kickoff<=now or key in records or key in finished:continue
    # Only record a model result if all seven candidate markets can be computed.
    if len(record['predictions'])<5:continue
    record['capturedAt']=now.isoformat()
    record['result']=None
    records[key]=record
    added+=1
archive['updatedAt']=now.isoformat()
PATH.parent.mkdir(parents=True,exist_ok=True)
PATH.write_text(json.dumps(archive,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(f'Prediction archive: {added} prematch records added; {settled} settled; {len(records)} total.')
