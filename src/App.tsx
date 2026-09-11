import React, { useState, useEffect, useMemo } from 'react';
import {
  ProfileMeta,
  ProfileCatalog,
  CatalogItem,
  EstimateItem,
} from './types';
import { fetchProfilesList, fetchProfileCatalog } from './services/profileService';
import { storage } from './services/storage';
import { useEstimate } from './hooks/useEstimate';
import { Header } from './components/Header';
import { OfflineBanner } from './components/OfflineBanner';
import { IOSInstallBanner } from './components/IOSInstallBanner';
import { CatalogBrowser } from './components/CatalogBrowser';
import { EstimateTable } from './components/EstimateTable';
import { EstimateSummary } from './components/EstimateSummary';
import { ProfileSelectorModal } from './components/ProfileSelectorModal';
import { AddCustomItemModal } from './components/AddCustomItemModal';
import { CustomerInfoModal } from './components/CustomerInfoModal';
import { ExportModal } from './components/ExportModal';
import {
  ShoppingBag,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { formatCurrency } from './services/exportService';

export default function App() {
  // Profiles catalog state
  const [profiles, setProfiles] = useState<ProfileMeta[]>([]);
  const [currentProfileId, setCurrentProfileId] = useState<string>('plumbing');
  const [currentCatalog, setCurrentCatalog] = useState<ProfileCatalog | null>(null);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true);

  // Active Estimate state & business operations via custom hook
  const {
    estimate,
    totals,
    addItem,
    updateItemQuantity,
    updateItemPrice,
    deleteItem,
    clearEstimate,
    updateDiscount,
    createNewEstimate,
    updateMetadata,
    restoreEstimate,
  } = useEstimate(currentProfileId, currentCatalog?.name || 'Сантехника');

  // UI Modals state
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isCustomItemModalOpen, setIsCustomItemModalOpen] = useState(false);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Mobile view tab (catalog vs estimate)
  const [mobileTab, setMobileTab] = useState<'catalog' | 'estimate'>('catalog');

  // Initial profiles catalog loading
  useEffect(() => {
    let isMounted = true;

    async function initCatalog() {
      try {
        const metaList = await fetchProfilesList();
        if (!isMounted) return;
        setProfiles(metaList);

        const lastProfile = storage.getLastUsedProfileId();
        const initialProfileId = lastProfile || 'plumbing';
        setCurrentProfileId(initialProfileId);

        const cat = await fetchProfileCatalog(initialProfileId);
        if (!isMounted) return;
        setCurrentCatalog(cat);
      } catch (err) {
        console.error('Initialization error:', err);
      } finally {
        if (isMounted) {
          setIsLoadingCatalog(false);
        }
      }
    }

    initCatalog();

    return () => {
      isMounted = false;
    };
  }, []);

  // Profile change handler
  const handleSelectProfile = async (profileId: string) => {
    setIsLoadingCatalog(true);
    try {
      const cat = await fetchProfileCatalog(profileId);
      setCurrentProfileId(profileId);
      setCurrentCatalog(cat);
      storage.setLastUsedProfileId(profileId);

      // Update estimate profile metadata
      updateMetadata({
        profileId,
        profileName: cat.name,
      });
    } catch (e) {
      console.error('Failed to change profile:', e);
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  // Add custom manual item
  const handleAddCustomItem = (itemData: Omit<EstimateItem, 'id' | 'total'>) => {
    addItem(itemData, itemData.quantity);
  };

  // Restore imported estimate
  const handleRestoreEstimate = async (restored: any) => {
    await restoreEstimate(restored);
    if (restored.profileId && restored.profileId !== currentProfileId) {
      handleSelectProfile(restored.profileId);
    }
  };

  const currentProfileMeta = useMemo(() => {
    return profiles.find((p) => p.id === currentProfileId) || null;
  }, [profiles, currentProfileId]);

  return (
    <div className="min-h-screen lg:h-screen lg:overflow-hidden bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500 selection:text-slate-950">
      {/* Offline Alert Banner */}
      <OfflineBanner />

      {/* iOS Safari PWA Install Banner */}
      <IOSInstallBanner />

      {/* Main App Navigation Header */}
      <Header
        currentProfile={currentProfileMeta}
        onOpenProfileSelector={() => setIsProfileModalOpen(true)}
        onOpenExport={() => setIsExportModalOpen(true)}
      />

      {/* Mobile Tab Switcher (Visible on screens < lg) */}
      <div className="lg:hidden bg-slate-900 border-b border-slate-800 p-2 sticky top-[57px] z-30 no-print flex-shrink-0">
        <div className="grid grid-cols-2 gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            type="button"
            onClick={() => setMobileTab('catalog')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              mobileTab === 'catalog'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Каталог товаров</span>
          </button>
          <button
            type="button"
            onClick={() => setMobileTab('estimate')}
            className={`flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
              mobileTab === 'estimate'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Смета ({estimate.items.length})</span>
          </button>
        </div>
      </div>

      {/* Main Workspace Area */}
      <main className="flex-1 min-h-0 max-w-7xl w-full mx-auto p-3 sm:p-4 no-print flex flex-col">
        {isLoadingCatalog ? (
          <div className="flex flex-col items-center justify-center flex-1 text-slate-400">
            <div className="w-8 h-8 rounded-full border-2 border-amber-400 border-t-transparent animate-spin mb-3" />
            <p className="text-sm font-medium">Загрузка каталога профиля...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-0 items-stretch">
            {/* Catalog Column (Left) */}
            <div
              className={`lg:col-span-6 xl:col-span-6 h-full flex flex-col min-h-0 ${
                mobileTab === 'catalog' ? 'block' : 'hidden lg:flex'
              }`}
            >
              <CatalogBrowser
                catalogItems={currentCatalog?.items || []}
                categories={currentCatalog?.categories || []}
                activeEstimateItems={estimate.items}
                onAddItem={(item: CatalogItem, qty: number) => addItem(item, qty)}
                onOpenCustomModal={() => setIsCustomItemModalOpen(true)}
              />
            </div>

            {/* Estimate Column (Right) */}
            <div
              className={`lg:col-span-6 xl:col-span-6 h-full flex flex-col min-h-0 space-y-3 ${
                mobileTab === 'estimate' ? 'block' : 'hidden lg:flex'
              }`}
            >
              {/* Estimate Totals and Controls */}
              <EstimateSummary
                items={estimate.items}
                discount={estimate.discount}
                onUpdateDiscount={updateDiscount}
                subtotal={totals.subtotal}
                total={totals.grandTotal}
                estimate={estimate}
                onOpenCustomerInfo={() => setIsCustomerModalOpen(true)}
                onOpenExportModal={() => setIsExportModalOpen(true)}
              />

              {/* Estimate Items Table */}
              <EstimateTable
                items={estimate.items}
                onUpdateQuantity={updateItemQuantity}
                onUpdatePrice={updateItemPrice}
                onDeleteItem={deleteItem}
                onClearAll={clearEstimate}
                onSwitchToCatalog={() => setMobileTab('catalog')}
              />
            </div>
          </div>
        )}
      </main>

      {/* Floating Bottom Bar on Mobile when browsing Catalog */}
      {mobileTab === 'catalog' && estimate.items.length > 0 && (
        <div className="lg:hidden fixed bottom-0 left-0 right-0 p-2.5 bg-slate-950/95 border-t border-slate-800 backdrop-blur-md z-40 no-print flex items-center justify-between gap-3 shadow-2xl">
          <div>
            <div className="text-[11px] text-slate-400">
              В смете: <span className="text-white font-bold">{estimate.items.length} поз.</span>
            </div>
            <div className="text-base font-black text-amber-400 font-mono">
              {formatCurrency(totals.grandTotal)}
            </div>
          </div>

          <button
            type="button"
            onClick={() => setMobileTab('estimate')}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition active:scale-95 shadow-md shadow-amber-500/20 cursor-pointer"
          >
            <span>К смете ({estimate.items.length})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modals */}
      <ProfileSelectorModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        profiles={profiles}
        selectedProfileId={currentProfileId}
        onSelectProfile={handleSelectProfile}
        estimateItemCount={estimate.items.length}
      />

      <AddCustomItemModal
        isOpen={isCustomItemModalOpen}
        onClose={() => setIsCustomItemModalOpen(false)}
        onAddItem={handleAddCustomItem}
        defaultCategories={currentCatalog?.categories || []}
      />

      <CustomerInfoModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        estimate={estimate}
        onSave={updateMetadata}
      />

      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        estimate={estimate}
        onRestoreEstimate={handleRestoreEstimate}
      />
    </div>
  );
}
