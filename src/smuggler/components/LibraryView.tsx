'use client';

import { useEffect, useState, useMemo, useRef, useCallback } from 'react';
import {
  motion,
  AnimatePresence,
  useInView,
  animate,
  useMotionValue,
  useSpring,
  useTransform,
  useMotionTemplate,
  type Variants,
} from 'framer-motion';
import { Dialog, DialogContent, DialogClose } from '@/components/ui/dialog';
import {
  Search,
  ArrowUpDown,
  Grid3x3,
  List as ListIcon,
  FolderPlus,
  Star,
  MoreVertical,
  Pin,
  Copy,
  Download,
  Trash2,
  Archive,
  FolderInput,
  Pencil,
  X,
  Check,
  ShieldCheck,
  Plus,
  Folder,
  Clock,
  ChevronDown,
  RotateCcw,
  Sparkles,
  Crosshair,
  TrendingUp,
  Trophy,
  Crown,
  Paperclip,
  ArrowRight,
  Calendar,
  Briefcase,
  PenLine,
  Zap,
} from 'lucide-react';
import {
  useLibraryStore,
  type LibraryItem,
  type LibraryFolder,
  type LibraryItemType,
  type LibraryItemStatus,
  LIBRARY_TYPE_ICONS,
  LIBRARY_TYPE_LABELS,
  formatTimeAgo,
} from '@/smuggler/store/useLibraryStore';
import { useUserStore } from '@/smuggler/store/useUserStore';
import BackButton from '@/smuggler/components/BackButton';

/* ============================================================
   Types & Constants
   ============================================================ */

export interface LibraryViewProps {
  onNavigate: (view: 'home' | 'tools' | 'library') => void;
  onSelectTool: (toolId: string) => void;
}

type TabKey =
  | 'all'
  | 'generated'
  | 'templates'
  | 'brand-assets'
  | 'favorites'
  | 'trash';

type SortKey = 'recent' | 'oldest' | 'az' | 'za' | 'score';
type ViewMode = 'grid' | 'list';
type FolderFilter = 'all' | 'unsorted' | string; // string = folderId

const FOLDER_COLORS = [
  '#FF0000',
  '#E1306C',
  '#4C6B4A',
  '#C09858',
  '#3B648C',
  '#624B8B',
  '#C28B5E',
  '#B87B3E',
];

const TYPE_COLORS: Record<LibraryItemType, { bg: string; text: string }> = {
  hook: { bg: 'rgba(192,152,88,0.16)', text: '#C09858' },
  title: { bg: 'rgba(75,107,74,0.16)', text: '#4C6B4A' },
  script: { bg: 'rgba(59,100,140,0.16)', text: '#3B648C' },
  caption: { bg: 'rgba(225,48,108,0.16)', text: '#E1306C' },
  thumbnail: { bg: 'rgba(184,123,62,0.16)', text: '#B87B3E' },
  'ai-output': { bg: 'rgba(98,75,139,0.16)', text: '#624B8B' },
  repurposed: { bg: 'rgba(184,160,62,0.16)', text: '#B8A03E' },
  invoice: { bg: 'rgba(60,90,120,0.16)', text: '#3C5A78' },
  calendar: { bg: 'rgba(192,57,43,0.16)', text: '#C0392B' },
  'brand-asset': { bg: 'rgba(192,152,88,0.2)', text: '#A07A3E' },
  media: { bg: 'rgba(75,107,74,0.18)', text: '#3E5C3D' },
  template: { bg: 'rgba(98,75,139,0.18)', text: '#5A4480' },
  prompt: { bg: 'rgba(192,152,88,0.18)', text: '#A07A3E' },
  export: { bg: 'rgba(75,107,74,0.14)', text: '#4C6B4A' },
  document: { bg: 'rgba(60,90,120,0.16)', text: '#3C5A78' },
};

const TABS: { key: TabKey; label: string }[] = [
  { key: 'all', label: 'All Content' },
  { key: 'generated', label: 'Generated' },
  { key: 'templates', label: 'Templates' },
  { key: 'brand-assets', label: 'Brand Assets' },
  { key: 'favorites', label: 'Favorites' },
  { key: 'trash', label: 'Trash' },
];

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'recent', label: 'Recent' },
  { key: 'oldest', label: 'Oldest' },
  { key: 'az', label: 'Name A-Z' },
  { key: 'za', label: 'Name Z-A' },
  { key: 'score', label: 'Highest Score' },
];

/* ============================================================
   Animation variants
   ============================================================ */

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.07, delayChildren: 0.1 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: [0.25, 1, 0.5, 1] },
  },
};

/* ============================================================
   AnimatedCounter — count-up using framer-motion animate()
   ============================================================ */

function AnimatedCounter({
  to,
  duration = 1.4,
  formatter,
}: {
  to: number;
  duration?: number;
  formatter: (v: number) => string;
}) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-30px' });

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration,
      ease: [0.25, 1, 0.5, 1],
      onUpdate(value) {
        setCount(value);
      },
    });
    return () => controls.stop();
  }, [to, duration, inView]);

  return <span ref={ref}>{formatter(count)}</span>;
}

/* ============================================================
   Toast
   ============================================================ */

interface ToastState {
  id: number;
  message: string;
  type: 'success' | 'info' | 'error';
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 2600);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const accent =
    toast.type === 'error'
      ? 'var(--smuggler-red)'
      : toast.type === 'info'
      ? 'var(--smuggler-blue)'
      : 'var(--smuggler-green)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 30, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 28 }}
      className="pointer-events-auto fixed bottom-6 right-6 z-[200] flex items-center gap-3 rounded-xl border px-4 py-3 shadow-2xl"
      style={{
        backgroundColor: 'var(--smuggler-bg-panel)',
        borderColor: 'var(--smuggler-border)',
        minWidth: 240,
        maxWidth: 360,
      }}
    >
      <span
        className="flex h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: accent, boxShadow: `0 0 10px ${accent}` }}
      />
      <span
        className="text-sm font-medium"
        style={{ color: 'var(--smuggler-text)' }}
      >
        {toast.message}
      </span>
      <button
        type="button"
        onClick={onDismiss}
        className="ml-auto shrink-0 rounded p-0.5 transition-colors"
        style={{ color: 'var(--smuggler-text-muted)' }}
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

/* ============================================================
   TypeBadge — colored chip with emoji icon + type label
   ============================================================ */

function TypeBadge({ type }: { type: LibraryItemType }) {
  const c = TYPE_COLORS[type] ?? TYPE_COLORS.hook;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wide"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <span aria-hidden style={{ fontSize: '0.8rem', lineHeight: 1 }}>
        {LIBRARY_TYPE_ICONS[type]}
      </span>
      {LIBRARY_TYPE_LABELS[type]}
    </span>
  );
}

/* ============================================================
   Sort Dropdown
   ============================================================ */

function SortDropdown({
  value,
  onChange,
}: {
  value: SortKey;
  onChange: (k: SortKey) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = SORT_OPTIONS.find((o) => o.key === value);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors"
        style={{
          backgroundColor: 'var(--smuggler-bg-panel)',
          borderColor: 'var(--smuggler-border)',
          color: 'var(--smuggler-text)',
        }}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <ArrowUpDown size={14} style={{ color: 'var(--smuggler-gold)' }} />
        <span className="hidden sm:inline">Sort:</span>
        <span>{current?.label}</span>
        <ChevronDown
          size={12}
          className="transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : 'none' }}
        />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
              aria-hidden
            />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.96 }}
              transition={{ duration: 0.18 }}
              className="absolute right-0 z-50 mt-2 min-w-[160px] overflow-hidden rounded-xl border shadow-2xl"
              style={{
                backgroundColor: 'var(--smuggler-bg-panel)',
                borderColor: 'var(--smuggler-border)',
              }}
            >
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => {
                    onChange(opt.key);
                    setOpen(false);
                  }}
                  className="flex w-full items-center justify-between px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--smuggler-panel-hover)]"
                  style={{
                    color:
                      opt.key === value
                        ? 'var(--smuggler-gold)'
                        : 'var(--smuggler-text)',
                  }}
                >
                  {opt.label}
                  {opt.key === value && <Check size={12} />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ============================================================
   CreateFolderDialog
   ============================================================ */

function CreateFolderDialog({
  open,
  onOpenChange,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreate: (name: string, color: string) => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState(FOLDER_COLORS[3]);

  const handleOpenChange = (v: boolean) => {
    if (v) {
      // Reset form state each time the dialog opens.
      setName('');
      setColor(FOLDER_COLORS[3]);
    }
    onOpenChange(v);
  };

  const submit = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    onCreate(trimmed, color);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="overflow-hidden rounded-2xl border p-0"
        style={{
          backgroundColor: 'var(--smuggler-bg-panel)',
          borderColor: 'var(--smuggler-border)',
          maxWidth: 440,
        }}
      >
        <div className="smuggler-paper-grain relative p-6">
          <div className="relative z-10">
            <div className="mb-1 flex items-center gap-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-lg"
                style={{
                  backgroundColor: 'rgba(192,152,88,0.15)',
                  color: 'var(--smuggler-gold)',
                }}
              >
                <FolderPlus size={18} />
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.4rem',
                  fontWeight: 700,
                  color: 'var(--smuggler-text)',
                }}
              >
                Create New Folder
              </h3>
            </div>
            <p
              className="mb-5 text-sm"
              style={{ color: 'var(--smuggler-text-secondary)' }}
            >
              Organize your content into collections for quick access.
            </p>

            <label
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--smuggler-text-muted)' }}
            >
              Folder Name
            </label>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit();
              }}
              placeholder="e.g. Q4 YouTube Content"
              className="smuggler-input-premium mb-5 w-full rounded-lg px-3.5 py-2.5 text-sm outline-none"
              style={{ color: 'var(--smuggler-text)' }}
            />

            <label
              className="mb-2 block text-xs font-semibold uppercase tracking-wide"
              style={{ color: 'var(--smuggler-text-muted)' }}
            >
              Color
            </label>
            <div className="mb-6 flex flex-wrap gap-2.5">
              {FOLDER_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="relative flex h-9 w-9 items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: c,
                    border:
                      color === c
                        ? '2px solid var(--smuggler-text)'
                        : '2px solid transparent',
                    boxShadow:
                      color === c ? `0 0 0 2px var(--smuggler-bg-panel)` : 'none',
                  }}
                  aria-label={`Select color ${c}`}
                >
                  {color === c && <Check size={14} className="text-white" />}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="smuggler-cta-outline !px-4 !py-2 !text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={!name.trim()}
                className="smuggler-cta-premium !px-4 !py-2 !text-xs disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FolderPlus size={14} />
                Create Folder
              </button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   ItemDetailModal
   ============================================================ */

