/* MatchLab Datos: evaluación de mercados, sin modificar el histórico. */
(()=>{'use strict';
const LEAGUES=['LaLiga','Premier','Championship','Champions League','Serie A','Eredivisie'];
const MARKETS=['1X2','Ambos marcan','Más/Menos 2,5'];
const LABEL={Premier:'Premier League','1X2':'Resultado 1X2'};
const CHOICES={'1X2':['Victoria local','Empate','Victoria visitante'],'Ambos marcan':['Ambos marcan · Sí','Ambos marcan · No'],'Más/Menos 2,5':['Más de 2,5 goles','Menos de 2,5 goles']};
const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let league='all',market='all',rows=[],settled=0,source='';
const el=()=>document.getElementById('modelDashboard');
function aggregate(items){const n=items.reduce((s,r)=>s+r.matches,0),correct=items.reduce((s,r)=>s+r.correct,0);return {n,correct,accuracy:n?correct/n:null,brier:n?items.reduce((s,r)=>s+r.brier*r.matches,0)/n:null};}
const pct=v=>v===null?'—':Math.round(v*100)+'%';
function bar(label,items){const x=aggregate(items);return x.n?`<div class="md-bar-row"><div><span>${safe(label)}</span><span>${x.correct}/${x.n} · ${pct(x.accuracy)}</span></div><div class="md-bar"><span style="width:${Math.round(x.accuracy*100)}%"></span></div></div>`:'';}
function render(){if(!el())return;const selected=rows.filter(r=>(league==='all'||r.league===league)&&(market==='all'||r.market===market));const all=aggregate(selected);
const byMarket=MARKETS.map(m=>({name:m,...aggregate(selected.filter(r=>r.market===m))}));
const leagueBars=LEAGUES.map(l=>bar(LABEL[l]||l,selected.filter(r=>r.league===l))).filter(Boolean).join('');
const title=market==='all'?'Rendimiento por competición':'Rendimiento por competición · '+market;
const versions=[...new Set(selected.map(r=>r.model))];
el().innerHTML=`<div class="md-header"><div><div class="eyebrow">RENDIMIENTO DEL MODELO</div><h2>Datos</h2></div><span class="md-version">MatchLab v1.4</span></div>
<div class="md-subtitle">${versions.length?safe(versions.join(' · ')):'Pronósticos verificados'}</div>
<div class="md-kpis">${byMarket.map(m=>`<div class="md-kpi"><strong>${pct(m.accuracy)}</strong><span>${safe(m.name)} · ${m.correct}/${m.n}</span></div>`).join('')}<div class="md-kpi"><strong>${settled}</strong><span>Partidos evaluados · histórico completo</span></div></div>
<div class="md-filters"><label for="mdLeague">COMPETICIÓN<select id="mdLeague"><option value="all">Todas las competiciones</option>${LEAGUES.map(l=>`<option value="${safe(l)}" ${league===l?'selected':''}>${safe(LABEL[l]||l)}</option>`).join('')}</select></label><label for="mdMarket">MERCADO<select id="mdMarket"><option value="all">Todos los mercados</option>${MARKETS.map(m=>`<option value="${safe(m)}" ${market===m?'selected':''}>${safe(m)}</option>`).join('')}</select></label></div>
<div class="md-selection"><span>SELECCIÓN ACTUAL</span><strong>${pct(all.accuracy)}</strong><small>${all.correct}/${all.n} pronósticos acertados · Brier Score ${all.brier===null?'—':all.brier.toFixed(4)}</small></div>
<div class="md-breakdown"><h3>${safe(title)}</h3>${leagueBars||'<p class="md-empty">Todavía no hay partidos evaluados para estos filtros.</p>'}</div>
<p class="md-disclaimer">Fuente: ${safe(source)}. El Brier Score es el error cuadrático medio normalizado de todas las opciones del mercado (menor es mejor). Se muestran todas las versiones registradas del modelo, sin mezclar resultados no evaluados. Las muestras pequeñas no garantizan resultados futuros. No son cuotas ni consejos de apuesta.</p>`;
document.getElementById('mdLeague').addEventListener('change',e=>{league=e.target.value;render()});document.getElementById('mdMarket').addEventListener('change',e=>{market=e.target.value;render()});}
function fromArchive(data){const out=[];settled=0;for(const r of Object.values(data.records||{})){const result=r.result;if(!result||!Number.isInteger(result.homeGoals)||!Number.isInteger(result.awayGoals))continue;settled++;const h=result.homeGoals,a=result.awayGoals;const actual={'1X2':h>a?'Victoria local':h===a?'Empate':'Victoria visitante','Ambos marcan':h>0&&a>0?'Ambos marcan · Sí':'Ambos marcan · No','Más/Menos 2,5':h+a>2?'Más de 2,5 goles':'Menos de 2,5 goles'};
for(const [m,choices] of Object.entries(CHOICES)){const ps=choices.map(k=>Number(r.predictions?.[k]));if(ps.some((p,i)=>!Object.hasOwn(r.predictions||{},choices[i])||!Number.isFinite(p)||p<0||p>1)||Math.abs(ps.reduce((s,v)=>s+v,0)-1)>.01)continue;const best=ps.indexOf(Math.max(...ps)),correct=Number(choices[best]===actual[m]),brier=ps.reduce((s,p,i)=>s+(p-Number(choices[i]===actual[m]))**2,0)/ps.length;out.push({model:r.model||'desconocido',league:r.league,market:m,matches:1,correct,brier});}}
return out;}
async function load(){if(!el())return;el().innerHTML='<p class="md-empty">Cargando evaluación…</p>';try{const r=await fetch('./data/model_evaluation.json?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('Sin informe');const d=await r.json();if(!Array.isArray(d.by_model_league_market))throw Error('Informe incompatible');rows=d.by_model_league_market.filter(x=>x.matches>0&&MARKETS.includes(x.market));settled=d.settled_records||0;source='model_evaluation.json';render();}catch{try{const r=await fetch('./data/prediction_history.json?ts='+Date.now(),{cache:'no-store'});if(!r.ok)throw Error('Histórico no disponible');rows=fromArchive(await r.json());source='prediction_history.json (evaluación local)';render();}catch(e){el().innerHTML='<p class="md-empty">No se pudieron cargar las estadísticas: '+safe(e.message)+'</p>';}}}
window.matchlabLoadDashboard=load;
})();
