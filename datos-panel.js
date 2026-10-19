/* MatchLab · Datos dashboard. Uses the archived, settled prematch predictions. */
(()=>{
'use strict';
const LEAGUES=['LaLiga','Premier','Championship','Champions League','Serie A','Eredivisie'];
const MARKETS=['1X2','BTTS','Goles'];
const GROUP_LABEL={'1X2':'Resultado 1X2',BTTS:'Ambos marcan',Goles:'Más/Menos 2,5'};
const byId=id=>document.getElementById(id);
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function group(name){return name.startsWith('Victoria')||name==='Empate'?'1X2':name.includes('2,5 goles')?'Goles':name.startsWith('Ambos marcan')?'BTTS':null;}
function choices(record){
 const entries=Object.entries(record.predictions||{}).filter(([n,p])=>group(n)&&Number.isFinite(Number(p))&&Number(p)>=0&&Number(p)<=1);
 return MARKETS.map(g=>entries.filter(([n])=>group(n)===g).sort((a,b)=>Number(b[1])-Number(a[1]))[0]).filter(Boolean);
}
let selectedLeague='all',selectedMarket='all';
let archive=null;
function stats(){
 const rows=[];
 for(const record of Object.values(archive?.records||{})){
  if(!record.result?.hits)continue;
  if(selectedLeague!=='all'&&record.league!==selectedLeague)continue;
  for(const [name,probability] of choices(record)){
   const market=group(name),hit=record.result.hits[name];
   if(selectedMarket!=='all'&&market!==selectedMarket)continue;
   if(typeof hit!=='boolean')continue;
   rows.push({league:record.league,market,hit,prob:Number(probability),model:record.model||'Sin versión',id:record.id});
  }
 }
 return rows;
}
function aggregate(rows){const n=rows.length,hits=rows.filter(x=>x.hit).length,brier=n?rows.reduce((s,x)=>s+(x.prob-(x.hit?1:0))**2,0)/n:null;return {n,hits,accuracy:n?hits/n:null,brier};}
const pct=v=>v===null?'—':`${Math.round(v*100)}%`;
const decimal=v=>v===null?'—':v.toFixed(4);
function paint(){
 const target=byId('modelDashboard');if(!target)return;
 const rows=stats(),overall=aggregate(rows),games=new Set(rows.map(r=>`${r.league}:${r.id}`)).size;
 const marketRows=MARKETS.map(m=>({label:GROUP_LABEL[m],...aggregate(rows.filter(r=>r.market===m))}));
 const leagueRows=LEAGUES.map(l=>({label:l==='Premier'?'Premier League':l,...aggregate(rows.filter(r=>r.league===l))})).filter(r=>r.n);
 const details=selectedMarket==='all'?marketRows:leagueRows;
 const models=[...new Set(rows.map(r=>r.model))];
 target.innerHTML=`<div class="md-header"><div><div class="eyebrow">RENDIMIENTO VERIFICADO</div><h2>Datos</h2></div><span class="md-version">MatchLab</span></div>
 <div class="md-filters"><label for="mdLeague">Competición<select id="mdLeague"><option value="all">Todas las competiciones</option>${LEAGUES.map(l=>`<option value="${safe(l)}" ${l===selectedLeague?'selected':''}>${safe(l==='Premier'?'Premier League':l)}</option>`).join('')}</select></label>
 <label for="mdMarket">Mercado<select id="mdMarket"><option value="all">Todos los mercados</option>${MARKETS.map(m=>`<option value="${m}" ${m===selectedMarket?'selected':''}>${GROUP_LABEL[m]}</option>`).join('')}</select></label></div>
 <div class="md-kpis"><div class="md-kpi"><strong>${pct(overall.accuracy)}</strong><span>Aciertos · ${overall.hits}/${overall.n}</span></div><div class="md-kpi"><strong>${games}</strong><span>Partidos evaluados</span></div><div class="md-kpi"><strong>${overall.n}</strong><span>Pronósticos evaluados</span></div><div class="md-kpi"><strong>${decimal(overall.brier)}</strong><span>Brier Score ↓</span></div></div>
 <div class="md-breakdown"><h3>${selectedMarket==='all'?'Rendimiento por mercado':'Rendimiento por competición'}</h3>${details.filter(r=>r.n).length?details.filter(r=>r.n).map(r=>`<div class="md-bar-row"><div><span>${safe(r.label)}</span><span>${r.hits}/${r.n} · ${pct(r.accuracy)}</span></div><div class="md-bar"><span style="width:${Math.round(r.accuracy*100)}%"></span></div></div>`).join(''):'<p class="md-empty">No hay resultados evaluados para esta selección.</p>'}</div>
 <p class="md-disclaimer">Datos calculados sobre pronósticos registrados antes de los partidos y posteriormente evaluados. ${models.length?`Versiones incluidas: ${safe(models.join(', '))}.`:''} El Brier Score mide el error cuadrático de las probabilidades (menor es mejor). Muestras pequeñas no garantizan fiabilidad futura. No son cuotas ni recomendaciones de apuesta.</p>`;
 byId('mdLeague').addEventListener('change',e=>{selectedLeague=e.target.value;paint();});
 byId('mdMarket').addEventListener('change',e=>{selectedMarket=e.target.value;paint();});
}
async function load(){const target=byId('modelDashboard');if(!target)return;target.innerHTML='<p class="md-empty">Cargando estadísticas…</p>';try{
 const response=await fetch(`./data/prediction_history.json?md=${Date.now()}`,{cache:'no-store'});
 if(!response.ok)throw Error(`HTTP ${response.status}`);
 const data=await response.json();if(!data||typeof data.records!=='object')throw Error('Formato del histórico inválido');
 archive=data;paint();
 }catch(e){target.innerHTML=`<p class="md-empty">No se pudo cargar el histórico: ${safe(e.message)}.</p>`;}}
function setup(){const section=byId('datosSection'),nav=byId('navInfo');if(!section||!nav)return;
 nav.addEventListener('click',()=>{document.querySelectorAll('.bottom-nav button').forEach(b=>b.classList.remove('selected'));nav.classList.add('selected');section.scrollIntoView({behavior:'smooth',block:'start'});});
 load();
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',setup);else setup();
})();
