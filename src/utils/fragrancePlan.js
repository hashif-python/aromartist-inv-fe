// Display-only preview; the backend validates every saved recipe and price.
export function splitOil(target,count){
 const total=Math.round(Number(target)*10000),each=Math.floor(total/count);
 return Array.from({length:count},(_,i)=>String((i===count-1?total-each*(count-1):each)/10000));
}
export function deriveFragrancePlan(workspace,selections,chosenBottle){
 const errors=[],profiles=selections.map(r=>workspace.fragrances.find(f=>f.id===r.fragranceId));
 if(!selections.length)return {errors:['Select one to three fragrances.'],rows:[],profiles:[],bottle:null};
 if(selections.length>3||new Set(selections.map(r=>r.fragranceId)).size!==selections.length)errors.push('Choose up to three distinct fragrances.');
 const config=f=>({type:f?.defaultType,target:f?.defaultType==='EDP'?20:Number(f?.defaultOilPercentage),solvents:(f?.solventRecipe||[]).map(r=>({materialId:r.materialId,share:Number(r.share)})).sort((a,b)=>a.materialId.localeCompare(b.materialId))});
 const base=config(profiles[0]);
 profiles.forEach(f=>{
  if(!f){errors.push('Choose an available fragrance.');return;}
  if(!f.defaultType||!base.target||!f.solventRecipe?.length)errors.push(`${f.name}: configure default type, oil concentration and solvents in Fragrances.`);
  if(JSON.stringify(config(f))!==JSON.stringify(base))errors.push('Selected fragrances have incompatible type, oil concentration or solvent defaults.');
 });
 let bottleId=chosenBottle;
 if(!bottleId){const ids=new Set(profiles.map(f=>f?.defaultBottleSize||''));if(ids.size===1)bottleId=[...ids][0];else if([...ids].some(Boolean))errors.push('Default bottle sets differ. Select a bottle size.');}
 const bottle=workspace.bottleSizes.find(b=>b.id===bottleId);
 if(!bottle?.configured)errors.push('Select a bottle set with bottle, pump, cap and label configured.');
 const rows=profiles.filter(Boolean).map((f,i)=>({fragranceId:f.id,materialId:f.perfumeOilId,name:f.name,percentage:selections.length===1?base.target:Number(selections[i].percentage),type:'Perfume Oil'}));
 const oilTotal=rows.reduce((n,r)=>n+Number(r.percentage||0),0);
 if(rows.some(r=>!Number.isFinite(r.percentage)||r.percentage<=0)||Math.abs(oilTotal-base.target)>0.000001)errors.push(`Combined oil must equal exactly ${base.target||'the configured'}% of the finished perfume.`);
 if(new Set(rows.map(r=>r.materialId)).size!==rows.length)errors.push('These fragrances use the same raw oil; choose distinct oils.');
 let remaining=100-base.target;
 base.solvents.forEach((r,i)=>{const amount=i===base.solvents.length-1?remaining:Math.round((100-base.target)*r.share/100*10000)/10000;remaining=Math.round((remaining-amount)*10000)/10000;rows.push({materialId:r.materialId,name:workspace.materials.find(m=>m.id===r.materialId)?.name||'Configured solvent',percentage:amount,type:'Solvent'});});
 const volume=Number(bottle?.volumeMl||0);
 rows.forEach(r=>{r.requiredMl=Math.round(volume*r.percentage/100*10000)/10000;});
 const solvents=rows.filter(r=>r.type==='Solvent');
 if(solvents.length&&rows.every(r=>Number.isFinite(r.requiredMl))&&Math.abs(rows.reduce((n,r)=>n+r.percentage,0)-100)<0.000001){
  const largest=solvents.reduce((a,b)=>a.percentage>=b.percentage?a:b);
  largest.requiredMl=Math.round((largest.requiredMl+volume-rows.reduce((n,r)=>n+r.requiredMl,0))*10000)/10000;
 }
 return {errors:[...new Set(errors)],profiles,rows,bottle,fragranceType:base.type,oilTarget:base.target,oilTotal,volume,knots:profiles.filter(Boolean).flatMap(f=>(f.knotDetails||[]).map(k=>({...k,fragranceName:f.name})))};
}
