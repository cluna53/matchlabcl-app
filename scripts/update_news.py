#!/usr/bin/env python3
"""Public RSS headline discovery only. No injury confirmation or probability adjustment."""
import json, re, time, urllib.parse, urllib.request, xml.etree.ElementTree as ET
from datetime import datetime, timedelta, timezone
from email.utils import parsedate_to_datetime
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DATA=ROOT/'data'
DATA.mkdir(exist_ok=True)
CATS=[('lesion',r'\b(lesi[oó]n|lesionado|injur(?:y|ed)|hamstring|knee injury|out injured|infortunio|blessure|geblesseerd)\b'),('sancion',r'\b(sanci[oó]n|suspend(?:ed|ed for)|suspensi[oó]n|squalificat|geschorst|red card ban)\b'),('alineacion',r'\b(alineaci[oó]n|line.?up|starting xi|formazione|opstelling|titulares)\b'),('rotacion',r'\b(rotaci[oó]n|rotation|rested|descanso|rotazioni|turnover)\b')]
def classify(s):
 for cat,pattern in CATS:
  if re.search(pattern,s,re.I):return cat
 return 'general'
def read_rss(query):
 url='https://news.google.com/rss/search?'+urllib.parse.urlencode({'q':query+' when:7d','hl':'es','gl':'ES','ceid':'ES:es'})
 req=urllib.request.Request(url,headers={'User-Agent':'MatchLab/1.0 (RSS headline reader)'})
 with urllib.request.urlopen(req,timeout=12) as r:return ET.fromstring(r.read(700000))
def main():
 matches=json.loads((DATA/'football.json').read_text()).get('matches',[])
 now=datetime.now(timezone.utc);limit=now+timedelta(days=7)
 teams={}
 for m in matches:
  try:date=datetime.fromisoformat(m['utcDate'].replace('Z','+00:00'))
  except (ValueError,KeyError):continue
  if not now-timedelta(hours=3)<=date<=limit:continue
  for side in ('home','away'):
   team=(m.get(side) or {}).get('name','').strip()
   if len(team)>=4:teams.setdefault(team,m.get('league',''))
  if len(teams)>=24:break
 items=[];seen=set();failures=0
 for team,league in list(teams.items())[:24]:
  try:
   rss=read_rss('"'+team+'" (lesión OR baja OR sanción OR injury OR suspended OR alineación OR lineup)')
   for entry in rss.findall('./channel/item')[:5]:
    title=(entry.findtext('title') or '').strip();url=(entry.findtext('link') or '').strip()
    if not title or not url or url in seen:continue
    seen.add(url);source=(entry.findtext('source') or 'Google News RSS').strip()
    pub=(entry.findtext('pubDate') or '').strip()
    try:date=parsedate_to_datetime(pub).astimezone(timezone.utc).isoformat()
    except (ValueError,TypeError):date=''
    items.append({'title':title[:250],'url':url,'source':source[:100],'published':date,'team':team,'league':league,'category':classify(title),'status':'unverified'})
  except Exception as e:
   failures+=1;print(f'RSS no disponible para {team}: {type(e).__name__}')
  time.sleep(.15)
 items.sort(key=lambda x:x['published'],reverse=True)
 target=DATA/'news.json'
 # Keep previously collected news if every external feed failed.
 if failures==len(teams) and target.exists():print('No se reemplazan noticias anteriores: todas las consultas fallaron');return
 target.write_text(json.dumps({'updatedAt':now.isoformat(),'source':'Google News RSS headlines','items':items[:120],'feedsFailed':failures},ensure_ascii=False,indent=2)+'\n')
 print(f'Noticias: {len(items)}, equipos: {len(teams)}, consultas fallidas: {failures}')
if __name__=='__main__':main()
