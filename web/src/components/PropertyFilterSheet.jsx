import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import { PropertyFilterPanel } from './PropertyFilterPanel.jsx';

/**
 * PropertyFilterSheet — mobile-only entry point (7.2: "כפתור סינון יחיד שפותח מגירה בשלבים").
 * Desktop renders PropertyFilterPanel directly as an inline side panel instead of this.
 */
export function PropertyFilterSheet({ filters, setFilter, toggleAmenity, activeCount, resultCount, isLoading }) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      <button type="button" className="pfs__trigger" onClick={() => setIsOpen(true)}>
        <SlidersHorizontal size={16} />
        סינון
        {activeCount > 0 && <span className="pfs__trigger-badge">{activeCount}</span>}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              className="pfs__backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
            />
            <motion.div
              className="pfs__sheet"
              role="dialog"
              aria-modal="true"
              aria-label="סינון נכסים"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 32, stiffness: 300 }}
            >
              <div className="pfs__sheet-head">
                <span className="pfs__sheet-title">סינון</span>
                <button type="button" className="pfs__sheet-close" onClick={() => setIsOpen(false)} aria-label="סגור">
                  <X size={18} />
                </button>
              </div>
              <div className="pfs__sheet-body">
                <PropertyFilterPanel filters={filters} setFilter={setFilter} toggleAmenity={toggleAmenity} resultCount={resultCount} isLoading={isLoading} />
              </div>
              <div className="pfs__sheet-footer">
                <button type="button" className="pfs__sheet-apply" onClick={() => setIsOpen(false)}>
                  {isLoading ? 'סופר תוצאות…' : `הצג ${resultCount} נכסים`}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