function ItemDetailModal({
  item,
  folders,
  onClose,
  onUpdate,
  onToggleFavorite,
  onTogglePin,
  onDuplicate,
  onDelete,
  onRestore,
  onPermanentDelete,
  onCopy,
  onDownload,
  showToast,
}: {
  item: LibraryItem | null;
  folders: LibraryFolder[];
  onClose: () => void;
  onUpdate: (id: string, updates: Partial<LibraryItem>) => void;
  onToggleFavorite: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (id: string) => void;
  onCopy: (item: LibraryItem) => void;
  onDownload: (item: LibraryItem) => void;
  showToast: (message: string, type?: ToastState['type']) => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');

  if (!item) return null;

  const isTrash = item.status === 'trash';
  const folder = folders.find((f) => f.id === item.folderId);

  const startEdit = () => {
    setTitleDraft(item.title);
    setEditingTitle(true);
  };

  const saveTitle = () => {
    const trimmed = titleDraft.trim();
    if (trimmed && trimmed !== item.title) {
      onUpdate(item.id, { title: trimmed });
      showToast('Title updated', 'success');
    }
    setEditingTitle(false);
  };

  return (
    <Dialog open={!!item} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="overflow-hidden rounded-2xl border p-0"
        style={{
          backgroundColor: 'var(--smuggler-bg-panel)',
          borderColor: 'var(--smuggler-border)',
          maxWidth: 720,
        }}
      >
        <div className="smuggler-paper-grain relative max-h-[88vh] overflow-y-auto">
          {/* Header band */}
          <div
            className="relative z-10 px-6 pt-6 pb-4"
            style={{
              borderBottom: '1px solid var(--smuggler-border)',
              background:
                'linear-gradient(180deg, rgba(192,152,88,0.06) 0%, transparent 100%)',
            }}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <TypeBadge type={item.type} />
              <DialogClose
                className="flex h-8 w-8 items-center justify-center rounded-full transition-colors"
                style={{
                  color: 'var(--smuggler-text-muted)',
                  backgroundColor: 'transparent',
                }}
                aria-label="Close"
              >
                <X size={18} />
              </DialogClose>
            </div>

            {editingTitle ? (
              <div className="flex items-center gap-2">
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveTitle();
                    if (e.key === 'Escape') setEditingTitle(false);
                  }}
                  className="smuggler-input-premium w-full rounded-lg px-3 py-2 text-lg font-bold outline-none"
                  style={{
                    color: 'var(--smuggler-text)',
                    fontFamily: 'var(--font-heading)',
                  }}
                />
                <button
                  type="button"
                  onClick={saveTitle}
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{
                    backgroundColor: 'var(--smuggler-green)',
                    color: '#fff',
                  }}
                  aria-label="Save title"
                >
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={startEdit}
                className="group flex w-full items-center gap-2 text-left"
              >
                <h2
                  className="flex-1"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '1.6rem',
                    fontWeight: 700,
                    color: 'var(--smuggler-text)',
                    lineHeight: 1.2,
                  }}
                >
                  {item.title}
                </h2>
                <Pencil
                  size={14}
                  className="opacity-0 transition-opacity group-hover:opacity-100"
                  style={{ color: 'var(--smuggler-text-muted)' }}
                />
              </button>
            )}

            {/* Meta row */}
            <div
              className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs"
              style={{ color: 'var(--smuggler-text-muted)' }}
            >
              <span className="flex items-center gap-1.5">
                <Clock size={12} />
                Created {formatTimeAgo(item.createdAt)}
              </span>
              <span className="flex items-center gap-1.5">
                <Pencil size={12} />
                Edited {formatTimeAgo(item.updatedAt)}
              </span>
              <span className="rounded px-1.5 py-0.5 font-semibold uppercase tracking-wide"
                style={{
                  backgroundColor: 'rgba(192,152,88,0.1)',
                  color: 'var(--smuggler-gold)',
                }}
              >
                {item.toolName}
              </span>
              <span
                className="rounded px-1.5 py-0.5 font-medium"
                style={{
                  backgroundColor: 'var(--smuggler-panel-hover)',
                  color: 'var(--smuggler-text-secondary)',
                }}
              >
                {item.category}
              </span>
              {folder && (
                <span className="flex items-center gap-1.5">
                  <Folder size={12} style={{ color: folder.color }} />
                  {folder.name}
                </span>
              )}
              {typeof item.score === 'number' && (
                <span
                  className="rounded px-1.5 py-0.5 font-bold"
                  style={{
                    backgroundColor: 'rgba(192,152,88,0.15)',
                    color: 'var(--smuggler-gold)',
                  }}
                >
                  ★ {item.score}
                </span>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 px-6 py-5">
            <div
              className="mb-5 whitespace-pre-wrap rounded-lg p-4 text-sm leading-relaxed"
              style={{
                backgroundColor: 'var(--smuggler-bg)',
                border: '1px solid var(--smuggler-border)',
                color: 'var(--smuggler-text)',
                fontFamily: 'var(--font-serif)',
                maxHeight: 360,
                overflowY: 'auto',
              }}
            >
              {item.content}
            </div>

            {item.tags.length > 0 && (
              <div className="mb-5 flex flex-wrap gap-1.5">
                {item.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-md px-2 py-0.5 text-xs font-medium"
                    style={{
                      backgroundColor: 'var(--smuggler-panel-hover)',
                      color: 'var(--smuggler-text-secondary)',
                    }}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}

            {/* Action row */}
            <div className="flex flex-wrap items-center gap-2">
              {isTrash ? (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      onRestore(item.id);
                      showToast('Item restored', 'success');
                      onClose();
                    }}
                    className="smuggler-cta-premium !px-4 !py-2 !text-xs"
                  >
                    <RotateCcw size={14} />
                    Restore
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onPermanentDelete(item.id);
                      showToast('Item permanently deleted', 'error');
                      onClose();
                    }}
                    className="smuggler-cta-outline !px-4 !py-2 !text-xs"
                    style={{ color: 'var(--smuggler-red)', borderColor: 'var(--smuggler-red)' }}
                  >
                    <Trash2 size={14} />
                    Delete Forever
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => onCopy(item)}
                    className="smuggler-cta-outline !px-3.5 !py-2 !text-xs"
                  >
                    <Copy size={14} />
                    Copy
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownload(item)}
                    className="smuggler-cta-outline !px-3.5 !py-2 !text-xs"
                  >
                    <Download size={14} />
                    Download
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicate(item.id);
                      showToast('Item duplicated', 'success');
                      onClose();
                    }}
                    className="smuggler-cta-outline !px-3.5 !py-2 !text-xs"
                  >
                    <Copy size={14} />
                    Duplicate
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onToggleFavorite(item.id);
                      showToast(
                        item.favorite ? 'Removed from favorites' : 'Added to favorites',
                        'success',
                      );
                    }}
                    className="smuggler-cta-outline !px-3.5 !py-2 !text-xs"
                    style={
                      item.favorite
                        ? {
                            color: 'var(--smuggler-gold)',
                            borderColor: 'var(--smuggler-gold)',
                          }
                        : undefined
                    }
                  >
                    <Star size={14} fill={item.favorite ? 'currentColor' : 'none'} />
                    {item.favorite ? 'Favorited' : 'Favorite'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onTogglePin(item.id);
                      showToast(
                        item.pinned ? 'Unpinned' : 'Pinned to top',
                        'success',
                      );
                    }}
                    className="smuggler-cta-outline !px-3.5 !py-2 !text-xs"
                    style={
                      item.pinned
                        ? {
                            color: 'var(--smuggler-gold)',
                            borderColor: 'var(--smuggler-gold)',
                          }
                        : undefined
                    }
                  >
                    <Pin size={14} fill={item.pinned ? 'currentColor' : 'none'} />
                    {item.pinned ? 'Pinned' : 'Pin'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(item.id);
                      showToast('Moved to trash', 'info');
                      onClose();
                    }}
                    className="smuggler-cta-outline !px-3.5 !py-2 !text-xs"
                    style={{ color: 'var(--smuggler-red)', borderColor: 'var(--smuggler-red)' }}
                  >
                    <Trash2 size={14} />
                    Delete
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ============================================================
   FolderCard
   ============================================================ */

interface FolderCardProps {
  folder: LibraryFolder | { id: 'all'; name: string; color: string; updatedAt: number };
  count: number;
  active: boolean;
  onClick: () => void;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
}

function FolderCard({ folder, count, active, onClick, onRename, onDelete }: FolderCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [nameDraft, setNameDraft] = useState(folder.name);
  const isVirtual = folder.id === 'all';

  const commitRename = () => {
    const trimmed = nameDraft.trim();
    if (trimmed && trimmed !== folder.name && onRename) {
      onRename(trimmed);
    }
    setRenaming(false);
  };

  return (
    <motion.div
      variants={itemVariants}
      onClick={onClick}
      whileHover={{ y: -3 }}
      className="smuggler-hook-card relative cursor-pointer rounded-xl p-4"
      style={{
        borderColor: active ? 'var(--smuggler-gold)' : undefined,
        boxShadow: active ? '0 0 0 2px rgba(192,152,88,0.25)' : undefined,
        minWidth: 200,
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-lg"
            style={{
              backgroundColor: `${folder.color}22`,
              color: folder.color,
            }}
          >
            <Folder size={20} fill="currentColor" />
          </div>
          {renaming ? (
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setRenaming(false);
              }}
              onBlur={commitRename}
              className="w-full rounded border bg-transparent px-1 py-0.5 text-sm font-bold outline-none"
              style={{
                borderColor: 'var(--smuggler-gold)',
                color: 'var(--smuggler-text)',
              }}
            />
          ) : (
            <div className="min-w-0">
              <div
                className="truncate text-sm font-bold"
                style={{ color: 'var(--smuggler-text)' }}
              >
                {folder.name}
              </div>
              <div
                className="text-[0.7rem] font-medium"
                style={{ color: 'var(--smuggler-text-muted)' }}
              >
                {count} {count === 1 ? 'item' : 'items'}
              </div>
            </div>
          )}
        </div>

        {!isVirtual && !renaming && (
          <div className="relative">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setMenuOpen((v) => !v);
              }}
              className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-[var(--smuggler-panel-hover)]"
              style={{ color: 'var(--smuggler-text-muted)' }}
              aria-label="Folder options"
            >
              <MoreVertical size={14} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={(e) => {
                      e.stopPropagation();
                      setMenuOpen(false);
                    }}
                    aria-hidden
                  />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 z-50 mt-1 min-w-[140px] overflow-hidden rounded-lg border shadow-2xl"
                    style={{
                      backgroundColor: 'var(--smuggler-bg-panel)',
                      borderColor: 'var(--smuggler-border)',
                    }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setRenaming(true);
                        setMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--smuggler-panel-hover)]"
                      style={{ color: 'var(--smuggler-text)' }}
                    >
                      <Pencil size={12} /> Rename
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false);
                        onDelete?.();
                      }}
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--smuggler-panel-hover)]"
                      style={{ color: 'var(--smuggler-red)' }}
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        )}
      </div>

      <div
        className="mt-3 text-[0.7rem] font-medium"
        style={{ color: 'var(--smuggler-text-muted)' }}
      >
        Updated {formatTimeAgo(folder.updatedAt)}
      </div>
    </motion.div>
  );
}

