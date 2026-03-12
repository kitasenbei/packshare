import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Trash2,
  GripVertical,
  Save,
  Undo2,
  Redo2,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  Home,
  Megaphone,
  Users,
  Trophy,
  List,
  Type,
  ImageIcon,
  Eye,
  Pencil,
  Rows3,
  LayoutDashboard,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import {
  getSite,
  saveSite,
  getTournament,
  type Tournament,
  type TournamentSite,
} from '../api/tournaments';
import { SitePreview } from './SiteRenderer';
import BuilderCanvas from './builder/BuilderCanvas';
import ElementTree from './builder/ElementTree';
import StylePanel from './builder/StylePanel';
import type {
  SiteConfig,
  SitePage,
  SiteSection,
  SectionType,
  BuilderElementType,
  ElementStyles,
  CanvasItemLayout,
} from '../types/siteConfig';
import {
  SECTION_REGISTRY,
  DEFAULT_CANVAS_LAYOUT,
  DEFAULT_CANVAS_SIZE,
  createBuilderElement,
} from '../types/siteConfig';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogHeader,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from '@/components/ui/tooltip';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Card } from '@/components/ui/card';

// Re-export types for SiteRenderer
export type { SiteConfig, SiteSection, SitePage };

// ── Icon map (UI only, not in shared types) ──

const SECTION_ICONS: Record<SectionType, React.ReactElement> = {
  hero: <Home className="size-[18px]" />,
  announcements: <Megaphone className="size-[18px]" />,
  players: <Users className="size-[18px]" />,
  bracket: <Trophy className="size-[18px]" />,
  mappool: <List className="size-[18px]" />,
  richtext: <Type className="size-[18px]" />,
  image: <ImageIcon className="size-[18px]" />,
};

const DEFAULT_CONFIG: SiteConfig = {
  theme: {
    primaryColor: '#52796f',
    backgroundColor: '#2f3e46',
    textColor: '#cad2c5',
    fontFamily: 'Inter, sans-serif',
  },
  pages: [
    {
      id: 'home',
      name: 'Home',
      path: '/',
      sections: [
        { id: 's1', type: 'hero', props: { showLogo: true, showName: true, showStatus: true } },
        { id: 's2', type: 'announcements', props: { limit: 5 } },
      ],
    },
    {
      id: 'players',
      name: 'Players',
      path: '/players',
      sections: [
        { id: 's3', type: 'players', props: { showSeeds: true, showAvatars: true } },
      ],
    },
    {
      id: 'mappool',
      name: 'Mappool',
      path: '/mappool',
      sections: [
        { id: 's4', type: 'mappool', props: { stage: '' } },
      ],
    },
  ],
};

// ── Component ──

interface SiteBuilderProps {
  abbreviation: string;
}

