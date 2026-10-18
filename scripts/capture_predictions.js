// Reuse the exact frontend v0.7 prediction engine so archived probabilities match the UI.
const fs=require('fs'),vm=require('vm');
const root=require('path').resolve(__dirname,'..');
const code=fs.readFileSync(root+'/app.js','utf8').split('function explainPrediction(')[0].replace('.sort((a,b)=>b.p-a.p).slice(0,5)', '.sort((a,b)=>b.p-a.p)');
const snapshot=JSON.parse(fs.readFileSync(root+'/data/football.json','utf8'));
const sandbox={localStorage:{getItem:()=>null},console,Date,Math,Set,JSON};
vm.createContext(sandbox);vm.runInContext(code+'\nthis.capture=(m)=>{filters.markets=new Set(["1X2","Goles","BTTS"]);return predict(m)};',sandbox);
const result={};
for(const m of snapshot.matches||[]){
 const p=sandbox.capture(m);
 if(p.error)continue;
 result[String(m.id)]={id:m.id,league:m.league,utcDate:m.utcDate,homeId:m.home?.id,awayId:m.away?.id,
  homeName:m.home?.name,awayName:m.away?.name,model:'poisson-v07',
  predictions:Object.fromEntries(p.selected.map(x=>[x.name,Number(x.p.toFixed(6))]))};
}
process.stdout.write(JSON.stringify(result));
