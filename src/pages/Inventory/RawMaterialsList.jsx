import './RawMaterialsList.css';
import {fetchCategories} from '../../api/categoryApi';
import {apiClient as api} from '../../api/client';
import { RawMaterialCreateForm } from './RawMaterialCreateForm';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { inventoryApi } from '../../api/inventoryApi';
import { formatNumber } from '../../utils/formatters';
import { Plus, Eye, Edit3, Trash2 } from 'lucide-react';
import { Can } from '../../components/common/Can';
import { RawMaterialModal } from './RawMaterialModal';
import { toast } from 'sonner';



export const RawMaterialsList = () => {
  const [locations,setLocations]=useState([]);
  const [locationError,setLocationError]=useState(false);
  const [locationsLoading,setLocationsLoading]=useState(true);
  const [categories,setCategories]=useState([]);
  const [bottleSizes,setBottleSizes]=useState([]);
  const CATEGORIES=[{id:'',name:'All'},...categories];
  const [materials, setMaterials] = useState([]);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState('');
  const [activeSubcategory, setActiveSubcategory] = useState('');
  const [warehouseFilter, setWarehouseFilter] = useState('');
  const [materialError, setMaterialError] = useState('');
  const [selectedItem, setSelectedItem] = useState(null);
  const [deleteItem, setDeleteItem] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [categoryLoading,setCategoryLoading]=useState(true);
  const [categoryError,setCategoryError]=useState(false);

  const [isEditMode, setIsEditMode] = useState(false);

  useEffect(() => {
    Promise.all([api.get('/warehouses/'),api.get('/branches/')]).then(([w,b])=>setLocations([...w.data,...b.data].filter(l=>l.status==='active'))).catch(()=>setLocationError(true)).finally(()=>setLocationsLoading(false));
    api.get('/bottle-sizes/').then(({data})=>setBottleSizes(data)).catch(()=>toast.error('Bottle sizes could not be loaded'));
    loadCategories();
  }, []);

  useEffect(() => { fetchMaterials(warehouseFilter); }, [warehouseFilter]);

  const loadCategories = async () => {
    setCategoryLoading(true); setCategoryError(false);
    try {
      const rows=(await fetchCategories()).filter(c=>c.status==='active');
      setCategories(rows);
      setActiveCategory(v=>rows.some(c=>c.id===v)?v:'');
    } catch {setCategoryError(true);setCategories([]);setActiveCategory('');toast.error('Unable to load categories');}
    finally {setCategoryLoading(false);}
  };

  const fetchMaterials = async (location = warehouseFilter) => {
    setLoading(true); setMaterialError('');
    try {
      const res = await inventoryApi.getRawMaterials(location ? {location} : {});
      setMaterials(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch {
      setMaterialError('Failed to load raw materials');
      toast.error('Failed to load raw materials');
    } finally {
      setLoading(false);
    }
  };

  const handleMaterialUpdate = (updatedMaterial) => {
    setSelectedItem(null);
    fetchMaterials();
  };

  const subcategories = categories.filter(c => !activeCategory || c.id === activeCategory)
    .flatMap(c => c.subcategories || []).filter(s => s.status === 'active');
  const subNames = new Map(categories.flatMap(c => c.subcategories || []).map(s => [String(s.id), s.name]));
  const filteredData = materials.filter(m =>
    (!activeCategory || String(m.categoryRef) === activeCategory || (!m.categoryRef && m.category === categories.find(c => c.id === activeCategory)?.name)) &&
    (!activeSubcategory || String(m.subcategoryRef) === activeSubcategory)
  ).map(m => ({...m, subcategoryName: subNames.get(String(m.subcategoryRef)) || '—'}));

  const columns = [
    { header: 'Material Name', accessor: 'name', render: row => <span className="font-semibold text-gray-900">{row.name}</span> },
    { header: 'Subcategory', accessor: 'subcategoryName' },
    { header: 'Available Qty', accessor: 'availableStock', align: 'right', render: row => <span className="font-semibold tabular-nums">{row.availableStock == null ? '—' : `${formatNumber(row.availableStock, row.unit === 'pcs' ? 0 : 4)} ${row.unit}`}</span> },
    {
      header: 'Actions',
      align: 'right',
      sortable: false,
      render: (row) => (
        <div className="raw-material-actions flex items-center justify-end gap-2">
          <button
            onClick={() => {
              setIsEditMode(false);
              setSelectedItem(row);
            }}
            className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            aria-label="View material" title="View Details & Movement History"
          >
            <Eye className="w-3.5 h-3.5" />

          </button>
          <Can permission={["inventory.raw_material.edit","warehouse.manage"]}><button
            onClick={() => {
              setIsEditMode(true);
              setSelectedItem(row);
            }}
            className="px-2.5 py-1 bg-violet-50 hover:bg-violet-100 text-[var(--primary)] border border-violet-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            aria-label="Edit material" title="Edit Material"
          >
            <Edit3 className="w-3.5 h-3.5" />

          </button></Can>
          <Can permission={["inventory.raw_material.delete","warehouse.manage"]}><button
            onClick={() => setDeleteItem(row)}
            className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-lg text-xs font-semibold flex items-center space-x-1 transition-colors"
            aria-label="Delete material" title="Delete Material"
          >
            <Trash2 className="w-3.5 h-3.5" />

          </button></Can>
        </div>
      ),
    },
  ];

  const handleDeleteConfirm = async () => {
    if (!deleteItem || deleting) return;
    setDeleting(true);
    try {
      await inventoryApi.deleteRawMaterial(deleteItem.id);
      toast.success(`Raw material "${deleteItem.name}" deleted successfully.`);
      setDeleteItem(null);
      fetchMaterials();
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Unable to delete this raw material.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="raw-materials-page">
      <PageHeader
        title="Raw Materials Inventory"
        subtitle="Manage raw materials and available stock"
        onRefresh={()=>{fetchMaterials();loadCategories();}}
        primaryAction={
          <Can permission={["inventory.raw_material.create","warehouse.manage"]}>
            <button type="button" onClick={()=>{loadCategories();setCreating(true);}} className="erp-primary flex items-center gap-2">
              <Plus className="w-4 h-4" /> Add Raw Material
            </button>
          </Can>
        }
      />

      {/* Filter Tabs */}
      <div className="erp-panel flex items-center space-x-1 overflow-x-auto mb-4  p-1.5  ">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => {setActiveCategory(cat.id);setActiveSubcategory('');}}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              activeCategory === cat.id
                ? 'bg-[var(--primary)] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {cat.name}
          </button>
        ))}
      </div>

      {categoryLoading && <p className="text-xs text-gray-500 mb-3">Loading categories…</p>}
      {categoryError && <p role="alert" className="text-sm text-rose-700 mb-3">Unable to load categories. <button type="button" onClick={loadCategories} className="underline">Retry</button></p>}
      {!categoryLoading && !categoryError && !categories.length && <p className="text-sm text-gray-500 mb-3">No active categories. Create or activate a category in Category Management.</p>}
      <DataTable columns={columns} data={filteredData} loading={loading} searchPlaceholder="Search materials or subcategory…" error={materialError} onRetry={()=>fetchMaterials()} filterComponent={<div className="raw-material-filters"><select className="erp-input" aria-label="Subcategory" value={activeSubcategory} onChange={e=>setActiveSubcategory(e.target.value)}><option value="">All subcategories</option>{subcategories.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}</select><select className="erp-input" aria-label="Warehouse" value={warehouseFilter} onChange={e=>setWarehouseFilter(e.target.value)}><option value="">All accessible locations</option>{locations.filter(l=>l.kind==='Warehouse'&&!l.isVirtual).map(l=><option key={l.id} value={l.name}>{l.name}</option>)}</select></div>} />

      {/* Comprehensive Raw Material Detail & Edit Modal */}
      {selectedItem && (
        <RawMaterialModal
          isOpen={!!selectedItem}
          material={selectedItem}
          initialEdit={isEditMode}
          onClose={() => setSelectedItem(null)}
          onUpdate={handleMaterialUpdate}
        />
      )}

      {locationError && <p role="alert" className="text-rose-700 my-3">Branch and warehouse quantities could not be loaded. Reload to retry.</p>}
      {creating && <RawMaterialCreateForm categories={categories} bottleSizes={bottleSizes} locations={locations} locationsLoading={locationsLoading} locationError={locationError} onClose={()=>setCreating(false)} onSuccess={()=>fetchMaterials()}/> }
      {/* Confirm Delete Modal */}
      <ConfirmModal
        isOpen={!!deleteItem}
        title="Delete Raw Material Record"
        message={`Delete "${deleteItem?.name}"? Any eligible opening stock across all locations will also be permanently removed. Materials used in business transactions cannot be deleted.`}
        loading={deleting}
        confirmText="Delete Material"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => { if (!deleting) setDeleteItem(null); }}
      />
    </div>
  );
};