/* ============================================================
   ContentCard — with 3D tilt + spotlight
   ============================================================ */

interface ContentCardProps {
  item: LibraryItem;
  view: ViewMode;
  selected: boolean;
  multiSelectActive: boolean;
  isTrashTab: boolean;
  folders: LibraryFolder[];
  onOpen: () => void;
  onToggleSelect: () => void;
  onToggleFavorite: () => void;
  onTogglePin: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onRestore: () => void;
  onPermanentDelete: () => void;
  onArchive: () => void;
  onRename: (newTitle: string) => void;
  onMove: (folderId: string | null) => void;
  onCopy: () => void;
  onDownload: () => void;
}

function ContentCard({
  item,
  view,
  selected,
  multiSelectActive,
  isTrashTab,
  folders,
  onOpen,
  onToggleSelect,
  onToggleFavorite,
  onTogglePin,
  onDuplicate,
  onDelete,
  onRestore,
  onPermanentDelete,
  onArchive,
  onRename,
  onMove,
  onCopy,
  onDownload,
}: ContentCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuView, setMenuView] = useState<'main' | 'move' | 'rename'>('main');
  const [renameDraft, setRenameDraft] = useState('');

  // 3D tilt + spotlight (only in grid view)
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springConfig = { damping: 25, stiffness: 300 };
  const smoothMouseX = useSpring(mouseX, springConfig);
  const smoothMouseY = useSpring(mouseY, springConfig);
  const rotateX = useTransform(smoothMouseY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(smoothMouseX, [-0.5, 0.5], [-6, 6]);
  const spotX = useTransform(smoothMouseX, (v) => (v + 0.5) * 100);
  const spotY = useTransform(smoothMouseY, (v) => (v + 0.5) * 100);
  const spotlight = useMotionTemplate`radial-gradient(360px circle at ${spotX}% ${spotY}%, rgba(192,152,88,0.10), transparent 45%)`;

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (view !== 'grid' || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };
  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const c = TYPE_COLORS[item.type] ?? TYPE_COLORS.hook;
  const isList = view === 'list';

  const closeMenu = () => {
    setMenuOpen(false);
    setMenuView('main');
  };

  const startRename = () => {
    setRenameDraft(item.title);
    setMenuView('rename');
  };

  const commitRename = () => {
    const trimmed = renameDraft.trim();
    if (trimmed && trimmed !== item.title) onRename(trimmed);
    closeMenu();
  };

  const menuItems = isTrashTab
    ? [
        {
          icon: RotateCcw,
          label: 'Restore',
          onClick: () => {
            onRestore();
            closeMenu();
          },
        },
        {
          icon: Trash2,
          label: 'Delete Forever',
          danger: true,
          onClick: () => {
            onPermanentDelete();
            closeMenu();
          },
        },
      ]
    : [
        {
          icon: FolderInput,
          label: 'Open',
          onClick: () => {
            onOpen();
            closeMenu();
          },
        },
        {
          icon: Copy,
          label: 'Duplicate',
          onClick: () => {
            onDuplicate();
            closeMenu();
          },
        },
        {
          icon: Pencil,
          label: 'Rename',
          onClick: () => {
            startRename();
          },
        },
        {
          icon: FolderInput,
          label: 'Move to Folder',
          hasCaret: true,
          onClick: () => setMenuView('move'),
        },
        {
          icon: Star,
          label: item.favorite ? 'Unfavorite' : 'Favorite',
          onClick: () => {
            onToggleFavorite();
            closeMenu();
          },
        },
        {
          icon: Pin,
          label: item.pinned ? 'Unpin' : 'Pin',
          onClick: () => {
            onTogglePin();
            closeMenu();
          },
        },
        {
          icon: Archive,
          label: 'Archive',
          onClick: () => {
            onArchive();
            closeMenu();
          },
        },
        {
          icon: Copy,
          label: 'Copy Content',
          onClick: () => {
            onCopy();
            closeMenu();
          },
        },
        {
          icon: Download,
          label: 'Download',
          onClick: () => {
            onDownload();
            closeMenu();
          },
        },
        {
          icon: Trash2,
          label: 'Delete',
          danger: true,
          onClick: () => {
            onDelete();
            closeMenu();
          },
        },
      ];

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      variants={itemVariants}
      whileHover={isList ? { y: -2 } : { y: -4 }}
      style={
        isList
          ? undefined
          : {
              rotateX,
              rotateY,
              transformPerspective: 1200,
            }
      }
      className={`group smuggler-hook-card relative cursor-pointer overflow-hidden rounded-xl ${
        isList ? 'flex items-center gap-4 p-3.5' : 'flex flex-col p-4'
      }`}
      onClick={onOpen}
    >
      {/* Spotlight overlay (grid only) */}
      {!isList && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-0 rounded-xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          style={{ background: spotlight }}
        />
      )}
      {/* Border glow on hover */}
      <div className="pointer-events-none absolute inset-0 z-0 rounded-xl border border-transparent transition-colors duration-300 group-hover:border-[var(--smuggler-gold)]/40" />

      {/* Multi-select checkbox */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggleSelect();
        }}
        className={`absolute left-2 top-2 z-30 flex h-5 w-5 items-center justify-center rounded border transition-all ${
          selected || multiSelectActive
            ? 'opacity-100'
            : 'opacity-0 group-hover:opacity-100'
        }`}
        style={{
          backgroundColor: selected ? 'var(--smuggler-green)' : 'var(--smuggler-bg-panel)',
          borderColor: selected ? 'var(--smuggler-green)' : 'var(--smuggler-border)',
          color: '#fff',
        }}
        aria-label={selected ? 'Deselect' : 'Select'}
      >
        {selected && <Check size={12} strokeWidth={3} />}
      </button>

      {/* Pin indicator */}
      {item.pinned && (
        <div
          className={`absolute z-20 ${
            isList ? 'right-2 top-2' : 'right-2 top-2'
          } flex h-6 w-6 items-center justify-center rounded-full`}
          style={{
            backgroundColor: 'rgba(192,152,88,0.18)',
            color: 'var(--smuggler-gold)',
          }}
          title="Pinned"
        >
          <Pin size={11} fill="currentColor" />
        </div>
      )}

      <div className={`relative z-10 ${isList ? 'flex-1 min-w-0' : 'flex flex-1 flex-col'}`}>
        {/* Top row */}
        <div className={`flex items-start justify-between gap-2 ${isList ? 'mb-0' : 'mb-2.5'}`}>
          <div className={`flex items-center gap-2 ${isList ? 'flex-shrink-0' : ''}`}>
            <TypeBadge type={item.type} />
            {!isTrashTab && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleFavorite();
                }}
                className="flex h-6 w-6 items-center justify-center rounded transition-colors"
                aria-label={item.favorite ? 'Remove favorite' : 'Add favorite'}
              >
                <Star
                  size={14}
                  fill={item.favorite ? 'var(--smuggler-gold)' : 'none'}
                  className={
                    item.favorite
                      ? ''
                      : 'opacity-50 group-hover:opacity-100'
                  }
                  style={{
                    color: item.favorite ? 'var(--smuggler-gold)' : 'var(--smuggler-text-muted)',
                  }}
                />
              </button>
            )}
          </div>

          {/* 3-dot menu */}
          <div className="relative flex-shrink-0" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              onClick={() => {
                setMenuOpen((v) => !v);
                setMenuView('main');
              }}
              className="flex h-6 w-6 items-center justify-center rounded transition-colors hover:bg-[var(--smuggler-panel-hover)]"
              style={{ color: 'var(--smuggler-text-muted)' }}
              aria-label="Item options"
            >
              <MoreVertical size={14} />
            </button>
            <AnimatePresence>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={closeMenu} aria-hidden />
                  <motion.div
                    initial={{ opacity: 0, y: -6, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.96 }}
                    transition={{ duration: 0.16 }}
                    className="absolute right-0 z-50 mt-1 min-w-[180px] overflow-hidden rounded-lg border shadow-2xl"
                    style={{
                      backgroundColor: 'var(--smuggler-bg-panel)',
                      borderColor: 'var(--smuggler-border)',
                    }}
                  >
                    {menuView === 'main' &&
                      menuItems.map((mi, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={mi.onClick}
                          className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--smuggler-panel-hover)]"
                          style={{
                            color: mi.danger ? 'var(--smuggler-red)' : 'var(--smuggler-text)',
                          }}
                        >
                          <mi.icon size={13} />
                          <span className="flex-1">{mi.label}</span>
                          {mi.hasCaret && <ChevronDown size={10} className="-rotate-90" />}
                        </button>
                      ))}

                    {menuView === 'move' && (
                      <>
                        <div
                          className="flex items-center gap-2 border-b px-3 py-2 text-xs font-bold uppercase tracking-wide"
                          style={{
                            borderColor: 'var(--smuggler-border)',
                            color: 'var(--smuggler-text-muted)',
                          }}
                        >
                          <button
                            type="button"
                            onClick={() => setMenuView('main')}
                            className="flex items-center gap-1 transition-colors hover:text-[var(--smuggler-gold)]"
                          >
                            <ChevronDown size={12} className="rotate-90" />
                            Back
                          </button>
                        </div>
                        <div className="max-h-56 overflow-y-auto">
                          <button
                            type="button"
                            onClick={() => {
                              onMove(null);
                              closeMenu();
                            }}
                            className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--smuggler-panel-hover)]"
                            style={{
                              color:
                                item.folderId === null
                                  ? 'var(--smuggler-gold)'
                                  : 'var(--smuggler-text)',
                            }}
                          >
                            <Folder size={13} style={{ color: 'var(--smuggler-text-muted)' }} />
                            Unsorted
                            {item.folderId === null && <Check size={11} className="ml-auto" />}
                          </button>
                          {folders.map((f) => (
                            <button
                              key={f.id}
                              type="button"
                              onClick={() => {
                                onMove(f.id);
                                closeMenu();
                              }}
                              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--smuggler-panel-hover)]"
                              style={{
                                color:
                                  item.folderId === f.id
                                    ? 'var(--smuggler-gold)'
                                    : 'var(--smuggler-text)',
                              }}
                            >
                              <Folder size={13} style={{ color: f.color }} />
                              <span className="flex-1 truncate">{f.name}</span>
                              {item.folderId === f.id && <Check size={11} />}
                            </button>
                          ))}
                          {folders.length === 0 && (
                            <div
                              className="px-3 py-3 text-[0.7rem] italic"
                              style={{ color: 'var(--smuggler-text-muted)' }}
                            >
                              No folders yet
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {menuView === 'rename' && (
                      <div className="p-2">
                        <div
                          className="mb-2 flex items-center gap-2 px-1 text-xs font-bold uppercase tracking-wide"
                          style={{ color: 'var(--smuggler-text-muted)' }}
                        >
                          Rename Item
                        </div>
                        <input
                          autoFocus
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') commitRename();
                            if (e.key === 'Escape') closeMenu();
                          }}
                          className="smuggler-input-premium mb-2 w-full rounded px-2 py-1.5 text-xs outline-none"
                          style={{ color: 'var(--smuggler-text)' }}
                        />
                        <div className="flex gap-1.5">
                          <button
                            type="button"
                            onClick={closeMenu}
                            className="flex-1 rounded border px-2 py-1 text-xs font-semibold transition-colors hover:bg-[var(--smuggler-panel-hover)]"
                            style={{
                              borderColor: 'var(--smuggler-border)',
                              color: 'var(--smuggler-text-secondary)',
                            }}
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={commitRename}
                            className="flex-1 rounded px-2 py-1 text-xs font-semibold text-white"
                            style={{ backgroundColor: 'var(--smuggler-green)' }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Title */}
        <h3
          className={`mb-1 ${isList ? 'line-clamp-1' : 'line-clamp-2'} font-bold`}
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: isList ? '0.95rem' : '1rem',
            color: 'var(--smuggler-text)',
            lineHeight: 1.3,
          }}
        >
          {item.title}
        </h3>

        {/* Preview */}
        <p
          className={`mb-3 ${isList ? 'line-clamp-1 hidden md:line-clamp-1' : 'line-clamp-2'} text-xs leading-relaxed`}
          style={{ color: 'var(--smuggler-text-secondary)' }}
        >
          {item.content}
        </p>

        {/* Footer */}
        <div
          className={`mt-auto flex items-center gap-2 text-[0.7rem] ${
            isList ? 'flex-shrink-0' : 'flex-wrap'
          }`}
          style={{ color: 'var(--smuggler-text-muted)' }}
        >
          <span className="truncate font-medium" style={{ maxWidth: isList ? 140 : 120 }}>
            {item.toolName}
          </span>
          <span style={{ color: 'var(--smuggler-border)' }}>·</span>
          <span className="truncate">{item.category}</span>
          <span style={{ color: 'var(--smuggler-border)' }}>·</span>
          <span className="whitespace-nowrap">{formatTimeAgo(item.updatedAt)}</span>
          {typeof item.score === 'number' && (
            <span
              className="ml-auto rounded px-1.5 py-0.5 font-bold"
              style={{
                backgroundColor: 'rgba(192,152,88,0.15)',
                color: 'var(--smuggler-gold)',
              }}
            >
              ★ {item.score}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
}

/* ============================================================
   Empty State — radar illustration
   ============================================================ */

function EmptyState({
  variant,
  onAction,
  actionLabel,
  secondaryAction,
  secondaryLabel,
}: {
  variant: 'no-results' | 'trash-empty' | 'first-visit';
  onAction?: () => void;
  actionLabel?: string;
  secondaryAction?: () => void;
  secondaryLabel?: string;
}) {
  const title =
    variant === 'no-results'
      ? 'No items found'
      : variant === 'trash-empty'
      ? 'Trash is empty'
      : 'Welcome to your Library';

  const desc =
    variant === 'no-results'
      ? 'Try a different search term, filter, or folder to find what you’re looking for.'
      : variant === 'trash-empty'
      ? 'Deleted items will appear here. Nothing to clean up right now — nice and tidy.'
      : 'Your intelligence vault is empty. Start by generating content with our creator tools, then come back to organize and reuse it.';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, ease: [0.25, 1, 0.5, 1] }}
      className="relative mx-auto flex max-w-md flex-col items-center px-6 py-16 text-center"
    >
      <div className="smuggler-empty-glow" />

      {/* Radar illustration */}
      <div className="relative mb-6 h-32 w-32">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear' }}
          className="absolute inset-0"
        >
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background:
                'conic-gradient(from 0deg, transparent 0deg, rgba(192,152,88,0.35) 60deg, transparent 90deg)',
            }}
          />
        </motion.div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="absolute rounded-full"
            style={{
              inset: `${i * 14}px`,
              border: '1px solid rgba(192,152,88,0.25)',
            }}
          />
        ))}
        <div
          className="absolute left-1/2 top-0 h-full"
          style={{
            width: 1,
            backgroundColor: 'rgba(192,152,88,0.18)',
            transform: 'translateX(-50%)',
          }}
        />
        <div
          className="absolute top-1/2 w-full"
          style={{
            height: 1,
            backgroundColor: 'rgba(192,152,88,0.18)',
            transform: 'translateY(-50%)',
          }}
        />
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Crosshair size={22} style={{ color: 'var(--smuggler-gold)' }} />
        </div>
        {/* Floating particles */}
        {[
          { top: '20%', left: '30%', delay: 0 },
          { top: '60%', left: '70%', delay: 1.3 },
          { top: '75%', left: '25%', delay: 2.5 },
        ].map((p, i) => (
          <motion.span
            key={i}
            className="absolute h-1.5 w-1.5 rounded-full"
            style={{
              top: p.top,
              left: p.left,
              backgroundColor: 'var(--smuggler-gold)',
            }}
            animate={{ opacity: [0.2, 1, 0.2], scale: [1, 1.4, 1] }}
            transition={{ duration: 2.5, repeat: Infinity, delay: p.delay }}
          />
        ))}
      </div>

      <h3
        className="mb-2"
        style={{
          fontFamily: 'var(--font-heading)',
          fontSize: '1.5rem',
          fontWeight: 700,
          color: 'var(--smuggler-text)',
        }}
      >
        {title}
      </h3>
      <p
        className="mb-6 text-sm leading-relaxed"
        style={{ color: 'var(--smuggler-text-secondary)' }}
      >
        {desc}
      </p>
      {onAction && actionLabel && (
        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={onAction}
            className="smuggler-cta-gold !px-5 !py-2.5 !text-sm"
          >
            <Sparkles size={14} />
            {actionLabel}
          </button>
          {secondaryAction && secondaryLabel && (
            <button
              type="button"
              onClick={secondaryAction}
              className="smuggler-cta-outline !px-5 !py-2.5 !text-sm"
            >
              {secondaryLabel}
            </button>
          )}
        </div>
      )}
    </motion.div>
  );
}

