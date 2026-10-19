// MatchLab v1.0: execute the same model as the frontend, with no DOM dependencies.
const fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.resolve(__dirname,'..');
const code=fs.readFileSync(path.join(root,'app.js'),'utf8').split('function explainPrediction(')[0];
const snapshot=JSON.parse(fs.readFileSync(path.join(root,'data/football.json'),'utf8'));
const sandbox={localStorage:{getItem:()=>null},console,Date,Math,Set,JSON};
vm.createContext(sandbox);
vm.runInContext(code+'\nthis.capture=(m)=>{snapshot=globalThis.footballSnapshot;filters.markets=new Set(["1X2","Goles","BTTS"]);return predict(m)};',sandbox);
sandbox.footballSnapshot=snapshot;
const result={};
for(const m of snapshot.matches||[]){
 const p=sandbox.capture(m);if(p.error||!p.selected.length)continue;
 result[String(m.id)]={id:m.id,league:m.league,utcDate:m.utcDate,homeId:m.home?.id,awayId:m.away?.id,
 homeName:m.home?.name,awayName:m.away?.name,model:'poisson-v10',
 predictions:Object.fromEntries(p.selected.map(x=>[x.name,Number(x.p.toFixed(6))]))};
}
process.stdout.write(JSON.stringify(result));
