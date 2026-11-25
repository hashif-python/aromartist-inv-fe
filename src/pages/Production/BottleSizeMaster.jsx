import { Can } from '../../components/common/Can';
import React, { useEffect, useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { DataTable } from '../../components/common/DataTable';
import { StatusBadge } from '../../components/common/StatusBadge';
import { ConfirmModal } from '../../components/common/ConfirmModal';
import { fragranceApi } from '../../api/fragranceApi';
import { inventoryApi } from '../../api/inventoryApi';
import { Plus, Edit3, Box, Info, Eye, Trash2, X } from 'lucide-react';
import { BottleSizeModal } from './BottleSizeModal';
import { toast } from 'sonner';

export const BottleSizeMaster = () => {
  const [bottleSizes, setBottleSizes] = useState([]);
  const [rawMaterialsMap, setRawMaterialsMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewSize, setViewSize] = useState(null);
  const [deleteSizeItem, setDeleteSizeItem] = useState(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [sizesRes, rmRes] = await Promise.all([
        fragranceApi.getBottleSizes(),
        inventoryApi.getRawMaterials().catch(() => ({ data: [] })),
      ]);

      const sizes = sizesRes.data || [];
      const rms = rmRes.data || [];

      // Create lookup map for raw materials
      const rmMap = {};
      rms.forEach((rm) => {
        rmMap[rm.id] = rm;
        if (rm.code) rmMap[rm.code] = rm;
      });

      setRawMaterialsMap(rmMap);
      setBottleSizes([...sizes].sort((a, b) => Number(a.volumeMl) - Number(b.volumeMl)));
    } catch (err) {
      console.error(err);
      toast.error('Failed to load bottle sizes from backend');
    } finally {
      setLoading(false);
    }
  };

  const getMaterialLabel = (ref) => {
    if (!ref) return 'N/A';
    if (rawMaterialsMap[ref]) {
      const rm = rawMaterialsMap[ref];
      return `${rm.name} (${rm.code || rm.id})`;
    }
    return ref;
  };

  const handleDeleteConfirm = async () => {
    if (!deleteSizeItem) return;
    try {
      await fragranceApi.deleteBottleSize(deleteSizeItem.id);
      toast.success(`Bottle size "${deleteSizeItem.name}" deleted successfully.`);
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'The operation could not be saved.');
    } finally {
      setDeleteSizeItem(null);
    }
  };

  const components = [
    ['Bottle', 'bottleMaterialRef'], ['Cap', 'capMaterialRef'],
    ['Pump / Atomizer', 'pumpMaterialRef'], ['Label', 'labelMaterialRef'],
    ['Separate Dip Tube', 'dipTubeMaterialRef'],
  ];
  const columns = [
    { header: 'Capacity', accessor: 'volumeMl', className: 'whitespace-nowrap',
      render: row => <span className="font-semibold">{Number(row.volumeMl)} ml</span> },
    { header: 'Bottle material', accessor: 'bottleMaterialRef', sortable: false,
      searchValue: row => getMaterialLabel(row.bottleMaterialRef),
      render: row => <span className="font-medium break-words">{rawMaterialsMap[row.bottleMaterialRef]?.name || (row.bottleMaterialRef ? 'Linked material' : 'Not configured')}</span> },
    { header: 'Packaging', sortable: false, className: 'whitespace-nowrap',
      searchValue: row => components.map(([, key]) => getMaterialLabel(row[key])).join(' '),
      render: row => <span className="text-gray-600">{components.filter(([, key]) => row[key]).length} components</span> },
    { header: 'Status', accessor: 'status', render: row => <StatusBadge status={row.status || 'active'} /> },
    { header: 'Actions', align: 'right', sortable: false, className: 'whitespace-nowrap',
      render: row => <div className="flex items-center justify-end gap-2">
        <button type="button" onClick={() => setViewSize(row)} title="View details" aria-label="View details" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-blue-200 text-blue-700 hover:bg-blue-50"><Eye size={16}/></button>
        <Can permission={["inventory.bottle_setup.edit","production.formulation"]}><button type="button" onClick={() => setSelectedSize(row)} title="Edit bottle" aria-label="Edit bottle" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gray-200 text-[var(--primary)] hover:bg-gray-50"><Edit3 size={16}/></button></Can>
        <Can permission={["inventory.bottle_setup.delete","production.formulation"]}><button type="button" onClick={() => setDeleteSizeItem(row)} title="Delete bottle" aria-label="Delete bottle" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-200 text-rose-700 hover:bg-rose-50"><Trash2 size={16}/></button></Can>
      </div> },
  ];

  return (
    <div className="space-y-6 min-w-0 bottle-setup-page">
      <style>{`.bottle-setup-page .erp-table { min-width: 620px; width: 100%; } .bottle-setup-page .erp-table th, .bottle-setup-page .erp-table td { padding: 12px 16px; vertical-align: middle; } .bottle-setup-page .erp-table th:last-child, .bottle-setup-page .erp-table td:last-child { width: 156px; } .bottle-setup-page .erp-table-scroll { overflow-x: auto; }`}</style>
      <PageHeader
        title="Bottle Setup"
        subtitle="Manage bottle capacities and packaging configurations"
        primaryAction={
          <button
            onClick={() => setIsAddOpen(true)}
            className="px-4 py-2 bg-[var(--primary)] hover:bg-[#252525] text-white font-semibold text-xs rounded-xl shadow-xs flex items-center space-x-1.5 transition-colors"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>Add Bottle</span>
          </button>
        }
      />

      <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl text-xs text-amber-950 flex items-start space-x-3">
        <Info className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
        <div>
          <strong className="font-bold">Master data:</strong> Maintain bottle volumes and packaging references here. Link bottle, cap, pump and label stock here; add a dip tube only when stocked separately. Products use this packaging set at POS checkout.
        </div>
      </div>

      <DataTable
        columns={columns}
        data={bottleSizes}
        loading={loading}
        searchPlaceholder="Search bottles or materials…"
      />

      {/* Add / Edit Bottle Size Modal */}
      {(isAddOpen || selectedSize) && (
        <BottleSizeModal
          isOpen={isAddOpen || !!selectedSize}
          bottleSize={selectedSize}
          onClose={() => {
            setIsAddOpen(false);
            setSelectedSize(null);
          }}
          onSuccess={() => {
            setIsAddOpen(false);
            setSelectedSize(null);
            fetchData();
          }}
        />
      )}

      {/* View Bottle Size Modal */}
      {viewSize && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="erp-panel   max-w-lg w-full max-h-[90vh] overflow-y-auto p-6  space-y-4  text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-amber-50 rounded-xl text-[var(--primary)]">
                  <Box className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">{viewSize.name}</h3>
                  <p className="text-xs text-gray-500">Bottle Master Record</p>
                </div>
              </div>
              <button onClick={() => setViewSize(null)} className="p-1 hover:bg-gray-100 rounded-lg text-gray-500">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Bottle Capacity:</span>
                <span className="font-bold text-[var(--primary)]">{viewSize.volumeMl} ml</span>
              </div>
              {components.map(([label, key]) => (
                <div key={key} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-3 py-2 border-b border-gray-200">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900 text-right break-words">{getMaterialLabel(viewSize[key])}</span>
                </div>
              ))}
              <div className="flex justify-between py-1 border-b border-gray-200">
                <span className="text-gray-500">Status:</span>
                <StatusBadge status={viewSize.status || 'active'} />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewSize(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Bottle Size Modal */}
      <ConfirmModal
        isOpen={!!deleteSizeItem}
        title="Delete Bottle Size Record"
        message={`Are you sure you want to delete bottle size "${deleteSizeItem?.name}"?`}
        confirmText="Delete Bottle Size"
        type="danger"
        onConfirm={handleDeleteConfirm}
        onClose={() => setDeleteSizeItem(null)}
      />
    </div>
  );
};