/* ============================================================
   MAIN — LibraryView
   ============================================================ */

export function LibraryView({ onNavigate, onSelectTool }: LibraryViewProps) {
  // Store
  const items = useLibraryStore((s) => s.items);
  const folders = useLibraryStore((s) => s.folders);
  const activity = useLibraryStore((s) => s.activity);
  const hydrated = useLibraryStore((s) => s.hydrated);
  const loading = useLibraryStore((s) => s.loading);
  const storeError = useLibraryStore((s) => s.error);
  const hydrate = useLibraryStore((s) => s.hydrate);

  const billing = useUserStore((s) => s.billing);

  const createFolder = useLibraryStore((s) => s.createFolder);
  const renameFolder = useLibraryStore((s) => s.renameFolder);
  const deleteFolder = useLibraryStore((s) => s.deleteFolder);
  const updateItem = useLibraryStore((s) => s.updateItem);
  const deleteItem = useLibraryStore((s) => s.deleteItem);
  const permanentDelete = useLibraryStore((s) => s.permanentDelete);
  const restoreItem = useLibraryStore((s) => s.restoreItem);
  const duplicateItem = useLibraryStore((s) => s.duplicateItem);
  const moveItemToFolder = useLibraryStore((s) => s.moveItemToFolder);
  const toggleFavorite = useLibraryStore((s) => s.toggleFavorite);
  const togglePin = useLibraryStore((s) => s.togglePin);
  const bulkDelete = useLibraryStore((s) => s.bulkDelete);
  const bulkMove = useLibraryStore((s) => s.bulkMove);
  const bulkArchive = useLibraryStore((s) => s.bulkArchive);
  const clearTrash = useLibraryStore((s) => s.clearTrash);

  // Hydrate on mount
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // UI state
  const [tab, setTab] = useState<TabKey>('all');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<SortKey>('recent');
  const [view, setView] = useState<ViewMode>('grid');
  const [folderFilter, setFolderFilter] = useState<FolderFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailItemId, setDetailItemId] = useState<string | null>(null);
  const [createFolderOpen, setCreateFolderOpen] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);

  // Toast helper
  const showToast = useCallback(
    (message: string, type: ToastState['type'] = 'success') => {
      setToast({ id: Date.now(), message, type });
    },
    [],
  );

  /* ----- Derived: counts ----- */
  const activeItems = useMemo(
    () => items.filter((i) => i.status !== 'trash'),
    [items],
  );
  const favoriteCount = useMemo(
    () => items.filter((i) => i.favorite && i.status !== 'trash').length,
    [items],
  );
  const templateCount = useMemo(
    () => items.filter((i) => i.type === 'template' && i.status !== 'trash').length,
    [items],
  );
  const pinnedCount = useMemo(
    () => items.filter((i) => i.pinned && i.status !== 'trash').length,
    [items],
  );
  const trashCount = useMemo(
    () => items.filter((i) => i.status === 'trash').length,
    [items],
  );

  const storageBytes = items.length * 2048;
  const storageLabel =
    storageBytes < 1024
      ? `${storageBytes} B`
      : storageBytes < 1024 * 1024
      ? `${(storageBytes / 1024).toFixed(1)} KB`
      : `${(storageBytes / (1024 * 1024)).toFixed(2)} MB`;

  /* ----- Derived: filtered + sorted items ----- */
  const visibleItems = useMemo(() => {
    let list = items.slice();

    // Tab filter
    if (tab === 'all') {
      list = list.filter((i) => i.status === 'active' || i.status === 'draft' || i.status === 'archived');
    } else if (tab === 'generated') {
      const genTypes: LibraryItemType[] = [
        'hook',
        'title',
        'script',
        'caption',
        'thumbnail',
        'ai-output',
        'repurposed',
      ];
      list = list.filter((i) => genTypes.includes(i.type) && i.status !== 'trash');
    } else if (tab === 'templates') {
      list = list.filter((i) => i.type === 'template' && i.status !== 'trash');
    } else if (tab === 'brand-assets') {
      list = list.filter((i) => i.type === 'brand-asset' && i.status !== 'trash');
    } else if (tab === 'favorites') {
      list = list.filter((i) => i.favorite && i.status !== 'trash');
    } else if (tab === 'trash') {
      list = list.filter((i) => i.status === 'trash');
    }

    // Folder filter
    if (folderFilter !== 'all' && tab !== 'trash') {
      if (folderFilter === 'unsorted') {
        list = list.filter((i) => i.folderId === null);
      } else {
        list = list.filter((i) => i.folderId === folderFilter);
      }
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((i) => {
        return (
          i.title.toLowerCase().includes(q) ||
          i.content.toLowerCase().includes(q) ||
          i.toolName.toLowerCase().includes(q) ||
          i.tags.some((t) => t.toLowerCase().includes(q))
        );
      });
    }

    // Sort
    list.sort((a, b) => {
      if (sort === 'recent') return b.updatedAt - a.updatedAt;
      if (sort === 'oldest') return a.createdAt - b.createdAt;
      if (sort === 'az') return a.title.localeCompare(b.title);
      if (sort === 'za') return b.title.localeCompare(a.title);
      if (sort === 'score') return (b.score ?? 0) - (a.score ?? 0);
      return 0;
    });

    // Pin-first ordering (except in trash)
    if (tab !== 'trash') {
      list.sort((a, b) => Number(b.pinned) - Number(a.pinned));
    }

    return list;
  }, [items, tab, folderFilter, search, sort]);

  /* ----- Tab counts ----- */
  const tabCounts = useMemo(() => {
    const genTypes: LibraryItemType[] = [
      'hook',
      'title',
      'script',
      'caption',
      'thumbnail',
      'ai-output',
      'repurposed',
    ];
    return {
      all: items.filter((i) => i.status !== 'trash').length,
      generated: items.filter((i) => genTypes.includes(i.type) && i.status !== 'trash').length,
      templates: items.filter((i) => i.type === 'template' && i.status !== 'trash').length,
      'brand-assets': items.filter((i) => i.type === 'brand-asset' && i.status !== 'trash').length,
      favorites: items.filter((i) => i.favorite && i.status !== 'trash').length,
      trash: trashCount,
    } as Record<TabKey, number>;
  }, [items, trashCount]);

  /* ----- Detail item ----- */
  const detailItem = useMemo(
    () => items.find((i) => i.id === detailItemId) ?? null,
    [items, detailItemId],
  );

  /* ----- Multi-select ----- */
  const multiSelectActive = selectedIds.size > 0;

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    bulkDelete(ids);
    showToast(`${ids.length} item${ids.length === 1 ? '' : 's'} moved to trash`, 'info');
    clearSelection();
  };

  const handleBulkArchive = () => {
    const ids = Array.from(selectedIds);
    bulkArchive(ids);
    showToast(`${ids.length} item${ids.length === 1 ? '' : 's'} archived`, 'success');
    clearSelection();
  };

  const handleBulkMove = (folderId: string | null) => {
    const ids = Array.from(selectedIds);
    bulkMove(ids, folderId);
    const target = folders.find((f) => f.id === folderId);
    showToast(
      `${ids.length} item${ids.length === 1 ? '' : 's'} moved to ${target ? target.name : 'Unsorted'}`,
      'success',
    );
    setBulkMoveOpen(false);
    clearSelection();
  };

  /* ----- Item actions ----- */
  const handleCopy = (item: LibraryItem) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(item.content)
        .then(() => showToast('Copied to clipboard', 'success'))
        .catch(() => showToast('Copy failed', 'error'));
    } else {
      showToast('Clipboard unavailable', 'error');
    }
  };

  const handleDownload = (item: LibraryItem) => {
    try {
      const blob = new Blob([`${item.title}\n\n${item.content}`], {
        type: 'text/plain;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${item.title.replace(/[^a-z0-9]/gi, '_').slice(0, 60) || 'item'}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Downloaded', 'success');
    } catch {
      showToast('Download failed', 'error');
    }
  };

  const handleCreateFolder = (name: string, color: string) => {
    createFolder(name, color);
    showToast('Folder created', 'success');
  };

  const handleDeleteFolder = (id: string) => {
    deleteFolder(id);
    if (folderFilter === id) setFolderFilter('all');
    showToast('Folder deleted', 'info');
  };

  const handleRenameFolder = (id: string, name: string) => {
    renameFolder(id, name);
    showToast('Folder renamed', 'success');
  };

  /* ----- Empty state variant ----- */
  const emptyVariant: 'no-results' | 'trash-empty' | 'first-visit' | null = useMemo(() => {
    if (!hydrated) return null;
    if (items.length === 0) return 'first-visit';
    if (tab === 'trash' && trashCount === 0) return 'trash-empty';
    if (visibleItems.length === 0) return 'no-results';
    return null;
  }, [hydrated, items.length, tab, trashCount, visibleItems.length]);

  /* ----- Overview stat cards ----- */
  const stats = useMemo(
    () => [
      {
        icon: Folder,
        iconBg: 'rgba(75,107,74,0.16)',
        iconColor: '#4C6B4A',
        label: 'Saved Items',
        value: activeItems.length,
        formatter: (v: number) => Math.round(v).toString(),
      },
      {
        icon: FolderPlus,
        iconBg: 'rgba(192,152,88,0.16)',
        iconColor: '#C09858',
        label: 'Folders',
        value: folders.length,
        formatter: (v: number) => Math.round(v).toString(),
      },
      {
        icon: Star,
        iconBg: 'rgba(225,48,108,0.16)',
        iconColor: '#E1306C',
        label: 'Favorites',
        value: favoriteCount,
        formatter: (v: number) => Math.round(v).toString(),
      },
      {
        icon: Sparkles,
        iconBg: 'rgba(98,75,139,0.16)',
        iconColor: '#624B8B',
        label: 'Templates',
        value: templateCount,
        formatter: (v: number) => Math.round(v).toString(),
      },
      {
        icon: Pin,
        iconBg: 'rgba(184,123,62,0.16)',
        iconColor: '#B87B3E',
        label: 'Pinned',
        value: pinnedCount,
        formatter: (v: number) => Math.round(v).toString(),
      },
      {
        icon: Archive,
        iconBg: 'rgba(60,90,120,0.16)',
        iconColor: '#3B648C',
        label: 'Storage Used',
        value: 0, // replaced by custom render below
        formatter: () => storageLabel,
      },
    ],
    [
      activeItems.length,
      folders.length,
      favoriteCount,
      templateCount,
      pinnedCount,
      storageLabel,
    ],
  );

  /* ----- Helpers ----- */
  const folderCount = (folderId: string) =>
    items.filter((i) => i.folderId === folderId && i.status !== 'trash').length;
  const unsortedCount = items.filter((i) => i.folderId === null && i.status !== 'trash').length;
  const allCount = items.filter((i) => i.status !== 'trash').length;

  const heroRef = useRef<HTMLDivElement>(null);
  const heroInView = useInView(heroRef, { once: true, margin: '-80px' });

  return (
    <div
      className="relative min-h-screen w-full"
      style={{ backgroundColor: 'var(--smuggler-bg)' }}
    >
      {/* Loading overlay */}
      {loading && !hydrated && (
        <div className="absolute inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'var(--smuggler-bg)' }}>
          <div className="flex flex-col items-center gap-3">
            <div
              className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: 'var(--smuggler-gold)', borderTopColor: 'transparent' }}
            />
            <span className="text-xs font-semibold" style={{ color: 'var(--smuggler-text-muted)' }}>
              Loading your library...
            </span>
          </div>
        </div>
      )}

      {/* Error banner */}
      {storeError && (
        <div
          className="relative z-50 mx-auto max-w-[1400px] px-4 pt-4 sm:px-8 lg:px-16"
        >
          <div
            className="rounded-lg border px-4 py-3 text-xs font-medium"
            style={{
              backgroundColor: 'rgba(220,38,38,0.1)',
              borderColor: 'rgba(220,38,38,0.3)',
              color: 'var(--smuggler-red)',
            }}
          >
            {storeError}
          </div>
        </div>
      )}

      {/* ====== Hero Header ====== */}
      <section
        ref={heroRef}
        className="smuggler-bg-premium relative overflow-hidden px-4 pb-10 pt-12 sm:px-8 lg:px-16"
        style={{ backgroundColor: 'var(--smuggler-bg)' }}
      >
        {/* Radial gold/green gradients */}
        <div
          className="pointer-events-none absolute inset-0 z-0"
          style={{
            background:
              'radial-gradient(circle at 15% 20%, rgba(192,152,88,0.10), transparent 50%), radial-gradient(circle at 85% 30%, rgba(46,94,62,0.10), transparent 50%)',
          }}
        />
        {/* Paper texture overlay */}
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.04]"
          style={{
            backgroundImage: "url('/smuggler/assets/paper-grain-noise.jpg')",
            backgroundSize: '220px 220px',
            mixBlendMode: 'multiply',
          }}
        />

        <div className="relative z-10 mx-auto grid max-w-[1400px] grid-cols-1 items-center gap-8 lg:grid-cols-[1fr_auto]">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={heroInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, ease: [0.25, 1, 0.5, 1] }}
          >
            {/* 100% Secure badge */}
            <div
              className="smuggler-glow mb-5 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5"
              style={{
                backgroundColor: 'rgba(192,152,88,0.10)',
                borderColor: 'rgba(192,152,88,0.35)',
                color: 'var(--smuggler-gold)',
              }}
            >
              <ShieldCheck size={14} className="fill-current" />
              <span
                className="text-[0.7rem] font-bold uppercase tracking-[1.5px]"
                style={{ color: 'var(--smuggler-gold)' }}
              >
                100% Secure · Encrypted Vault
              </span>
            </div>

            <div className="mb-3">
              <BackButton onBack={() => onNavigate('home')} label="Home" />
            </div>

            {/* Title with gold gradient + shimmer */}
            <div className="smuggler-hero-title-wrap mb-5">
              <h1
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 'clamp(2.25rem, 5vw, 3.75rem)',
                  fontWeight: 800,
                  lineHeight: 1.05,
                  letterSpacing: '-0.015em',
                  background:
                    'linear-gradient(180deg, var(--smuggler-gold) 0%, var(--smuggler-orange) 60%, var(--smuggler-gold) 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  color: 'transparent',
                  display: 'inline-block',
                }}
              >
                Your Content Library
              </h1>
            </div>
            <span className="smuggler-title-divider" />

            <p
              className="mt-5 max-w-[560px] text-base leading-relaxed sm:text-lg"
              style={{ color: 'var(--smuggler-text-secondary)' }}
            >
              Organize, search, and manage every piece of content you&apos;ve created.
              Your intelligence vault, fully encrypted.
            </p>
          </motion.div>

          {/* Mascot */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={heroInView ? { opacity: 1, scale: 1 } : {}}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.25, 1, 0.5, 1] }}
            className="relative mx-auto"
          >
            <motion.div
              animate={{ y: [0, -12, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative flex h-[140px] w-[140px] items-center justify-center overflow-hidden rounded-full"
              style={{
                border: '2px solid var(--smuggler-gold)',
                boxShadow:
                  '0 0 0 6px rgba(192,152,88,0.08), 0 12px 30px rgba(192,152,88,0.18)',
                background:
                  'radial-gradient(circle at 50% 30%, rgba(192,152,88,0.18), var(--smuggler-bg-panel) 70%)',
              }}
            >
              <img
                src="/smuggler/assets/hero-mascot-new.png"
                alt="Content Smuggler mascot guarding your library"
                className="h-full w-full scale-110 object-contain"
                style={{ filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.25))' }}
              />
            </motion.div>
            {/* Orbiting dot */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              className="pointer-events-none absolute inset-0"
            >
              <div
                className="absolute left-1/2 top-0 h-2 w-2 -translate-x-1/2 rounded-full"
                style={{
                  backgroundColor: 'var(--smuggler-gold)',
                  boxShadow: '0 0 8px var(--smuggler-gold)',
                }}
              />
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* ====== Overview Cards (6 with animated counters) ====== */}
      <section className="relative z-10 px-4 py-8 sm:px-8 lg:px-16">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-60px' }}
          className="mx-auto grid max-w-[1400px] grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6"
        >
          {stats.map((s) => (
            <motion.div
              key={s.label}
              variants={itemVariants}
              whileHover={{ y: -3 }}
              className="smuggler-panel-premium smuggler-paper-grain relative rounded-xl p-4"
            >
              <div className="relative z-10">
                <div
                  className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ backgroundColor: s.iconBg, color: s.iconColor }}
                >
                  <s.icon size={20} />
                </div>
                <div
                  className="mb-1"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    fontSize: '2rem',
                    fontWeight: 800,
                    lineHeight: 1,
                    color: 'var(--smuggler-text)',
                  }}
                >
                  <AnimatedCounter to={s.value} formatter={s.formatter} />
                </div>
                <div
                  className="text-[0.7rem] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--smuggler-text-muted)' }}
                >
                  {s.label}
                </div>
                {s.label === 'Storage Used' && (
                  <div
                    className="mt-0.5 text-[0.65rem]"
                    style={{ color: 'var(--smuggler-text-muted)' }}
                  >
                    of 10 GB
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ====== Creator Hub (migrated from Dashboard) ====== */}
      <section className="relative z-10 px-4 py-6 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-[1400px]">
          {/* Welcome Banner + Plan Widget */}
          <div className="mb-6 flex flex-col gap-6 lg:flex-row">
            {/* Welcome Banner */}
            <motion.div
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="smuggler-panel-premium smuggler-paper-grain relative flex flex-1 flex-col items-start gap-5 rounded-2xl p-6 sm:flex-row sm:items-center sm:p-7"
            >
              <div className="relative z-10 flex items-center gap-5">
                <div
                  className="relative shrink-0 rounded-lg p-2"
                  style={{
                    backgroundColor: 'var(--smuggler-border)',
                    boxShadow: '2px 4px 10px rgba(0,0,0,0.1)',
                    transform: 'rotate(-2deg)',
                  }}
                >
                  <img
                    src="/smuggler/assets/hero-mascot-new.png"
                    alt="Smuggler Mascot"
                    className="h-[80px] w-[80px] rounded-lg object-cover"
                  />
                  <Paperclip
                    size={20}
                    className="absolute -top-2.5 left-2 text-[var(--smuggler-text-muted)]"
                    style={{ transform: 'rotate(15deg)' }}
                  />
                </div>
                <div>
                  <h2
                    className="mb-1.5 font-serif text-[1.5rem] font-bold"
                    style={{ fontFamily: 'var(--font-heading)', color: 'var(--smuggler-text)' }}
                  >
                    Welcome back, Agent.
                  </h2>
                  <p className="mb-2.5 text-[0.9rem]" style={{ color: 'var(--smuggler-text-secondary)' }}>
                    Your vault is fully decrypted and ready for operation.
                  </p>
                  <p
                    className="m-0 text-[0.85rem] italic"
                    style={{ fontFamily: 'var(--font-heading)', color: 'var(--smuggler-text-muted)' }}
                  >
                    &ldquo;Great content isn&rsquo;t created. It&rsquo;s smuggled.&rdquo;
                  </p>
                </div>
              </div>
              {/* TOP SECRET stamp */}
              <div
                className="pointer-events-none absolute bottom-4 right-4 flex flex-col gap-1 opacity-60"
                style={{ transform: 'rotate(-5deg)' }}
              >
                <span
                  className="smuggler-stamp-rotate rounded border-2 border-[#C43B3B] px-2 py-0.5 text-[0.65rem] font-extrabold tracking-[2px] text-[#C43B3B]"
                  style={{ fontFamily: '"JetBrains Mono", monospace' }}
                >
                  TOP SECRET
                </span>
              </div>
            </motion.div>

            {/* Plan Widget */}
            <motion.div
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="smuggler-panel-premium relative flex w-full flex-col justify-between rounded-2xl p-6 lg:w-[300px]"
            >
              <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between text-[0.78rem] font-semibold tracking-wide" style={{ color: 'var(--smuggler-text-muted)' }}>
                  <span>YOUR PLAN</span>
                  <span
                    className="flex items-center gap-1 rounded px-2 py-0.5 text-[0.7rem]"
                    style={{ backgroundColor: 'rgba(192,152,88,0.15)', color: 'var(--smuggler-gold)' }}
                  >
                    <Crown size={11} className="fill-current" />{billing.plan.charAt(0).toUpperCase() + billing.plan.slice(1)}
                  </span>
                </div>
                <div className="mb-2 flex justify-between text-[0.85rem]" style={{ color: 'var(--smuggler-text-secondary)' }}>
                  <span>Usage this month</span>
                  <span>{billing.usage} / {billing.usageLimit}</span>
                </div>
                <div className="mb-2 h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--smuggler-border)' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    whileInView={{ width: `${Math.min(billing.usage / billing.usageLimit * 100, 100)}%` }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className="h-full rounded-full"
                    style={{ backgroundColor: 'var(--smuggler-accent-green)' }}
                  />
                </div>
                <div className="mb-4 text-[0.72rem]" style={{ color: 'var(--smuggler-text-muted)' }}>
                  {billing.renewsOn ? `Renews ${billing.renewsOn}` : 'Resets on the 1st of next month'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('tools')}
                className="smuggler-cta-outline w-full justify-center text-[0.82rem]"
              >
                <Crown size={13} /> Upgrade Plan
              </button>
            </motion.div>
          </div>

          {/* Library Stats Row (5 real data cards) */}
          {activeItems.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5"
          >
            {[
              { icon: TrendingUp, iconBg: 'var(--smuggler-accent-green)', label: 'Total Items', value: String(activeItems.length) },
              { icon: Folder, iconBg: '#9B3D3D', label: 'Folders', value: String(folders.length) },
              { icon: Star, iconBg: 'var(--smuggler-gold)', label: 'Favorites', value: String(favoriteCount) },
              { icon: Pin, iconBg: '#624B8B', label: 'Pinned', value: String(pinnedCount) },
              { icon: Archive, iconBg: '#C28B5E', label: 'Storage', value: storageLabel },
            ].map((stat) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  variants={itemVariants}
                  whileHover={{ y: -3 }}
                  className="smuggler-panel-premium smuggler-paper-grain relative rounded-xl p-4"
                >
                  <div className="relative z-10">
                    <div
                      className="mb-3 flex h-9 w-9 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: stat.iconBg }}
                    >
                      <Icon size={16} className="fill-current" />
                    </div>
                    <div className="text-[0.75rem] font-semibold" style={{ color: 'var(--smuggler-text-muted)' }}>{stat.label}</div>
                    <div className="my-0.5 text-[1.5rem] font-extrabold" style={{ color: 'var(--smuggler-text)' }}>{stat.value}</div>
                    <div className="h-6" />
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
          )}

          {/* 3-column: Popular Tools + Quick Actions + Calendar + Agent Tip */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr_1fr]">
            {/* Popular Tools Quick Launch */}
            <motion.div
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="smuggler-panel-premium smuggler-paper-grain relative rounded-2xl p-6"
            >
              <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="smuggler-section-heading text-[1.05rem]" style={{ color: 'var(--smuggler-text)' }}>Popular Tools</h3>
                  <button type="button" onClick={() => onNavigate('tools')} className="text-[0.78rem] font-semibold transition-colors hover:text-[var(--smuggler-gold)]" style={{ color: 'var(--smuggler-text-secondary)' }}>View all →</button>
                </div>
                <div className="flex flex-col gap-2.5">
                  {[
                    { icon: Sparkles, iconBg: 'var(--smuggler-accent-green)', name: 'Hook Generator', desc: 'Scroll-stopping hooks', toolId: 'hook-generator' },
                    { icon: Trophy, iconBg: 'var(--smuggler-gold)', name: 'Title Optimizer', desc: 'Viral-worthy titles', toolId: 'title-optimizer' },
                    { icon: PenLine, iconBg: '#3B648C', name: 'Script Writer', desc: 'Engaging video scripts', toolId: 'script-writer' },
                  ].map((t) => {
                    const Icon = t.icon;
                    return (
                      <div
                        key={t.toolId}
                        className="flex items-center gap-3 rounded-lg p-2.5 transition-transform duration-200 hover:-translate-y-0.5"
                        style={{ backgroundColor: 'var(--smuggler-panel-hover)', border: '1px solid var(--smuggler-border)' }}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-white" style={{ backgroundColor: t.iconBg }}>
                          <Icon size={15} className="fill-current" />
                        </div>
                        <div className="flex-1">
                          <h4 className="m-0 mb-0.5 text-[0.88rem]" style={{ color: 'var(--smuggler-text)' }}>{t.name}</h4>
                          <p className="m-0 text-[0.72rem]" style={{ color: 'var(--smuggler-text-muted)' }}>{t.desc}</p>
                        </div>
                        <button type="button" onClick={() => onSelectTool(t.toolId)} className="smuggler-press rounded-md border px-2.5 py-1 text-[0.75rem] font-semibold transition-all" style={{ borderColor: 'var(--smuggler-border)', color: 'var(--smuggler-text-secondary)' }}>
                          Launch
                        </button>
                      </div>
                    );
                  })}
                  {/* Premium CTA */}
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    onClick={() => onNavigate('tools')}
                    className="relative mt-2 flex items-center justify-between overflow-hidden rounded-xl p-5 text-left"
                    style={{
                      background: 'linear-gradient(135deg, #243B22, #1A2818)',
                      border: '1px solid #4C6B4A',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                    }}
                  >
                    <div className="relative z-10">
                      <h4 className="m-0 mb-1 text-[1rem]" style={{ color: 'var(--smuggler-gold)' }}>Discover Your Next Mission</h4>
                      <p className="m-0 mb-3 text-[0.75rem]" style={{ color: 'rgba(244,238,223,0.55)' }}>Unlock the complete arsenal.</p>
                      <span className="inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-[0.78rem] font-bold text-white" style={{ backgroundColor: '#4C6B4A' }}>
                        Explore All Tools <ArrowRight size={12} />
                      </span>
                    </div>
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Content Calendar */}
            <motion.div
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="smuggler-panel-premium smuggler-paper-grain relative rounded-2xl p-6"
            >
              <div className="relative z-10">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="smuggler-section-heading text-[1.05rem]" style={{ color: 'var(--smuggler-text)' }}>Today's Schedule</h3>
                  <Calendar size={16} style={{ color: 'var(--smuggler-text-muted)' }} />
                </div>
                <div className="flex flex-col items-center gap-3 py-6 text-center">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full"
                    style={{ backgroundColor: 'rgba(192,152,88,0.1)', color: 'var(--smuggler-text-muted)' }}
                  >
                    <Calendar size={20} />
                  </div>
                  <p className="text-sm" style={{ color: 'var(--smuggler-text-secondary)' }}>
                    No content scheduled today
                  </p>
                  <button
                    type="button"
                    onClick={() => onNavigate('tools')}
                    className="smuggler-cta-gold !px-4 !py-1.5 !text-xs"
                  >
                    <Sparkles size={12} />
                    Generate Content
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Agent Tip */}
            <motion.div
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="relative rounded-2xl p-6"
              style={{
                border: '1px dashed var(--smuggler-border)',
                background: 'linear-gradient(135deg, var(--smuggler-bg-panel), var(--smuggler-border))',
                boxShadow: 'inset 0 0 20px rgba(0,0,0,0.04)',
              }}
            >
              <div className="mb-2.5 flex h-7 w-7 items-center justify-center rounded-full text-[0.85rem] font-bold text-white" style={{ backgroundColor: 'var(--smuggler-accent-green)', fontFamily: 'var(--font-heading)' }}>C</div>
              <h4 className="mb-2 text-[0.95rem] font-bold" style={{ color: 'var(--smuggler-text)' }}>Agent&rsquo;s Tip</h4>
              <p className="m-0 text-[0.82rem] leading-relaxed" style={{ color: 'var(--smuggler-text-secondary)' }}>
                Analyze your top performing content regularly and double down on what your audience loves.
              </p>
              <Search size={40} className="absolute bottom-3 right-3 opacity-10" style={{ color: 'var(--smuggler-text)', transform: 'rotate(15deg)' }} />
            </motion.div>
          </div>

          {/* Bottom Banner */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: '-40px' }}
            className="mt-6 flex flex-col items-center justify-between gap-5 rounded-2xl p-6 md:flex-row"
            style={{
              background: 'linear-gradient(135deg, var(--smuggler-bg-panel), var(--smuggler-border))',
              boxShadow: 'inset 0 0 40px rgba(0,0,0,0.04)',
            }}
          >
            <div className="flex items-center gap-4">
              <div className="relative h-[50px] w-[70px] shrink-0">
                <div className="absolute h-[42px] w-[60px] rounded" style={{ backgroundColor: '#A07A2D', transform: 'rotate(-5deg)', boxShadow: '2px 2px 5px rgba(0,0,0,0.15)', borderRadius: '4px 10px 4px 4px' }} />
                <div className="absolute flex h-[42px] w-[60px] items-center justify-center rounded" style={{ backgroundColor: '#C09A4D', transform: 'rotate(5deg)', boxShadow: '2px 2px 5px rgba(0,0,0,0.15)', borderRadius: '4px 10px 4px 4px' }}>
                  <span className="rounded border-2 border-[#C43B3B] px-0.5 text-[0.35rem] font-extrabold tracking-[1px] text-[#C43B3B]" style={{ fontFamily: '"JetBrains Mono", monospace', transform: 'rotate(-10deg)' }}>TOP SECRET</span>
                </div>
              </div>
              <div>
                <h3 className="mb-0.5 text-[1.05rem] font-bold" style={{ color: 'var(--smuggler-text)' }}>Your content mission is on track!</h3>
                <p className="m-0 text-[0.82rem]" style={{ color: 'var(--smuggler-text-secondary)' }}>Keep creating, optimizing, and growing. The results will follow.</p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <p className="m-0 text-[0.78rem] font-semibold" style={{ color: 'var(--smuggler-text-secondary)' }}>{activeItems.length} item{activeItems.length !== 1 ? 's' : ''} saved · {folders.length} folder{folders.length !== 1 ? 's' : ''}</p>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ====== Search & Filter Toolbar ====== */}
      <section className="relative z-20 px-4 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-[1400px]">
          <div
            className="smuggler-panel-premium relative rounded-2xl p-3 sm:p-4"
            style={{ position: 'sticky', top: 84, zIndex: 20 }}
          >
            <div className="relative z-10">
              {/* Tabs row */}
              <div className="mb-3 flex items-center gap-1 overflow-x-auto pb-1 smuggler-scroll-hide">
                {TABS.map((t) => {
                  const isActive = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      type="button"
                      onClick={() => {
                        setTab(t.key);
                        clearSelection();
                      }}
                      className="relative flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
                      style={{
                        backgroundColor: isActive
                          ? 'var(--smuggler-green)'
                          : 'transparent',
                        color: isActive ? '#fff' : 'var(--smuggler-text-secondary)',
                      }}
                    >
                      {t.label}
                      <span
                        className="flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.6rem] font-bold"
                        style={{
                          backgroundColor: isActive
                            ? 'rgba(255,255,255,0.22)'
                            : 'var(--smuggler-panel-hover)',
                          color: isActive ? '#fff' : 'var(--smuggler-text-muted)',
                        }}
                      >
                        {tabCounts[t.key]}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Controls row */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Search */}
                <div className="smuggler-input-premium relative flex min-w-[180px] flex-1 items-center rounded-lg">
                  <Search
                    size={14}
                    className="pointer-events-none absolute left-3"
                    style={{ color: 'var(--smuggler-text-muted)' }}
                  />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search by title, content, tags, tool..."
                    className="w-full bg-transparent py-2 pl-8 pr-3 text-sm outline-none"
                    style={{ color: 'var(--smuggler-text)' }}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-2 flex h-5 w-5 items-center justify-center rounded"
                      style={{ color: 'var(--smuggler-text-muted)' }}
                      aria-label="Clear search"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                {/* Sort */}
                <SortDropdown value={sort} onChange={setSort} />

                {/* View toggle */}
                <div
                  className="flex items-center gap-0.5 rounded-lg border p-0.5"
                  style={{
                    backgroundColor: 'var(--smuggler-bg-panel)',
                    borderColor: 'var(--smuggler-border)',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setView('grid')}
                    className="flex h-7 w-7 items-center justify-center rounded transition-colors"
                    style={{
                      backgroundColor:
                        view === 'grid' ? 'var(--smuggler-green)' : 'transparent',
                      color: view === 'grid' ? '#fff' : 'var(--smuggler-text-muted)',
                    }}
                    aria-label="Grid view"
                  >
                    <Grid3x3 size={14} />
                  </button>
                  <button
                    type="button"
                    onClick={() => setView('list')}
                    className="flex h-7 w-7 items-center justify-center rounded transition-colors"
                    style={{
                      backgroundColor:
                        view === 'list' ? 'var(--smuggler-green)' : 'transparent',
                      color: view === 'list' ? '#fff' : 'var(--smuggler-text-muted)',
                    }}
                    aria-label="List view"
                  >
                    <ListIcon size={14} />
                  </button>
                </div>

                {/* New Folder */}
                <button
                  type="button"
                  onClick={() => setCreateFolderOpen(true)}
                  className="smuggler-cta-outline !px-3 !py-2 !text-xs"
                >
                  <FolderPlus size={14} />
                  <span className="hidden sm:inline">New Folder</span>
                </button>

                {/* Clear Trash (trash tab only) */}
                {tab === 'trash' && trashCount > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      clearTrash();
                      showToast('Trash cleared', 'info');
                    }}
                    className="smuggler-cta-outline !px-3 !py-2 !text-xs"
                    style={{
                      color: 'var(--smuggler-red)',
                      borderColor: 'var(--smuggler-red)',
                    }}
                  >
                    <Trash2 size={14} />
                    Clear Trash
                  </button>
                )}
              </div>

              {/* Multi-select bar */}
              <AnimatePresence>
                {multiSelectActive && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border p-2"
                      style={{
                        backgroundColor: 'rgba(192,152,88,0.08)',
                        borderColor: 'rgba(192,152,88,0.3)',
                      }}
                    >
                      <span
                        className="text-xs font-bold"
                        style={{ color: 'var(--smuggler-gold)' }}
                      >
                        {selectedIds.size} selected
                      </span>
                      <div className="ml-auto flex flex-wrap items-center gap-1.5">
                        {tab !== 'trash' && (
                          <>
                            <button
                              type="button"
                              onClick={handleBulkArchive}
                              className="flex items-center gap-1 rounded border px-2 py-1 text-[0.7rem] font-semibold transition-colors hover:bg-[var(--smuggler-panel-hover)]"
                              style={{
                                borderColor: 'var(--smuggler-border)',
                                color: 'var(--smuggler-text)',
                              }}
                            >
                              <Archive size={11} /> Archive
                            </button>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setBulkMoveOpen((v) => !v)}
                                className="flex items-center gap-1 rounded border px-2 py-1 text-[0.7rem] font-semibold transition-colors hover:bg-[var(--smuggler-panel-hover)]"
                                style={{
                                  borderColor: 'var(--smuggler-border)',
                                  color: 'var(--smuggler-text)',
                                }}
                              >
                                <FolderInput size={11} /> Move
                                <ChevronDown size={10} />
                              </button>
                              <AnimatePresence>
                                {bulkMoveOpen && (
                                  <>
                                    <div
                                      className="fixed inset-0 z-40"
                                      onClick={() => setBulkMoveOpen(false)}
                                      aria-hidden
                                    />
                                    <motion.div
                                      initial={{ opacity: 0, y: -6, scale: 0.96 }}
                                      animate={{ opacity: 1, y: 0, scale: 1 }}
                                      exit={{ opacity: 0, y: -6, scale: 0.96 }}
                                      transition={{ duration: 0.16 }}
                                      className="absolute right-0 z-50 mt-1 min-w-[180px] overflow-hidden rounded-lg border shadow-2xl"
                                      style={{
                                        backgroundColor: 'var(--smuggler-bg-panel)',
                                        borderColor: 'var(--smuggler-border)',
                                      }}
                                    >
                                      <button
                                        type="button"
                                        onClick={() => handleBulkMove(null)}
                                        className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--smuggler-panel-hover)]"
                                        style={{ color: 'var(--smuggler-text)' }}
                                      >
                                        <Folder size={12} style={{ color: 'var(--smuggler-text-muted)' }} />
                                        Unsorted
                                      </button>
                                      {folders.map((f) => (
                                        <button
                                          key={f.id}
                                          type="button"
                                          onClick={() => handleBulkMove(f.id)}
                                          className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-medium transition-colors hover:bg-[var(--smuggler-panel-hover)]"
                                          style={{ color: 'var(--smuggler-text)' }}
                                        >
                                          <Folder size={12} style={{ color: f.color }} />
                                          <span className="flex-1 truncate">{f.name}</span>
                                        </button>
                                      ))}
                                    </motion.div>
                                  </>
                                )}
                              </AnimatePresence>
                            </div>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={handleBulkDelete}
                          className="flex items-center gap-1 rounded border px-2 py-1 text-[0.7rem] font-semibold transition-colors hover:bg-[var(--smuggler-panel-hover)]"
                          style={{
                            borderColor: 'var(--smuggler-red)',
                            color: 'var(--smuggler-red)',
                          }}
                        >
                          <Trash2 size={11} /> Delete
                        </button>
                        <button
                          type="button"
                          onClick={clearSelection}
                          className="flex items-center gap-1 rounded px-2 py-1 text-[0.7rem] font-semibold transition-colors hover:bg-[var(--smuggler-panel-hover)]"
                          style={{ color: 'var(--smuggler-text-muted)' }}
                        >
                          <X size={11} /> Clear
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>
      </section>

      {/* ====== Folder Section ====== */}
      {tab !== 'trash' && (
        <section className="relative z-10 px-4 py-6 sm:px-8 lg:px-16">
          <div className="mx-auto max-w-[1400px]">
            <div className="mb-3 flex items-center justify-between">
              <h2
                className="smuggler-section-heading text-lg"
                style={{ color: 'var(--smuggler-text)' }}
              >
                Folders
              </h2>
              <button
                type="button"
                onClick={() => setCreateFolderOpen(true)}
                className="flex items-center gap-1 text-xs font-semibold transition-colors hover:text-[var(--smuggler-gold)]"
                style={{ color: 'var(--smuggler-text-secondary)' }}
              >
                <Plus size={13} /> New
              </button>
            </div>

            <motion.div
              variants={containerVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: '-40px' }}
              className="flex gap-3 overflow-x-auto pb-2 smuggler-scroll-hide"
            >
              {/* All items virtual folder */}
              <FolderCard
                folder={{
                  id: 'all',
                  name: 'All Items',
                  color: 'var(--smuggler-green)',
                  updatedAt: Date.now(),
                }}
                count={allCount}
                active={folderFilter === 'all'}
                onClick={() => setFolderFilter('all')}
              />
              {/* Unsorted virtual folder */}
              <FolderCard
                folder={{
                  id: 'all',
                  name: 'Unsorted',
                  color: 'var(--smuggler-text-muted)',
                  updatedAt: Date.now(),
                }}
                count={unsortedCount}
                active={folderFilter === 'unsorted'}
                onClick={() => setFolderFilter('unsorted')}
              />
              {folders.map((f) => (
                <FolderCard
                  key={f.id}
                  folder={f}
                  count={folderCount(f.id)}
                  active={folderFilter === f.id}
                  onClick={() => setFolderFilter(f.id)}
                  onRename={(name) => handleRenameFolder(f.id, name)}
                  onDelete={() => handleDeleteFolder(f.id)}
                />
              ))}
              {folders.length === 0 && (
                <div
                  className="flex min-w-[200px] items-center justify-center rounded-xl border border-dashed p-4 text-xs"
                  style={{
                    borderColor: 'var(--smuggler-border)',
                    color: 'var(--smuggler-text-muted)',
                  }}
                >
                  Click &ldquo;New Folder&rdquo; to organize your content
                </div>
              )}
            </motion.div>

            {/* Active filter indicator */}
            {folderFilter !== 'all' && (
              <div className="mt-2 flex items-center gap-2 text-xs">
                <span style={{ color: 'var(--smuggler-text-muted)' }}>Filtered by:</span>
                <span
                  className="flex items-center gap-1.5 rounded-md px-2 py-0.5 font-semibold"
                  style={{
                    backgroundColor: 'var(--smuggler-panel-hover)',
                    color: 'var(--smuggler-text)',
                  }}
                >
                  <Folder size={11} />
                  {folderFilter === 'unsorted'
                    ? 'Unsorted'
                    : folders.find((f) => f.id === folderFilter)?.name ?? 'Folder'}
                  <button
                    type="button"
                    onClick={() => setFolderFilter('all')}
                    className="ml-1"
                    style={{ color: 'var(--smuggler-text-muted)' }}
                    aria-label="Clear folder filter"
                  >
                    <X size={11} />
                  </button>
                </span>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ====== Content Grid / List ====== */}
      <section className="relative z-10 px-4 pb-10 sm:px-8 lg:px-16">
        <div className="mx-auto max-w-[1400px]">
          {emptyVariant ? (
            <EmptyState
              variant={emptyVariant}
              onAction={
                emptyVariant === 'first-visit'
                  ? () => onNavigate('tools')
                  : emptyVariant === 'no-results'
                  ? () => {
                      setSearch('');
                      setFolderFilter('all');
                      setTab('all');
                    }
                  : undefined
              }
              actionLabel={
                emptyVariant === 'first-visit'
                  ? 'Explore Tools'
                  : emptyVariant === 'no-results'
                  ? 'Clear Filters'
                  : undefined
              }
              secondaryAction={
                emptyVariant === 'first-visit'
                  ? () => onSelectTool('hook-generator')
                  : undefined
              }
              secondaryLabel={
                emptyVariant === 'first-visit' ? 'Open Hook Generator' : undefined
              }
            />
          ) : (
            <motion.div
              key={`${view}-${tab}-${folderFilter}-${sort}`}
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className={
                view === 'grid'
                  ? 'grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
                  : 'flex flex-col gap-3'
              }
            >
              {visibleItems.map((item) => (
                <ContentCard
                  key={item.id}
                  item={item}
                  view={view}
                  folders={folders}
                  selected={selectedIds.has(item.id)}
                  multiSelectActive={multiSelectActive}
                  isTrashTab={tab === 'trash'}
                  onOpen={() => setDetailItemId(item.id)}
                  onToggleSelect={() => toggleSelect(item.id)}
                  onToggleFavorite={() => {
                    toggleFavorite(item.id);
                    showToast(
                      item.favorite ? 'Removed from favorites' : 'Added to favorites',
                      'success',
                    );
                  }}
                  onTogglePin={() => {
                    togglePin(item.id);
                    showToast(item.pinned ? 'Unpinned' : 'Pinned to top', 'success');
                  }}
                  onDuplicate={() => {
                    duplicateItem(item.id);
                    showToast('Item duplicated', 'success');
                  }}
                  onDelete={() => {
                    deleteItem(item.id);
                    showToast('Moved to trash', 'info');
                  }}
                  onRestore={() => {
                    restoreItem(item.id);
                    showToast('Item restored', 'success');
                  }}
                  onPermanentDelete={() => {
                    permanentDelete(item.id);
                    showToast('Item permanently deleted', 'error');
                  }}
                  onArchive={() => {
                    updateItem(item.id, { status: 'archived' as LibraryItemStatus });
                    showToast('Item archived', 'success');
                  }}
                  onRename={(newTitle) => {
                    updateItem(item.id, { title: newTitle });
                    showToast('Item renamed', 'success');
                  }}
                  onMove={(folderId) => {
                    moveItemToFolder(item.id, folderId);
                    const t = folders.find((f) => f.id === folderId);
                    showToast(
                      `Moved to ${t ? t.name : 'Unsorted'}`,
                      'success',
                    );
                  }}
                  onCopy={() => handleCopy(item)}
                  onDownload={() => handleDownload(item)}
                />
              ))}
            </motion.div>
          )}
        </div>
      </section>

      {/* ====== Recent Activity ====== */}
      {activity.length > 0 && (
        <section className="relative z-10 px-4 pb-16 sm:px-8 lg:px-16">
          <div className="mx-auto max-w-[1400px]">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ duration: 0.5 }}
              className="smuggler-panel-premium smuggler-paper-grain relative overflow-hidden rounded-2xl"
            >
              <div className="relative z-10 p-5 sm:p-6">
                <div className="mb-4 flex items-center gap-2">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-lg"
                    style={{
                      backgroundColor: 'rgba(192,152,88,0.15)',
                      color: 'var(--smuggler-gold)',
                    }}
                  >
                    <Clock size={18} />
                  </div>
                  <div>
                    <h2
                      className="smuggler-section-heading text-lg"
                      style={{ color: 'var(--smuggler-text)' }}
                    >
                      Recent Activity
                    </h2>
                    <p
                      className="text-xs"
                      style={{ color: 'var(--smuggler-text-muted)' }}
                    >
                      Your latest content operations across the vault
                    </p>
                  </div>
                </div>

                <motion.div
                  variants={containerVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: '-40px' }}
                  className="flex flex-col"
                >
                  {activity.slice(0, 12).map((act) => {
                    const c = TYPE_COLORS[act.itemType] ?? TYPE_COLORS.hook;
                    return (
                      <motion.div
                        key={act.id}
                        variants={itemVariants}
                        className="flex items-center gap-3 border-b py-2.5 last:border-b-0"
                        style={{ borderColor: 'var(--smuggler-border)' }}
                      >
                        <div
                          className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-sm"
                          style={{ backgroundColor: c.bg, color: c.text }}
                        >
                          <span aria-hidden>{LIBRARY_TYPE_ICONS[act.itemType]}</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div
                            className="truncate text-sm font-medium"
                            style={{ color: 'var(--smuggler-text)' }}
                          >
                            <span
                              className="font-semibold uppercase tracking-wide"
                              style={{ color: 'var(--smuggler-gold)' }}
                            >
                              {act.action}
                            </span>
                            <span style={{ color: 'var(--smuggler-text-muted)' }}>
                              {' · '}
                            </span>
                            {act.itemTitle}
                          </div>
                        </div>
                        <div
                          className="flex-shrink-0 text-[0.7rem] font-medium"
                          style={{ color: 'var(--smuggler-text-muted)' }}
                        >
                          {formatTimeAgo(act.timestamp)}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* ====== Modals ====== */}
      <CreateFolderDialog
        open={createFolderOpen}
        onOpenChange={setCreateFolderOpen}
        onCreate={handleCreateFolder}
      />

      <ItemDetailModal
        key={detailItem?.id ?? 'none'}
        item={detailItem}
        folders={folders}
        onClose={() => setDetailItemId(null)}
        onUpdate={updateItem}
        onToggleFavorite={toggleFavorite}
        onTogglePin={togglePin}
        onDuplicate={duplicateItem}
        onDelete={deleteItem}
        onRestore={restoreItem}
        onPermanentDelete={permanentDelete}
        onCopy={handleCopy}
        onDownload={handleDownload}
        showToast={showToast}
      />

      {/* ====== Toast ====== */}
      <AnimatePresence>
        {toast && (
          <Toast
            key={toast.id}
            toast={toast}
            onDismiss={() => setToast(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

export default LibraryView;
