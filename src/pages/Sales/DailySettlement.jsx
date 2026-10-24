import React,{useCallback,useEffect,useState} from 'react';
import {apiClient as api,errorMessage} from '../../api/client';
import {toast} from 'sonner';
import {useAuth} from '../../context/AuthContext';
import {Link} from 'react-router-dom';

const money=n=>`₹${Number(n||0).toLocaleString('en-IN',{minimumFractionDigits:2,maximumFractionDigits:2})}`;
const dayOf=value=>value?new Date(value).toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'}):'';
export default function DailySettlement(){
 const {user,storeSetup}=useAuth();
 const [workspace,setWorkspace]=useState(null),[branchId,setBranchId]=useState(storeSetup?.branchId||user?.branchId||''),[registers,setRegisters]=useState([]),[shifts,setShifts]=useState([]);
 const [registerId,setRegisterId]=useState(''),[opening,setOpening]=useState(''),[counted,setCounted]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true);
 const apiRoot='/pos/mobile/';
 const refresh=useCallback(async()=>{
  setError('');setLoading(true);
  try{
   const w=await api.get(`${apiRoot}workspace/`);setWorkspace(w.data);
   const selected=branchId||w.data.branches?.[0]?.id;
   if(!branchId&&selected)setBranchId(selected);
   if(!selected)return;
   const [regs,sh]=await Promise.all([api.get(`${apiRoot}registers/`,{params:{branchId:selected}}),api.get(`${apiRoot}shifts/`,{params:{branchId:selected}})]);
   setRegisters(regs.data||[]);setShifts(sh.data||[]);
   setRegisterId(v=>regs.data?.some(r=>r.id===v)?v:(regs.data?.[0]?.id||''));
  }catch(e){setError(errorMessage(e));}finally{setLoading(false);}
 },[branchId]);
 useEffect(()=>{refresh();},[refresh]);
 const active=shifts.find(s=>!s.closedAt),today=workspace?.businessDate||new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Kolkata'});
 const closedToday=shifts.some(s=>s.closedAt&&dayOf(s.openedAt)===today);
 const stale=active&&dayOf(active.openedAt)!==today;
 const submit=async(action)=>{
  setError('');setBusy(true);
  try{
   if(action==='open'){
    if(!registerId||opening===''||!Number.isFinite(Number(opening))||Number(opening)<0)throw Error('Choose a register and enter valid opening cash.');
    await api.post(`${apiRoot}shifts/`,{branchId,registerId,opening:Number(opening)});
    toast.success('Register opened');setOpening('');
   }else{
    if(!active||counted===''||!Number.isFinite(Number(counted))||Number(counted)<0)throw Error('Enter the actual counted cash.');
    if(!window.confirm(`Settle register with ${money(counted)} counted cash? This may close the day or request supervisor approval.`))return;
    const r=await api.post(`${apiRoot}shifts/${active.id}/`,{branchId,action:'close',counted:Number(counted)});
    toast.success(r.data.closingRequested?'Supervisor approval required':'Daily settlement completed');setCounted('');
   }
   await refresh();
  }catch(e){setError(e.response?errorMessage(e):e.message);}finally{setBusy(false);}
 };
 const field='erp-input mt-2 w-full';
 return <div className="space-y-5 pb-12">
  <div className="rounded-2xl bg-slate-900 p-6 text-white"><p className="text-sm text-slate-300">PerfumaSol · POS Register</p><h1 className="text-3xl font-bold mt-1">Daily Settlement</h1><p className="text-slate-300 mt-2">Opening cash, today's takings, and end-of-day reconciliation · {today}</p></div>
  {error&&<div role="alert" className="rounded-xl bg-rose-50 border border-rose-200 p-4 text-rose-800">{error}</div>}
  <div className="rounded-xl bg-white border p-5 flex flex-wrap gap-4 items-end"><label className="text-sm font-semibold flex-1 min-w-48">Branch<select className={field} value={branchId} onChange={e=>setBranchId(e.target.value)}>{(workspace?.branches||[]).map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><button className="erp-secondary" onClick={refresh} disabled={busy||loading}>Refresh</button><Link className="erp-secondary" to="/sales/pos">Back to POS</Link></div>
  {loading?<p>Loading register status…</p>:active?<>
   <div className="rounded-xl bg-white border p-5 space-y-3"><div className="flex flex-wrap justify-between gap-3"><h2 className="text-xl font-bold">{active.register} · {stale?'Previous day still open':active.closingRequested?'Awaiting approval':'Register open'}</h2><span className="text-sm text-slate-600">Opened: {new Date(active.openedAt).toLocaleString('en-IN')}</span></div>
    {stale&&<p className="bg-amber-50 p-3 rounded-lg text-amber-900">This shift belongs to a previous business day. Settle it before opening today's register.</p>}
    {active.closingRequested&&<p className="bg-amber-50 p-3 rounded-lg text-amber-900">Supervisor approval is required for this discrepancy. No further sales should be taken on this shift.</p>}
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['Opening cash',active.opening],['Cash sales',active.cashSales],['Other payments',active.nonCash],['Cash refunds',active.cashRefunds],['Cash in',active.cashIn],['Cash out',active.cashOut],['Expected cash',active.expected]].map(([label,value])=><div key={label} className="rounded-xl bg-slate-50 p-4"><div className="text-xs text-slate-500">{label}</div><div className="font-bold text-lg">{money(value)}</div></div>)}</div>
    {!active.closingRequested&&<form onSubmit={e=>{e.preventDefault();submit('close');}} className="max-w-md space-y-3"><label className="block font-semibold text-sm">Actual cash counted<input type="number" min="0" step="0.01" required className={field} value={counted} onChange={e=>setCounted(e.target.value)} placeholder="Enter counted cash"/></label>{counted!==''&&<p className="text-sm">Difference: <strong>{money(Number(counted)-Number(active.expected))}</strong></p>}<button disabled={busy} className="erp-primary">{busy?'Processing…':'Settle & Close Day'}</button></form>}
   </div>
  </>:<div className="rounded-xl bg-white border p-5 space-y-4"><h2 className="text-xl font-bold">{closedToday?'Today’s register is closed':'Start the business day'}</h2>{closedToday?<p>Today’s settlement is complete. A new register shift can be opened on the next business day.</p>:<form onSubmit={e=>{e.preventDefault();submit('open');}} className="max-w-md space-y-4"><label className="block font-semibold text-sm">Register<select required className={field} value={registerId} onChange={e=>setRegisterId(e.target.value)}>{registers.map(r=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>{!registers.length&&<p className="text-amber-700">No active register is configured for this branch.</p>}<label className="block font-semibold text-sm">Opening cash in hand<input required type="number" min="0" step="0.01" className={field} value={opening} onChange={e=>setOpening(e.target.value)} placeholder="0.00"/></label><button className="erp-primary" disabled={busy||!registers.length}>{busy?'Opening…':'Open Register'}</button></form>}</div>}
  <section className="rounded-xl bg-white border p-5"><h2 className="font-bold text-lg mb-3">Recent register settlements</h2><div className="overflow-x-auto"><table className="w-full text-sm text-left"><thead><tr className="border-b text-slate-500">{['Register','Opened','Closed','Opening','Expected','Counted','Difference','Status'].map(x=><th key={x} className="p-2">{x}</th>)}</tr></thead><tbody>{shifts.map(s=><tr key={s.id} className="border-b">{[s.register,new Date(s.openedAt).toLocaleString('en-IN'),s.closedAt?new Date(s.closedAt).toLocaleString('en-IN'):'—',money(s.opening),money(s.expected),s.counted==null?'—':money(s.counted),s.difference==null?'—':money(s.difference),s.closedAt?'Closed':s.closingRequested?'Approval pending':'Open'].map((v,i)=><td key={i} className="p-2 whitespace-nowrap">{v}</td>)}</tr>)}</tbody></table>{!shifts.length&&<p className="text-slate-500 py-3">No register shifts found.</p>}</div></section>
 </div>;
}
