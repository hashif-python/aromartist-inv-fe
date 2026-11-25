import {FragrancePriceFields} from '../../components/Perfume/FragrancePriceFields';
import React, { useState, useEffect } from 'react';
import { TextInput, SelectInput, TextArea } from '../../components/forms/FormControls';
import { fragranceApi } from '../../api/fragranceApi';
import { inventoryApi } from '../../api/inventoryApi';
import { X, Sparkles, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const FragranceModal = ({ isOpen, fragrance, onClose, onSuccess }) => {
  const isEdit = !!fragrance;

  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [refBrand, setRefBrand] = useState('');
  const [perfumeOilId, setPerfumeOilId] = useState('');
  const [status, setStatus] = useState('active');
  const [pricesByType,setPrices]=useState({});
  const [notes, setNotes] = useState('');

  const [bottles,setBottles]=useState([]);
  const [loadingBottles,setLoadingBottles]=useState(false);
  const [bottleError,setBottleError]=useState(false);
  const [perfumeOils, setPerfumeOils] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [loadingOils, setLoadingOils] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadPerfumeOils();
      setLoadingBottles(true);setBottleError(false);setBottles([]);
      fragranceApi.getBottleSizes().then(r=>setBottles((Array.isArray(r.data)?r.data:r.data?.results||[]).filter(b=>b.status==='active').sort((a,b)=>Number(a.volumeMl)-Number(b.volumeMl)))).catch(()=>{setBottleError(true);toast.error('Unable to load bottle setups');}).finally(()=>setLoadingBottles(false));
      if (fragrance) {
        setCode(fragrance.code || '');
        setName(fragrance.name || '');
        setRefBrand(fragrance.refBrand || '');
        setPerfumeOilId(fragrance.perfumeOilId || '');
        setStatus(fragrance.status || 'active');
        setNotes(fragrance.notes || '');setPrices(Object.fromEntries(Object.entries(fragrance.pricesByType||{}).filter(([,v])=>v&&typeof v==='object'&&!Array.isArray(v))));
      } else {
        setCode('');
        setName('');
        setRefBrand('');
        setPerfumeOilId('');
        setStatus('active');
        setNotes('');setPrices({});
      }
    }
  }, [isOpen, fragrance]);

  const loadPerfumeOils = async () => {
    setLoadingOils(true);
    setPerfumeOils([]);
    try {
      const res = await inventoryApi.getRawMaterials();
      const oils = (Array.isArray(res.data) ? res.data : res.data?.results || []).filter(
        (m) => m.categoryType === 'Perfume Oil' && m.unit === 'ml' && m.status === 'active' && m.ingredientActive !== false
      );
      setPerfumeOils(oils);

    } catch (err) {
      toast.error("Unable to load perfume oils.");
    } finally {
      setLoadingOils(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Fragrance name is required');
      return;
    }

    if (!perfumeOilId || !perfumeOils.some(o => String(o.id) === String(perfumeOilId))) {
      toast.error("Select an active perfume oil.");
      return;
    }
    setSubmitting(true);
    try {
      const formData = {
        code: code.trim(),
        name: name.trim(),
        refBrand: refBrand.trim(),
        perfumeOilId,
        status,
        notes: notes.trim(),
        pricesByType,
      };

      if (isEdit) {
        await fragranceApi.updateFragrance(fragrance.id, formData);
        toast.success('Fragrance profile updated successfully!');
      } else {
        await fragranceApi.createFragrance(formData);
        toast.success('New Fragrance profile created successfully!');
      }

      onSuccess();
    } catch (err) {
      toast.error(err.response?.data ? JSON.stringify(err.response.data) : isEdit ? 'Failed to update fragrance profile' : 'Failed to create fragrance profile');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <><div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <div className="erp-panel   max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6  space-y-4 ">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-50 rounded-xl text-[var(--primary)]">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-gray-900 text-lg">
              {isEdit ? 'Edit Fragrance Profile' : 'Add New Fragrance Profile'}
            </h3>
          </div>
          <button aria-label="Close dialog" onClick={onClose} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="Fragrance Code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              className="font-mono font-bold text-[var(--primary)]"
            />

            <TextInput
              label="Fragrance Name"
              placeholder="e.g. Aventus Style"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <TextInput
              label="Reference / Inspiration Brand"
              placeholder="e.g. Creed Aventus"
              value={refBrand}
              onChange={(e) => setRefBrand(e.target.value)}
            />



            <SelectInput
              label="Primary Perfume Oil Binding"
              value={perfumeOilId}
              onChange={(e) => setPerfumeOilId(e.target.value)}
              options={[{label:loadingOils ? 'Loading oils...' : 'Select a perfume oil',value:''},...perfumeOils.map(o => ({label:`${o.name} (${o.availableStock ?? 0} ${o.unit})`,value:o.id}))]}
            />

            <SelectInput
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { label: 'Active', value: 'active' },
                { label: 'Inactive', value: 'inactive' },
              ]}
            />
          </div>

          <TextArea
            label="Scent Notes / Olfactory Description"
            placeholder="Top: Bergamot, Pineapple | Heart: Birch, Patchouli | Base: Musk, Oakmoss"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
          />

          <FragrancePriceFields value={pricesByType} onChange={setPrices} bottles={bottles}/>

          <div className="flex justify-end space-x-2 pt-3 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || loadingOils || loadingBottles || bottleError}
              className="px-5 py-2 text-xs font-bold text-white bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-xl shadow-xs transition-colors flex items-center space-x-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Fragrance'}</span>
            </button>
          </div>
        </form>
      </div>
    </div></>
  );
};
