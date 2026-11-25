from pathlib import Path
import re,shutil
root=Path(__file__).resolve().parent
files=[root/'src/pages/Sales/DirectPOS.jsx']
assert files, 'DirectPOS.jsx not found'
updates=[]
for p in files:
 s=p.read_text()
 if 'posCatalogueLoading' in s: continue
 a=re.search(r'(?m)^\s*const reload=\(\)=>usable&&api\.get\(\'/perfume-products/\'.*?;\s*$',s)
 assert a, f'Unsupported reload in {p}'
 s=s[:a.start()]+'''
 const [posCatalogueLoading,setPosCatalogueLoading]=useState(false),[posCatalogueError,setPosCatalogueError]=useState(''),[posPage,setPosPage]=useState(1);
 const posRequest=useRef(null);
 const reload=async()=>{
   posRequest.current?.abort();
   if(!usable){setPosCatalogueLoading(false);return;}
   const controller=new AbortController();posRequest.current=controller;
   setPosCatalogueLoading(true);setPosCatalogueError('');
   try{
     const first=await api.get('/perfume-products/',{params:{branchId,physicalBranchId,limit:200,offset:0},signal:controller.signal});
     let rows=first.data;
     if(!Array.isArray(rows))throw new Error('Unexpected catalogue response');
     if(rows.length===200){
       for(let offset=200;offset<10000;offset+=200){
         const next=await api.get('/perfume-products/',{params:{branchId,physicalBranchId,limit:200,offset},signal:controller.signal});
         if(!Array.isArray(next.data))throw new Error('Unexpected catalogue response');
         if(next.data.some(p=>rows.some(r=>r.id===p.id)))break;
         rows=rows.concat(next.data);if(next.data.length<200)break;
       }
     }
     if(!controller.signal.aborted)setProducts(rows);
   }catch(e){if(!controller.signal.aborted)setPosCatalogueError(errorMessage(e));}
   finally{if(!controller.signal.aborted)setPosCatalogueLoading(false);}
 };
 useEffect(()=>()=>posRequest.current?.abort(),[]);
 useEffect(()=>setPosPage(1),[search,branchId,physicalBranchId]);
'''+s[a.end():]
 old='{visibleProducts.length===0&&';assert old in s
 s=s.replace(old,'''{posCatalogueLoading&&<div role="status" aria-live="polite" className="col-span-full p-6 text-center"><span className="inline-block h-7 w-7 rounded-full border-4 border-violet-200 border-t-violet-700 animate-spin"/><p className="mt-2 text-sm">Loading perfume catalogue…</p><div className="grid grid-cols-2 gap-3 mt-4">{Array.from({length:6},(_,i)=><div key={i} className="h-24 rounded-xl bg-slate-100 animate-pulse"/>)}</div></div>}
     {posCatalogueError&&!posCatalogueLoading&&<div role="alert" className="col-span-full p-4 text-red-700">{posCatalogueError} <button className="erp-secondary" onClick={reload}>Retry</button></div>}
     {!posCatalogueLoading&&!posCatalogueError&&visibleProducts.length===0&&''')
 assert '{visibleProducts.map(' in s
 s=s.replace('{visibleProducts.map(','''{!posCatalogueLoading&&!posCatalogueError&&visibleProducts.length>24&&<div className="col-span-full flex items-center justify-between gap-2"><button className="erp-secondary" disabled={posPage<=1} onClick={()=>setPosPage(p=>p-1)}>Previous</button><span>Page {posPage} / {Math.ceil(visibleProducts.length/24)}</span><button className="erp-secondary" disabled={posPage*24>=visibleProducts.length} onClick={()=>setPosPage(p=>p+1)}>Next</button></div>}
     {!posCatalogueLoading&&!posCatalogueError&&visibleProducts.slice((posPage-1)*24,posPage*24).map(''')
 if not re.search(r'import[^;]*\\buseRef\\b[^;]*from\\s*[\'"]react[\'"]',s):
  s="import { useRef } from 'react';\n"+s
 updates.append((p,s))
for p,s in updates:
 shutil.copy2(p,p.with_suffix('.jsx.before_pos'));p.write_text(s);print('Updated',p)
