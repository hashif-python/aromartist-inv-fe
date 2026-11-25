import React,{useState,useEffect} from 'react';
import {Link} from 'react-router-dom';
import {toast} from 'sonner';
import {fetchCategories} from '../../api/categoryApi';
import {useAuth} from '../../context/AuthContext';
import {inventoryApi} from '../../api/inventoryApi';
import {errorMessage} from '../../api/client';
const units=['ml','L','g','kg','pcs'];
export function RawMaterialCreateForm({bottleSizes=[],locations=[],locationsLoading,locationError,onClose,onSuccess}){
 const {singleLocationMode,storeSetup}=useAuth();
 const [form,setForm]=useState({name:'',categoryRef:'',subcategoryRef:'',unit:'',description:'',status:'active',packagingType:''});
 const [locationId,setLocationId]=useState(''),[quantity,setQuantity]=useState('0'),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [categories,setCategories]=useState([]),[loading,setLoading]=useState(true),[failed,setFailed]=useState(false),[retry,setRetry]=useState(0);
 useEffect(()=>{let live=true;setLoading(true);setFailed(false);fetchCategories().then(rows=>{if(live)setCategories(rows)}).catch(()=>{if(live){setCategories([]);setFailed(true);toast.error('Unable to load categories')}}).finally(()=>{if(live)setLoading(false)});return()=>{live=false}},[retry]);
 const choices=categories.filter(c=>c.status==='active');
 const warehouses=locations.filter(l=>l.kind==='Warehouse'&&!l.isVirtual&&l.status==='active'&&(!singleLocationMode||String(l.id)===String(storeSetup?.warehouseId)));
 const selected=warehouses.find(l=>String(l.id)===locationId)||(warehouses.length===1?warehouses[0]:null);
 const categoryName=(choices.find(c=>c.id===form.categoryRef)?.name||'').trim().toLowerCase().replace(/\s+/g,' ');
 const isPackaging=['packaging','packing','packging','packaging items','bottle','pump','cap'].includes(categoryName);
 const isLiquid=['oil','oils','perfume oil','perfume oils','fragrance oil','fragrance oils','solvent','solvents'].includes(categoryName);
 const subchoices=(choices.find(c=>c.id===form.categoryRef)?.subcategories||[]).filter(s=>s.status==='active');
 const allowedUnits=subchoices.filter(s=>String(s.id)===form.subcategoryRef).map(s=>s.unit);
 const set=(key,value)=>setForm(f=>({...f,[key]:value}));
 const save=async e=>{e.preventDefault();if(busy||loading||failed)return;setError('');const q=Number(quantity);if(!choices.some(c=>c.id===form.categoryRef)||!allowedUnits.includes(form.unit)||quantity===''||!Number.isFinite(q)||q<0||(form.unit==='pcs'&&!Number.isInteger(q))||(q>0&&!selected)){setError('Select a valid category, unit and warehouse, and enter a valid opening quantity.');return;}setBusy(true);try{await inventoryApi.createRawMaterial({...form,minStock:0,openingStocks:q>0?[{locationId:String(selected.id),quantity}]:[]});toast.success('Raw material created');onSuccess();onClose();}catch(e){const message=e.response?errorMessage(e):e.message;setError(message);toast.error(message);}finally{setBusy(false);}};
 return <div className="erp-dialog-backdrop" role="dialog" aria-modal="true" aria-label="Create raw material"><form className="erp-dialog space-y-4" onSubmit={save}>
 <h2 className="text-xl font-bold">Add Raw Material</h2>{error&&<p role="alert" className="text-red-700">{error}</p>}
 <label className="erp-field">Material name<input className="erp-input" required maxLength={160} value={form.name} onChange={e=>set('name',e.target.value)}/></label>
 <label className="erp-field">Category<select className="erp-input" required disabled={loading||failed} value={form.categoryRef} onChange={e=>{setForm(f=>({...f,categoryRef:e.target.value,subcategoryRef:'',unit:'',packagingType:''}));setQuantity('0')}}><option value="">{loading?'Loading categories…':'Select category'}</option>{choices.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
 {failed&&<p role="alert">Unable to load categories. <button type="button" onClick={()=>setRetry(v=>v+1)}>Retry</button></p>}{!loading&&!failed&&!choices.length&&<p>Create an active category in <Link to="/inventory/categories">Categories</Link> first.</p>}
 <label className="erp-field">Subcategory<select className="erp-input" required value={form.subcategoryRef} onChange={e=>{const sub=subchoices.find(s=>String(s.id)===e.target.value);setForm(f=>({...f,subcategoryRef:e.target.value,unit:sub?.unit||''}));setQuantity('0')}}><option value="">Select subcategory</option>{subchoices.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select></label>
 <label className="erp-field">Unit<input className="erp-input" readOnly value={form.unit}/></label>
 <label className="erp-field">Initial Available Quantity ({form.unit||'unit'})<input className="erp-input" type="number" required min="0" step={form.unit==='pcs'?'1':'0.0001'} value={quantity} onChange={e=>setQuantity(e.target.value)}/></label>
 <label className="erp-field">Warehouse<select className="erp-input" required={Number(quantity)>0} disabled={locationsLoading||locationError} value={selected?String(selected.id):''} onChange={e=>setLocationId(e.target.value)}><option value="">Select warehouse</option>{warehouses.map(l=><option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
 {locationError&&<p role="alert">Warehouses could not be loaded. Reload the page before adding stock.</p>}
 <label className="erp-field">Description<textarea className="erp-input" value={form.description} onChange={e=>set('description',e.target.value)}/></label><label className="erp-field">Status<select className="erp-input" value={form.status} onChange={e=>set('status',e.target.value)}><option>active</option><option>inactive</option></select></label>
 <div className="flex gap-3"><button type="button" className="erp-secondary" disabled={busy} onClick={onClose}>Cancel</button><button className="erp-primary" disabled={busy||loading||failed||!choices.length||(Number(quantity)>0&&(locationsLoading||locationError||!selected))}>{busy?'Saving…':'Save raw material'}</button></div></form></div>;
}
