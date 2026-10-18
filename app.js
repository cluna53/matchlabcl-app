/* MatchLab v0.7. Real fixtures and transparent experimental Poisson probabilities. */
const ALL_LEAGUES=['LaLiga','Premier','Championship','Champions League','Serie A','Eredivisie'];
const ALL_MARKETS=['1X2','Goles','BTTS','Córners','Tarjetas','Jugadores'];
const STORAGE_KEY='matchlab-filters-v4';
let snapshot=null;
let filters=loadFilters();
function loadFilters(){try{const f=JSON.parse(localStorage.getItem(STORAGE_KEY));if(f&&Array.isArray(f.leagues)&&Array.isArray(f.markets))return {leagues:new Set(f.leagues.filter(x=>ALL_LEAGUES.includes(x))),markets:new Set(f.markets.filter(x=>ALL_MARKETS.includes(x)))};}catch{}return {leagues:new Set(ALL_LEAGUES),markets:new Set(ALL_MARKETS)};}
function saveFilters(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({leagues:[...filters.leagues],markets:[...filters.markets]}));}catch{}}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function crest(team){const name=team?.name||'Equipo';const initials=name.split(' ').map(s=>s[0]).slice(0,2).join('').toUpperCase();const url=team?.crest;const valid=typeof url==='string'&&/^https:\/\//i.test(url);return `<span class="crest" title="${esc(name)}"><span class="crest-fallback">${esc(initials)}</span>${valid?`<img src="${esc(url)}" alt="Escudo de ${esc(name)}" loading="lazy" onerror="this.remove()">`:''}</span>`;}
function formatDate(value){if(!value)return 'Hora pendiente';const d=new Date(value);return Number.isNaN(d.valueOf())?'Hora pendiente':new Intl.DateTimeFormat('es-ES',{day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'Europe/Madrid'}).format(d)+' (España)';}
function syncFilters(){document.querySelectorAll('[data-league]').forEach(b=>{const on=filters.leagues.has(b.dataset.league);b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});document.querySelectorAll('[data-market]').forEach(b=>{const on=filters.markets.has(b.dataset.market);b.classList.toggle('active',on);b.setAttribute('aria-pressed',String(on));});document.querySelector('#leagueCount').textContent=`${filters.leagues.size} seleccionadas`;document.querySelector('#marketCount').textContent=`${filters.markets.size} seleccionados`;}
function statusMessage(){const box=document.querySelector('#dataStatus');if(!snapshot||!snapshot.updatedAt){box.innerHTML='<strong>Configuración pendiente</strong><div>Para mostrar partidos reales, añade la clave gratuita en GitHub → Settings → Secrets and variables → Actions y ejecuta la actualización. No mostramos partidos inventados.</div>';return;}const time=new Date(snapshot.updatedAt);const stamp=Number.isNaN(time.valueOf())?'desconocida':time.toLocaleString('es-ES',{dateStyle:'medium',timeStyle:'short'});const errors=Object.keys(snapshot.errors||{});box.innerHTML=`<strong>Datos reales · ${esc(snapshot.source||'football-data.org')}</strong><div>Última sincronización: ${esc(stamp)}. Calendario de los próximos 14 días; no es información en directo.</div>${errors.length?`<div>Advertencia: algunos datos no se pudieron obtener (${esc(errors.join(', '))}).</div>`:''}<div>La disponibilidad de cada competición depende de la cobertura y permisos de tu cuenta API.</div>`;}
function render(){syncFilters();statusMessage();const list=(snapshot?.matches||[]).filter(m=>filters.leagues.has(m.league));document.querySelector('#resultCount').textContent=`(${list.length})`;document.querySelector('#matches').innerHTML=list.length?list.map(m=>`<article class="match-card"><div class="match-top"><span class="league-label">${esc(m.league.toUpperCase())}</span><span class="kickoff">${esc(formatDate(m.utcDate))}</span></div><div class="teams"><div class="team">${crest(m.home)}<span>${esc(m.home?.name)}</span></div><span class="vs">VS</span><div class="team away"><span>${esc(m.away?.name)}</span>${crest(m.away)}</div></div><div class="match-bottom"><span class="demo-chip">${esc(m.status==='FINISHED'?'FINALIZADO':'PARTIDO REAL')}</span><button class="analyze" data-match="${esc(m.id)}">Ver análisis ↗</button></div></article>`).join(''):`<div class="empty-state">${!snapshot?.updatedAt?'Todavía no hay datos sincronizados. Configura la API en GitHub.':!filters.leagues.size?'Selecciona alguna liga.':'No hay encuentros disponibles para los filtros elegidos en los próximos 14 días. Comprueba el estado de la sincronización y la cobertura de tu cuenta API.'}</div>`;document.querySelectorAll('[data-match]').forEach(b=>b.addEventListener('click',()=>{const m=list.find(x=>String(x.id)===b.dataset.match);if(m)openMatch(m);}));}
function tableRow(m,side){const id=m[side]?.id;return (snapshot?.standings?.[m.league]||[]).find(r=>r.teamId===id);}
function fmt(v){return Number.isFinite(v)?String(v):'—';}
function factorial(n){let out=1;for(let i=2;i<=n;i++)out*=i;return out;}
function poisson(k,lambda){return Math.exp(-lambda)*Math.pow(lambda,k)/factorial(k);}
function predict(m){
  const kickoff=Date.parse(m.utcDate||'');
  const history=(snapshot?.history?.[m.league]||[]).filter(r=>Number.isInteger(r.homeGoals)&&Number.isInteger(r.awayGoals)&&Number.isInteger(r.homeId)&&Number.isInteger(r.awayId)&&Number.isFinite(Date.parse(r.date))&&(!Number.isFinite(kickoff)||Date.parse(r.date)<kickoff));
  const hId=m.home?.id,aId=m.away?.id;
  const home=history.filter(r=>r.homeId===hId||r.awayId===hId);
  const away=history.filter(r=>r.homeId===aId||r.awayId===aId);
  if(!Number.isInteger(hId)||!Number.isInteger(aId)||home.length<6||away.length<6||history.length<30)return {error:`Histórico insuficiente: ${home.length} partidos del local, ${away.length} del visitante y ${history.length} en la competición. Se requieren al menos 6 por equipo y 30 en total.`};
  const leagueHome=history.reduce((s,r)=>s+r.homeGoals,0)/history.length;
  const leagueAway=history.reduce((s,r)=>s+r.awayGoals,0)/history.length;
  if(leagueHome<=0||leagueAway<=0)return {error:'No hay suficientes goles registrados para estimar el partido.'};
  const leagueAvg=(leagueHome+leagueAway)/2;
  const venueHome=home.filter(r=>r.homeId===hId),venueAway=away.filter(r=>r.awayId===aId);
  const now=Number.isFinite(kickoff)?kickoff:Date.now();
  function weightedRate(rows,fn,prior,priorWeight){
    let sum=0,wSum=0;
    for(const r of rows){const days=Math.max(0,(now-Date.parse(r.date))/86400000);const w=Math.pow(0.5,days/45);sum+=w*fn(r);wSum+=w;}
    return (sum+priorWeight*prior)/(wSum+priorWeight);
  }
  // Combine venue-specific evidence with overall team form. Both are shrunk toward league norms.
  const overallHomeFor=weightedRate(home,r=>r.homeId===hId?r.homeGoals:r.awayGoals,leagueAvg,5);
  const overallHomeAgainst=weightedRate(home,r=>r.homeId===hId?r.awayGoals:r.homeGoals,leagueAvg,5);
  const overallAwayFor=weightedRate(away,r=>r.awayId===aId?r.awayGoals:r.homeGoals,leagueAvg,5);
  const overallAwayAgainst=weightedRate(away,r=>r.awayId===aId?r.homeGoals:r.awayGoals,leagueAvg,5);
  const hFor=weightedRate(venueHome,r=>r.homeGoals,overallHomeFor,5);
  const hAgainst=weightedRate(venueHome,r=>r.awayGoals,overallHomeAgainst,5);
  const aFor=weightedRate(venueAway,r=>r.awayGoals,overallAwayFor,5);
  const aAgainst=weightedRate(venueAway,r=>r.homeGoals,overallAwayAgainst,5);
  const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  // Geometric combination avoids amplifying both attack and defence ratios multiplicatively.
  const rawHome=leagueHome*Math.sqrt((hFor/leagueHome)*(aAgainst/leagueHome));
  const rawAway=leagueAway*Math.sqrt((aFor/leagueAway)*(hAgainst/leagueAway));
  const xh=clamp(rawHome,0.35,Math.min(3.5,leagueHome*1.9));
  const xa=clamp(rawAway,0.35,Math.min(3.5,leagueAway*1.9));
  const ph=Array.from({length:16},(_,k)=>poisson(k,xh)),pa=Array.from({length:16},(_,k)=>poisson(k,xa));
  let win=0,draw=0,loss=0,over=0,btts=0;
  for(let i=0;i<16;i++)for(let j=0;j<16;j++){const pr=ph[i]*pa[j];if(i>j)win+=pr;else if(i===j)draw+=pr;else loss+=pr;if(i+j>=3)over+=pr;if(i>0&&j>0)btts+=pr;}
  const candidates=[{market:'1X2',name:'Victoria local',p:win},{market:'1X2',name:'Empate',p:draw},{market:'1X2',name:'Victoria visitante',p:loss},{market:'Goles',name:'Más de 2,5 goles',p:over},{market:'Goles',name:'Menos de 2,5 goles',p:1-over},{market:'BTTS',name:'Ambos marcan · Sí',p:btts},{market:'BTTS',name:'Ambos marcan · No',p:1-btts}];
  const selected=candidates.filter(x=>filters.markets.has(x.market)).sort((a,b)=>b.p-a.p).slice(0,5);
  const limited=Math.min(home.length,away.length)<10||Math.min(venueHome.length,venueAway.length)<4;
  return {selected,xh,xa,homeCount:home.length,awayCount:away.length,total:history.length,limited,venueHomeCount:venueHome.length,venueAwayCount:venueAway.length,leagueHome,leagueAway,hFor,hAgainst,aFor,aAgainst,adjusted:Math.abs(xh-rawHome)>0.001||Math.abs(xa-rawAway)>0.001};
}
function explainPrediction(x,p,m){
 const total=p.xh+p.xa;
 const hn=esc(m.home?.name||'El local'),an=esc(m.away?.name||'El visitante');
 const t=total.toFixed(2).replace('.',',');
 if(x.market==='Goles')return x.name.startsWith('Más')
  ? `Se esperan <b>${t} goles</b> entre ambos equipos. Con esa media, el modelo calcula la probabilidad de que haya <b>3 o más goles</b>. No es una garantía de un partido goleador.`
  : `Se esperan <b>${t} goles</b> en total. Esta opción requiere <b>0, 1 o 2 goles</b>; por eso su probabilidad disminuye cuando sube la expectativa total.`;
 if(x.market==='BTTS')return x.name.endsWith('Sí')
  ? `${hn} tiene una expectativa de <b>${p.xh.toFixed(2)}</b> goles y ${an} de <b>${p.xa.toFixed(2)}</b>. El porcentaje estima la posibilidad de que <b>ambos marquen al menos una vez</b>.`
  : `La probabilidad refleja que <b>al menos uno de los dos equipos no marque</b>, según las expectativas individuales de ${p.xh.toFixed(2)} y ${p.xa.toFixed(2)} goles.`;
 if(x.name==='Empate')return `El modelo calcula la probabilidad de que ambos terminen <b>con los mismos goles</b>. Las expectativas son ${p.xh.toFixed(2)} para ${hn} y ${p.xa.toFixed(2)} para ${an}.`;
 const local=x.name==='Victoria local',winner=local?hn:an,own=local?p.xh:p.xa,other=local?p.xa:p.xh;
 return `${winner} tiene una expectativa de <b>${own.toFixed(2)}</b> goles frente a <b>${other.toFixed(2)}</b> de su rival. El porcentaje suma los marcadores simulados en los que <b>${winner} gana</b>.`;
}
function openMatch(m){
  document.querySelector('#modalLeague').textContent=m.league.toUpperCase()+' · MODELO EXPERIMENTAL';
  document.querySelector('#modalTitle').textContent=`${m.home?.name||'Local'} vs ${m.away?.name||'Visitante'}`;
  document.querySelector('#modalSub').textContent=`${formatDate(m.utcDate)} · Jornada ${fmt(m.matchday)}`;
  const home=tableRow(m,'home'),away=tableRow(m,'away');
  const rows=[['Posición','position'],['Jugados','played'],['Victorias','won'],['Empates','draw'],['Derrotas','lost'],['Goles a favor','goalsFor'],['Goles en contra','goalsAgainst'],['Puntos','points']];
  let html='<p class="analysis-paragraph">Datos reales de la competición. Las probabilidades son estimaciones experimentales, no cuotas ni recomendaciones de apuesta.</p>';
  const p=predict(m);
  if(p.error){html+=`<div class="prediction-warning"><strong>Sin pronóstico</strong><p>${esc(p.error)}</p></div>`;}
  else if(!p.selected.length){html+='<div class="prediction-warning">Selecciona 1X2, Goles o BTTS en los filtros para ver predicciones.</div>';}
  else{
    html+=`<div class="prediction-summary prediction-summary-v6"><div class="prediction-summary-top"><span class="eyebrow">PROYECCIÓN DE GOLES</span><span class="sample-pill">${p.limited?'Muestra reducida':'Modelo experimental'}</span></div><div class="expected-total"><strong>${(p.xh+p.xa).toFixed(2).replace('.',',')}</strong><span>goles esperados<br>en total</span></div><div class="expected-split"><div><span>${esc(m.home?.name)}</span><b>${p.xh.toFixed(2).replace('.',',')}</b></div><div class="expected-divider">+</div><div><span>${esc(m.away?.name)}</span><b>${p.xa.toFixed(2).replace('.',',')}</b></div></div><small>Basado en ${p.total} resultados de la competición, ${p.homeCount} del local y ${p.awayCount} del visitante (histórico disponible de hasta 120 días). ${p.limited?'La muestra por equipo es reducida: incertidumbre elevada.':'El modelo todavía no está calibrado con resultados futuros.'}</small></div>`;
    html+=`<details class="model-breakdown"><summary>¿Cómo se calculan estos goles? <span>Ver estadísticas</span></summary><div class="model-breakdown-grid"><div><span>Media de la liga (local / visitante)</span><b>${p.leagueHome.toFixed(2)} / ${p.leagueAway.toFixed(2)}</b></div><div><span>${esc(m.home?.name)} en casa: goles a favor / en contra*</span><b>${p.hFor.toFixed(2)} / ${p.hAgainst.toFixed(2)}</b></div><div><span>${esc(m.away?.name)} fuera: goles a favor / en contra*</span><b>${p.aFor.toFixed(2)} / ${p.aAgainst.toFixed(2)}</b></div><div><span>Partidos en casa / fuera disponibles</span><b>${p.venueHomeCount} / ${p.venueAwayCount}</b></div></div><p>*Tasas suavizadas con la forma general del equipo y la media de la liga. Los partidos recientes pesan más (semivida 45 días). ${p.adjusted?'Se ha limitado una estimación extrema para reducir inestabilidad.':''} Son estimaciones experimentales sin validación retrospectiva.</p></details>`;
    html+='<h3 class="prediction-heading">Hasta cinco pronósticos</h3>';
    html+=p.selected.map((x,i)=>`<article class="prediction-card"><div class="prediction-card-top"><span class="prediction-market">${esc(x.market==='BTTS'?'AMBOS MARCAN':x.market==='Goles'?'GOLES':'RESULTADO 1X2')}</span><span class="prediction-number">0${i+1}</span></div><div class="prediction-card-main"><strong>${esc(x.name)}</strong><span class="prediction-percent">${Math.round(x.p*100)}%</span></div><div class="prediction-meter" aria-hidden="true"><span style="width:${Math.max(0,Math.min(100,x.p*100)).toFixed(1)}%"></span></div><p class="prediction-explanation">${explainPrediction(x,p,m)}</p></article>`).join('');
    html+='<p class="analysis-paragraph">Los resultados 1X2, las opciones de goles y BTTS pueden estar correlacionados. El orden por probabilidad no mide rentabilidad ni valor frente a cuotas.</p>';
  }
  html+=`<h3 class="prediction-heading">Estadísticas de temporada</h3><div class="analysis-row"><strong>${esc(m.home?.name)}</strong><span>vs</span><strong>${esc(m.away?.name)}</strong></div>`;
  html+=rows.map(([label,field])=>`<div class="analysis-row"><b>${fmt(home?.[field])}</b><span>${esc(label)}</span><b>${fmt(away?.[field])}</b></div>`).join('');
  if(!home||!away)html+='<p class="analysis-paragraph">La clasificación puede no estar disponible para esta competición.</p>';
  html+='<p class="analysis-paragraph">Córners, tarjetas y jugadores no tienen datos suficientes en esta API. El modelo usa un supuesto Poisson independiente, no incorpora alineaciones, lesiones ni cuotas, y no está validado con backtesting.</p>';
  document.querySelector('#modalContent').innerHTML=html;document.querySelector('#modal').hidden=false;
}
async function refresh(){const box=document.querySelector('#dataStatus');box.textContent='Cargando la última publicación…';try{const response=await fetch(`./data/football.json?refresh=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);const data=await response.json();if(!data||!Array.isArray(data.matches))throw new Error('Formato de datos inválido');snapshot=data;render();}catch(e){snapshot=null;render();box.innerHTML=`<strong>No se pudieron cargar los datos.</strong><div>${esc(e.message)}. Comprueba que data/football.json está publicado en GitHub Pages.</div>`;}}
document.querySelectorAll('[data-league]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.league;filters.leagues.has(k)?filters.leagues.delete(k):filters.leagues.add(k);saveFilters();render();}));
document.querySelectorAll('[data-market]').forEach(b=>b.addEventListener('click',()=>{const k=b.dataset.market;filters.markets.has(k)?filters.markets.delete(k):filters.markets.add(k);saveFilters();render();}));
document.querySelector('#resetFilters').addEventListener('click',()=>{filters={leagues:new Set(ALL_LEAGUES),markets:new Set(ALL_MARKETS)};saveFilters();render();});
document.querySelector('#closeModal').addEventListener('click',()=>document.querySelector('#modal').hidden=true);
document.querySelector('#modal').addEventListener('click',e=>{if(e.target.id==='modal')e.currentTarget.hidden=true;});
document.addEventListener('keydown',e=>{if(e.key==='Escape')document.querySelector('#modal').hidden=true;});
document.querySelector('#refresh').addEventListener('click',refresh);
document.querySelector('#navMarkets').addEventListener('click',()=>document.querySelector('#filters').scrollIntoView({behavior:'smooth'}));
document.querySelector('#navSaved').addEventListener('click',()=>alert('Los guardados se añadirán en otra versión.'));
document.querySelector('#navInfo').addEventListener('click',()=>document.querySelector('.notice').scrollIntoView({behavior:'smooth'}));
refresh();
if('serviceWorker'in navigator&&location.protocol.startsWith('http'))navigator.serviceWorker.register('./sw.js').catch(()=>{});