export default function SiteBuilder({ abbreviation }: SiteBuilderProps) {
  const navigate = useNavigate();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [site, setSite] = useState<TournamentSite | null>(null);
  const [config, setConfig] = useState<SiteConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedPageId, setSelectedPageId] = useState('home');
  const [selectedSectionId, setSelectedSectionId] = useState<string | null>(null);
  const [addSectionOpen, setAddSectionOpen] = useState(false);
  const [addPageOpen, setAddPageOpen] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPagePath, setNewPagePath] = useState('');
  const [dirty, setDirty] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [hoveredElementId, setHoveredElementId] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<SiteConfig[]>([]);
  const [redoStack, setRedoStack] = useState<SiteConfig[]>([]);

  useEffect(() => {
    Promise.all([
      getTournament(abbreviation),
      getSite(abbreviation),
    ]).then(([t, s]) => {
      setTournament(t);
      if (s) {
        setSite(s);
        try {
          setConfig(JSON.parse(s.config));
        } catch {
          setConfig(DEFAULT_CONFIG);
        }
      }
    }).catch(() => {
      setError('Failed to load tournament');
    }).finally(() => setLoading(false));
  }, [abbreviation]);

  const selectedPage = config.pages.find((p) => p.id === selectedPageId) || config.pages[0];
  const selectedSection = selectedPage?.sections.find((s) => s.id === selectedSectionId) || null;
  const isCanvasMode = selectedPage?.layout === 'canvas';

  const updateConfig = useCallback((next: SiteConfig) => {
    setUndoStack((prev) => [...prev.slice(-49), config]);
    setRedoStack([]);
    setConfig(next);
    setDirty(true);
  }, [config]);

  const undo = useCallback(() => {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setRedoStack((r) => [...r, config]);
    setUndoStack((u) => u.slice(0, -1));
    setConfig(prev);
    setDirty(true);
  }, [undoStack, config]);

  const redo = useCallback(() => {
    if (redoStack.length === 0) return;
    const next = redoStack[redoStack.length - 1];
    setUndoStack((u) => [...u, config]);
    setRedoStack((r) => r.slice(0, -1));
    setConfig(next);
    setDirty(true);
  }, [redoStack, config]);

  // Global undo/redo keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); }
      if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) { e.preventDefault(); redo(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); handleSave(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [undo, redo]);

  const updatePage = useCallback((pageId: string, patch: Partial<SitePage>) => {
    updateConfig({
      ...config,
      pages: config.pages.map((p) => p.id === pageId ? { ...p, ...patch } : p),
    });
  }, [config, updateConfig]);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const subdomain = site?.subdomain || abbreviation.toLowerCase();
      const saved = await saveSite(abbreviation, {
        subdomain,
        config: JSON.stringify(config),
      });
      setSite(saved);
      setDirty(false);
      setSuccess('Saved!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  // ── Section operations ──

  const addSection = (type: SectionType) => {
    const section: SiteSection = {
      id: `s_${Date.now()}`,
      type,
      props: { ...SECTION_REGISTRY[type].defaultProps },
      ...(isCanvasMode ? {
        canvas: {
          ...DEFAULT_CANVAS_LAYOUT,
          y: (selectedPage?.sections.length || 0) * 50 + 50,
          zIndex: selectedPage?.sections.length || 0,
        },
      } : {}),
    };
    updateConfig({
      ...config,
      pages: config.pages.map((p) =>
        p.id === selectedPageId ? { ...p, sections: [...p.sections, section] } : p
      ),
    });
    setAddSectionOpen(false);
    setSelectedSectionId(section.id);
  };

  const removeSection = (sectionId: string) => {
    updateConfig({
      ...config,
      pages: config.pages.map((p) =>
        p.id === selectedPageId
          ? { ...p, sections: p.sections.filter((s) => s.id !== sectionId) }
          : p
      ),
    });
    if (selectedSectionId === sectionId) setSelectedSectionId(null);
  };

  const moveSection = (sectionId: string, direction: -1 | 1) => {
    updateConfig({
      ...config,
      pages: config.pages.map((p) => {
        if (p.id !== selectedPageId) return p;
        const idx = p.sections.findIndex((s) => s.id === sectionId);
        if (idx < 0) return p;
        const newIdx = idx + direction;
        if (newIdx < 0 || newIdx >= p.sections.length) return p;
        const next = [...p.sections];
        [next[idx], next[newIdx]] = [next[newIdx], next[idx]];
        return { ...p, sections: next };
      }),
    });
  };

  const updateSectionProps = (sectionId: string, props: Record<string, unknown>) => {
    updateConfig({
      ...config,
      pages: config.pages.map((p) =>
        p.id === selectedPageId
          ? {
              ...p,
              sections: p.sections.map((s) =>
                s.id === sectionId ? { ...s, props: { ...s.props, ...props } } : s
              ),
            }
          : p
      ),
    });
  };

  const updateSectionCanvas = useCallback((sectionId: string, layout: Partial<CanvasItemLayout>) => {
    updateConfig({
      ...config,
      pages: config.pages.map((p) =>
        p.id === selectedPageId
          ? {
              ...p,
              sections: p.sections.map((s) =>
                s.id === sectionId
                  ? { ...s, canvas: { ...(s.canvas || DEFAULT_CANVAS_LAYOUT), ...layout } }
                  : s
              ),
            }
          : p
      ),
    });
  }, [config, selectedPageId, updateConfig]);

  // ── Page operations ──

  const addPage = () => {
    if (!newPageName.trim()) return;
    const path = newPagePath.trim() || `/${newPageName.trim().toLowerCase().replace(/\s+/g, '-')}`;
    const page: SitePage = {
      id: `p_${Date.now()}`,
      name: newPageName.trim(),
      path,
      sections: [],
    };
    updateConfig({ ...config, pages: [...config.pages, page] });
    setSelectedPageId(page.id);
    setAddPageOpen(false);
    setNewPageName('');
    setNewPagePath('');
  };

  const removePage = (pageId: string) => {
    if (config.pages.length <= 1) return;
    updateConfig({ ...config, pages: config.pages.filter((p) => p.id !== pageId) });
    if (selectedPageId === pageId) setSelectedPageId(config.pages[0].id);
  };

  const togglePageLayout = () => {
    if (!selectedPage) return;
    const newLayout = isCanvasMode ? 'stack' : 'canvas';
    updatePage(selectedPageId, {
      layout: newLayout,
      ...(newLayout === 'canvas' && !selectedPage.canvasSize ? { canvasSize: DEFAULT_CANVAS_SIZE } : {}),
    });
  };

  // ── Builder element operations (premium canvas mode) ──

  const builderElements = selectedPage?.elements || {};
  const builderRootIds = selectedPage?.rootElementIds || [];

  const addBuilderElement = useCallback((type: BuilderElementType, parentId: string | null) => {
    const el = createBuilderElement(type);
    const newElements = { ...builderElements, [el.id]: el };
    let newRootIds = [...builderRootIds];

    if (parentId && newElements[parentId]) {
      // Add as child of parent container
      newElements[parentId] = {
        ...newElements[parentId],
        children: [...newElements[parentId].children, el.id],
      };
    } else {
      newRootIds = [...newRootIds, el.id];
    }

    updatePage(selectedPageId, { elements: newElements, rootElementIds: newRootIds });
    setSelectedSectionId(el.id);
  }, [builderElements, builderRootIds, selectedPageId, updatePage]);

  const deleteBuilderElement = useCallback((id: string) => {
    const newElements = { ...builderElements };
    const el = newElements[id];
    if (!el) return;

    // Recursively collect all descendant IDs to delete
    const toDelete = new Set<string>();
    const collect = (eid: string) => {
      toDelete.add(eid);
      const e = newElements[eid];
      if (e) e.children.forEach(collect);
    };
    collect(id);

    // Remove from parent's children
    for (const key of Object.keys(newElements)) {
      if (toDelete.has(key)) continue;
      const parent = newElements[key];
      if (parent.children.includes(id)) {
        newElements[key] = { ...parent, children: parent.children.filter((c) => c !== id) };
      }
    }

    // Remove all collected elements
    for (const eid of toDelete) delete newElements[eid];

    // Remove from root IDs
    const newRootIds = builderRootIds.filter((rid) => !toDelete.has(rid));

    updatePage(selectedPageId, { elements: newElements, rootElementIds: newRootIds });
    if (selectedSectionId && toDelete.has(selectedSectionId)) setSelectedSectionId(null);
  }, [builderElements, builderRootIds, selectedPageId, selectedSectionId, updatePage]);

  const updateBuilderElementStyles = useCallback((id: string, styles: Partial<ElementStyles>) => {
    const el = builderElements[id];
    if (!el) return;
    updatePage(selectedPageId, {
      elements: { ...builderElements, [id]: { ...el, styles: { ...el.styles, ...styles } } },
    });
  }, [builderElements, selectedPageId, updatePage]);

  const updateBuilderElementContent = useCallback((id: string, content: string) => {
    const el = builderElements[id];
    if (!el) return;
    updatePage(selectedPageId, {
      elements: { ...builderElements, [id]: { ...el, content } },
    });
  }, [builderElements, selectedPageId, updatePage]);

  const updateBuilderElementName = useCallback((id: string, name: string) => {
    const el = builderElements[id];
    if (!el) return;
    updatePage(selectedPageId, {
      elements: { ...builderElements, [id]: { ...el, name } },
    });
  }, [builderElements, selectedPageId, updatePage]);

  const dropBuilderElement = useCallback((type: string, parentId: string | null, _index: number) => {
    addBuilderElement(type as BuilderElementType, parentId);
  }, [addBuilderElement]);

  const duplicateBuilderElement = useCallback((id: string) => {
    const el = builderElements[id];
    if (!el) return;

    // Deep clone element and all descendants
    const idMap = new Map<string, string>();
    const newElements = { ...builderElements };

    const cloneEl = (eid: string): string => {
      const orig = newElements[eid];
      if (!orig) return eid;
      const newId = `el_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      idMap.set(eid, newId);
      const clonedChildren = orig.children.map((cid) => cloneEl(cid));
      newElements[newId] = { ...orig, id: newId, children: clonedChildren, name: orig.name ? `${orig.name} copy` : undefined };
      return newId;
    };

    const newId = cloneEl(id);

    // Insert after original in parent's children or rootIds
    let newRootIds = [...builderRootIds];
    const rootIdx = newRootIds.indexOf(id);
    if (rootIdx >= 0) {
      newRootIds.splice(rootIdx + 1, 0, newId);
    } else {
      // Find parent and insert after
      for (const key of Object.keys(newElements)) {
        const parent = newElements[key];
        const childIdx = parent.children.indexOf(id);
        if (childIdx >= 0) {
          newElements[key] = { ...parent, children: [...parent.children.slice(0, childIdx + 1), newId, ...parent.children.slice(childIdx + 1)] };
          break;
        }
      }
    }

    updatePage(selectedPageId, { elements: newElements, rootElementIds: newRootIds });
    setSelectedSectionId(newId);
  }, [builderElements, builderRootIds, selectedPageId, updatePage]);

  const moveBuilderElement = useCallback((id: string, direction: -1 | 1) => {
    const newElements = { ...builderElements };
    let newRootIds = [...builderRootIds];

    // Check if it's a root element
    const rootIdx = newRootIds.indexOf(id);
    if (rootIdx >= 0) {
      const newIdx = rootIdx + direction;
      if (newIdx < 0 || newIdx >= newRootIds.length) return;
      [newRootIds[rootIdx], newRootIds[newIdx]] = [newRootIds[newIdx], newRootIds[rootIdx]];
    } else {
      // Find parent and swap in children
      for (const key of Object.keys(newElements)) {
        const parent = newElements[key];
        const childIdx = parent.children.indexOf(id);
        if (childIdx >= 0) {
          const newIdx = childIdx + direction;
          if (newIdx < 0 || newIdx >= parent.children.length) return;
          const newChildren = [...parent.children];
          [newChildren[childIdx], newChildren[newIdx]] = [newChildren[newIdx], newChildren[childIdx]];
          newElements[key] = { ...parent, children: newChildren };
          break;
        }
      }
    }

    updatePage(selectedPageId, { elements: newElements, rootElementIds: newRootIds });
  }, [builderElements, builderRootIds, selectedPageId, updatePage]);

  const handleBack = () => {
    if (dirty && !confirm('You have unsaved changes. Leave anyway?')) return;
    navigate('/tournaments');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-background">
        <h2 className="text-xl font-bold mb-1">Tournament not found</h2>
        <Button onClick={() => navigate('/tournaments')}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-1.5 px-2 py-1 border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="icon-sm" onClick={handleBack} className="mr-0.5">
          <ArrowLeft className="size-5" />
        </Button>

        {tournament.logo_url && (
          <img src={tournament.logo_url} className="h-6 w-6 rounded object-cover" alt="" />
        )}
        <span className="text-sm font-bold text-primary">
          {tournament.abbreviation}
        </span>
        <span className="text-sm text-muted-foreground mr-auto">
          Site Editor
        </span>

        {/* Undo / Redo */}
        <div className="flex">
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={undo}
                  disabled={undoStack.length === 0}
                  className="rounded-r-none border-r-0"
                />
              }
            >
              <Undo2 className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-xs"
                  onClick={redo}
                  disabled={redoStack.length === 0}
                  className="rounded-l-none"
                />
              }
            >
              <Redo2 className="size-4" />
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
          </Tooltip>
        </div>

        {dirty && (
          <Badge variant="outline" className="text-[10px] h-[22px] text-yellow-500 border-yellow-500/50">Unsaved</Badge>
        )}

        <Button
          size="sm"
          variant={showPreview ? 'default' : 'outline'}
          onClick={() => setShowPreview(!showPreview)}
          className="text-[11px]"
        >
          {showPreview ? <Pencil className="size-3.5 mr-1" /> : <Eye className="size-3.5 mr-1" />}
          {showPreview ? 'Editor' : 'Preview'}
        </Button>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={saving || !dirty}
          className="text-[11px]"
        >
          <Save className="size-3.5 mr-1" />
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="rounded-none">
          <AlertDescription className="flex items-center justify-between">
            {error}
            <Button variant="ghost" size="icon-xs" onClick={() => setError('')}>&times;</Button>
          </AlertDescription>
        </Alert>
      )}
      {success && (
        <Alert className="rounded-none border-green-500/30 bg-green-500/10">
          <AlertDescription className="flex items-center justify-between text-green-400">
            {success}
            <Button variant="ghost" size="icon-xs" onClick={() => setSuccess('')}>&times;</Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main area */}
      {showPreview ? (
        <div className="flex-1 overflow-auto">
          <SitePreview config={config} tournament={tournament} activePageId={selectedPageId} />
        </div>
      ) : (
        <div
          className="flex-1 grid overflow-hidden"
          style={{ gridTemplateColumns: isCanvasMode ? '220px 1fr 280px' : '180px 1fr 260px' }}
        >
          {/* Left sidebar */}
          {isCanvasMode ? (
            <div className="border-r border-border overflow-hidden flex flex-col">
              {/* Page switcher */}
              <div className="p-1.5 border-b border-border">
                <span className="text-[10px] font-bold text-muted-foreground mb-0.75 block uppercase tracking-wider">
                  Pages
                </span>
                <div className="flex flex-col gap-0.5">
                  {config.pages.map((page) => (
                    <div
                      key={page.id}
                      onClick={() => { setSelectedPageId(page.id); setSelectedSectionId(null); }}
                      className={`px-1 py-0.5 rounded cursor-pointer text-[11px] flex items-center gap-0.5 ${
                        selectedPageId === page.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      }`}
                    >
                      <LayoutDashboard className="size-3 opacity-70" />
                      <span className={`text-[11px] truncate ${selectedPageId === page.id ? 'font-semibold' : ''}`}>
                        {page.name}
                      </span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-0.5 mt-1">
                  <Button size="xs" variant="ghost" onClick={() => setAddPageOpen(true)} className="flex-1 min-w-0 text-[10px]">
                    <Plus className="size-3 mr-0.5" /> Page
                  </Button>
                  <ToggleGroup
                    value={[isCanvasMode ? 'canvas' : 'stack']}
                    className="h-6"
                  >
                    <ToggleGroupItem
                      value="stack"
                      onClick={isCanvasMode ? togglePageLayout : undefined}
                      className="h-6 px-1.5"
                    >
                      <Rows3 className="size-3" />
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="canvas"
                      onClick={!isCanvasMode ? togglePageLayout : undefined}
                      className="h-6 px-1.5"
                    >
                      <LayoutDashboard className="size-3" />
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              </div>
              {/* Element tree + palette */}
              <ElementTree
                elements={builderElements}
                rootIds={builderRootIds}
                selectedId={selectedSectionId}
                hoveredId={hoveredElementId}
                onSelect={setSelectedSectionId}
                onHover={setHoveredElementId}
                onDelete={deleteBuilderElement}
                onDuplicate={duplicateBuilderElement}
                onAddElement={addBuilderElement}
              />
            </div>
          ) : (
            <div className="border-r border-border p-1.5 overflow-auto">
              <span className="text-[10px] font-bold text-muted-foreground mb-1 block uppercase tracking-wider">
                Pages
              </span>
              <div className="flex flex-col gap-0.5">
                {config.pages.map((page) => (
                  <div
                    key={page.id}
                    onClick={() => { setSelectedPageId(page.id); setSelectedSectionId(null); }}
                    className={`px-1.5 py-[3px] rounded cursor-pointer flex items-center justify-between ${
                      selectedPageId === page.id
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="flex items-center gap-[3px] min-w-0">
                      {page.layout === 'canvas' ? (
                        <LayoutDashboard className="size-[13px] opacity-70" />
                      ) : (
                        <Rows3 className="size-[13px] opacity-70" />
                      )}
                      <span className={`text-xs truncate ${selectedPageId === page.id ? 'font-semibold' : ''}`}>
                        {page.name}
                      </span>
                    </div>
                    {config.pages.length > 1 && selectedPageId === page.id && (
                      <Button variant="ghost" size="icon-xs" className="p-0.5 opacity-70"
                        onClick={(e) => { e.stopPropagation(); removePage(page.id); }}>
                        <Trash2 className="size-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <Button
                size="xs"
                variant="ghost"
                onClick={() => setAddPageOpen(true)}
                className="mt-1 text-[11px] w-full"
              >
                <Plus className="size-3.5 mr-1" /> Add Page
              </Button>

              {/* Layout mode toggle */}
              {selectedPage && (
                <div className="mt-2 pt-2 border-t border-border">
                  <span className="text-[10px] font-bold text-muted-foreground mb-1 block uppercase tracking-wider">
                    Layout
                  </span>
                  <ToggleGroup
                    value={[isCanvasMode ? 'canvas' : 'stack']}
                    className="w-full"
                  >
                    <ToggleGroupItem
                      value="stack"
                      onClick={isCanvasMode ? togglePageLayout : undefined}
                      className="flex-1 text-[10px] py-0.5 h-7"
                    >
                      <Rows3 className="size-3.5 mr-0.5" /> Stack
                    </ToggleGroupItem>
                    <ToggleGroupItem
                      value="canvas"
                      onClick={!isCanvasMode ? togglePageLayout : undefined}
                      className="flex-1 text-[10px] py-0.5 h-7"
                    >
                      <LayoutDashboard className="size-3.5 mr-0.5" /> Canvas
                    </ToggleGroupItem>
                  </ToggleGroup>
                </div>
              )}
            </div>
          )}

          {/* Center: Builder canvas or section list */}
          {isCanvasMode ? (
            <BuilderCanvas
              elements={builderElements}
              rootIds={builderRootIds}
              config={config}
              selectedId={selectedSectionId}
              hoveredId={hoveredElementId}
              onSelect={setSelectedSectionId}
              onHover={setHoveredElementId}
              onUpdateContent={updateBuilderElementContent}
              onUpdateStyles={updateBuilderElementStyles}
              onDropElement={dropBuilderElement}
              onDelete={deleteBuilderElement}
              onDuplicate={duplicateBuilderElement}
              onMoveElement={moveBuilderElement}
            />
          ) : (
            <div className="p-2 overflow-auto">
              <span className="text-[10px] font-bold text-muted-foreground mb-1.5 block uppercase tracking-wider">
                {selectedPage?.name} — Sections
              </span>
              {selectedPage && selectedPage.sections.length === 0 ? (
                <div className="py-6 text-center">
                  <p className="text-sm text-muted-foreground mb-1.5">
                    No sections yet. Add one to start building.
                  </p>
                  <Button size="sm" variant="outline" onClick={() => setAddSectionOpen(true)}>
                    <Plus className="size-4 mr-1" /> Add Section
                  </Button>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  {selectedPage?.sections.map((section, idx) => {
                    const reg = SECTION_REGISTRY[section.type];
                    return (
                      <Card
                        key={section.id}
                        onClick={() => setSelectedSectionId(section.id)}
                        className={`cursor-pointer p-0 ${
                          selectedSectionId === section.id
                            ? 'border-primary border-2'
                            : 'border'
                        } transition-colors`}
                      >
                        <div className="py-1 px-1.5 flex items-center gap-1">
                          <GripVertical className="size-4 text-muted-foreground cursor-grab" />
                          <span className="text-primary flex">{SECTION_ICONS[section.type]}</span>
                          <span className="text-sm font-medium flex-1">{reg.label}</span>
                          <div className="flex items-center gap-0.5">
                            <Button variant="ghost" size="icon-xs" disabled={idx === 0}
                              onClick={(e) => { e.stopPropagation(); moveSection(section.id, -1); }}>
                              <ArrowUp className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-xs" disabled={idx === selectedPage.sections.length - 1}
                              onClick={(e) => { e.stopPropagation(); moveSection(section.id, 1); }}>
                              <ArrowDown className="size-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon-xs"
                              onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                              className="hover:text-destructive">
                              <Trash2 className="size-3.5" />
                            </Button>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                  <Button size="sm" variant="outline" onClick={() => setAddSectionOpen(true)}
                    className="self-start text-xs">
                    <Plus className="size-4 mr-1" /> Add Section
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Right: Style panel or Properties */}
          {isCanvasMode ? (
            <div className="border-l border-border overflow-hidden">
              <StylePanel
                element={selectedSectionId ? builderElements[selectedSectionId] || null : null}
                config={config}
                onUpdateStyles={updateBuilderElementStyles}
                onUpdateContent={updateBuilderElementContent}
                onUpdateName={updateBuilderElementName}
                onUpdateTheme={(theme) => updateConfig({ ...config, theme })}
              />
            </div>
          ) : (
            <div className="border-l border-border p-1.5 overflow-auto">
              <span className="text-[10px] font-bold text-muted-foreground mb-1 block uppercase tracking-wider">
                Properties
              </span>
              {selectedSection ? (
                <div className="flex flex-col gap-2">
                  <SectionPropsEditor
                    section={selectedSection}
                    tournament={tournament}
                    onUpdate={(props) => updateSectionProps(selectedSection.id, props)}
                  />
                  {/* Canvas position/size fields */}
                  {isCanvasMode && selectedSection.canvas && (
                    <>
                      <Separator />
                      <CanvasLayoutEditor
                        layout={selectedSection.canvas}
                        onChange={(layout) => updateSectionCanvas(selectedSection.id, layout)}
                      />
                    </>
                  )}
                </div>
              ) : (
                <ThemeEditor
                  theme={config.theme}
                  onChange={(theme) => updateConfig({ ...config, theme })}
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Add Section Dialog */}
      <Dialog open={addSectionOpen} onOpenChange={setAddSectionOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Section</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-1 mt-1">
            {(Object.entries(SECTION_REGISTRY) as [SectionType, (typeof SECTION_REGISTRY)[SectionType]][]).map(([type, reg]) => (
              <div
                key={type}
                onClick={() => addSection(type as SectionType)}
                className="p-1.5 cursor-pointer flex items-center gap-1.5 rounded-lg border border-border hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <span className="text-primary flex">{SECTION_ICONS[type as SectionType]}</span>
                <span className="text-sm font-medium">{reg.label}</span>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add Page Dialog */}
      <Dialog open={addPageOpen} onOpenChange={setAddPageOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Add Page</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2 mt-1">
            <div>
              <Label className="text-xs mb-1">Page Name</Label>
              <Input value={newPageName} onChange={(e) => setNewPageName(e.target.value)} autoFocus />
            </div>
            <div>
              <Label className="text-xs mb-1">URL Path</Label>
              <Input
                value={newPagePath}
                onChange={(e) => setNewPagePath(e.target.value)}
                placeholder={newPageName ? `/${newPageName.toLowerCase().replace(/\s+/g, '-')}` : '/custom-page'}
              />
              <p className="text-[11px] text-muted-foreground mt-0.5">Leave empty to auto-generate from name</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddPageOpen(false)}>Cancel</Button>
            <Button onClick={addPage} disabled={!newPageName.trim()}>Add</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Canvas Layout Editor (position/size fields in properties panel) ──

function CanvasLayoutEditor({
  layout,
  onChange,
}: {
  layout: CanvasItemLayout;
  onChange: (layout: Partial<CanvasItemLayout>) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold">Position & Size</span>
      <div className="grid grid-cols-2 gap-1">
        <div>
          <Label className="text-[10px]">X</Label>
          <Input type="number" value={Math.round(layout.x)} className="text-xs h-7"
            onChange={(e) => onChange({ x: parseInt(e.target.value) || 0 })} />
        </div>
        <div>
          <Label className="text-[10px]">Y</Label>
          <Input type="number" value={Math.round(layout.y)} className="text-xs h-7"
            onChange={(e) => onChange({ y: parseInt(e.target.value) || 0 })} />
        </div>
        <div>
          <Label className="text-[10px]">W</Label>
          <Input type="number" value={Math.round(layout.width)} className="text-xs h-7"
            onChange={(e) => onChange({ width: Math.max(50, parseInt(e.target.value) || 50) })} min={50} />
        </div>
        <div>
          <Label className="text-[10px]">H</Label>
          <Input type="number" value={Math.round(layout.height)} className="text-xs h-7"
            onChange={(e) => onChange({ height: Math.max(50, parseInt(e.target.value) || 50) })} min={50} />
        </div>
      </div>
      <div>
        <Label className="text-[10px]">Layer (z-index)</Label>
        <Input type="number" value={layout.zIndex} className="text-xs h-7"
          onChange={(e) => onChange({ zIndex: parseInt(e.target.value) || 0 })} />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <Switch size="sm" checked={!!layout.locked} onCheckedChange={(v) => onChange({ locked: v })} />
        <span className="text-sm">Lock position</span>
      </label>
    </div>
  );
}

// ── Section Props Editor ──

function SectionPropsEditor({
  section,
  tournament,
  onUpdate,
}: {
  section: SiteSection;
  tournament: Tournament;
  onUpdate: (props: Record<string, unknown>) => void;
}) {
  const reg = SECTION_REGISTRY[section.type];

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1 mb-0.5">
        <span className="text-primary flex">{SECTION_ICONS[section.type]}</span>
        <span className="text-sm font-semibold">{reg.label}</span>
      </div>
      <Separator />

      {section.type === 'hero' && (
        <>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch size="sm" checked={!!section.props.showLogo} onCheckedChange={(v) => onUpdate({ showLogo: v })} />
            <span className="text-sm">Show Logo</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch size="sm" checked={!!section.props.showName} onCheckedChange={(v) => onUpdate({ showName: v })} />
            <span className="text-sm">Show Name</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch size="sm" checked={!!section.props.showStatus} onCheckedChange={(v) => onUpdate({ showStatus: v })} />
            <span className="text-sm">Show Status</span>
          </label>
        </>
      )}

      {section.type === 'announcements' && (
        <div>
          <Label className="text-xs">Max announcements</Label>
          <Input type="number" value={String(section.props.limit ?? 5)} min={1} max={20}
            onChange={(e) => onUpdate({ limit: parseInt(e.target.value) || 5 })} className="h-7 text-xs" />
        </div>
      )}

      {section.type === 'players' && (
        <>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch size="sm" checked={!!section.props.showSeeds} onCheckedChange={(v) => onUpdate({ showSeeds: v })} />
            <span className="text-sm">Show Seeds</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch size="sm" checked={!!section.props.showAvatars} onCheckedChange={(v) => onUpdate({ showAvatars: v })} />
            <span className="text-sm">Show Avatars</span>
          </label>
        </>
      )}

      {section.type === 'mappool' && (
        <div>
          <Label className="text-xs mb-1">Stage</Label>
          <Select value={section.props.stage as string || ''} onValueChange={(v) => onUpdate({ stage: v })}>
            <SelectTrigger size="sm" className="w-full text-xs">
              <SelectValue placeholder="All Stages" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Stages</SelectItem>
              {tournament.stages?.map((s) => (<SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}

      {section.type === 'richtext' && (
        <div>
          <Label className="text-xs mb-1">Content</Label>
          <textarea
            className="w-full min-h-[150px] rounded-lg border border-input bg-transparent px-2.5 py-2 text-sm"
            value={section.props.content as string || ''}
            onChange={(e) => onUpdate({ content: e.target.value })}
            placeholder="Write text content here..."
          />
        </div>
      )}

      {section.type === 'image' && (
        <>
          <div>
            <Label className="text-xs mb-1">Image URL</Label>
            <Input value={section.props.url as string || ''} onChange={(e) => onUpdate({ url: e.target.value })} className="h-7 text-xs" />
          </div>
          <div>
            <Label className="text-xs mb-1">Alt Text</Label>
            <Input value={section.props.alt as string || ''} onChange={(e) => onUpdate({ alt: e.target.value })} className="h-7 text-xs" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <Switch size="sm" checked={!!section.props.fullWidth} onCheckedChange={(v) => onUpdate({ fullWidth: v })} />
            <span className="text-sm">Full Width</span>
          </label>
        </>
      )}
    </div>
  );
}

// ── Theme Editor ──

function ThemeEditor({ theme, onChange }: { theme: SiteConfig['theme']; onChange: (theme: SiteConfig['theme']) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm font-semibold mb-0.5">Site Theme</span>
      <Separator />
      {([['Primary Color', 'primaryColor'], ['Background', 'backgroundColor'], ['Text Color', 'textColor']] as const).map(([label, key]) => (
        <div key={key}>
          <span className="text-xs text-muted-foreground">{label}</span>
          <div className="flex items-center gap-1 mt-0.5">
            <input type="color" value={theme[key]}
              onChange={(e) => onChange({ ...theme, [key]: e.target.value })}
              className="w-8 h-8 border border-border rounded cursor-pointer p-0"
            />
            <span className="text-xs font-mono">{theme[key]}</span>
          </div>
        </div>
      ))}
      <div>
        <Label className="text-xs mb-1">Font</Label>
        <Select value={theme.fontFamily ?? 'Inter, sans-serif'} onValueChange={(v) => v && onChange({ ...theme, fontFamily: v })}>
          <SelectTrigger size="sm" className="w-full text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="Inter, sans-serif">Inter</SelectItem>
            <SelectItem value="'Roboto', sans-serif">Roboto</SelectItem>
            <SelectItem value="'Poppins', sans-serif">Poppins</SelectItem>
            <SelectItem value="'Montserrat', sans-serif">Montserrat</SelectItem>
            <SelectItem value="system-ui, sans-serif">System UI</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
