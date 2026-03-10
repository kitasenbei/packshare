import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  TextField,
  IconButton,
  Paper,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Chip,
  Alert,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import SaveIcon from '@mui/icons-material/Save';
import UndoIcon from '@mui/icons-material/Undo';
import RedoIcon from '@mui/icons-material/Redo';
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward';
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import HomeIcon from '@mui/icons-material/Home';
import CampaignIcon from '@mui/icons-material/Campaign';
import GroupIcon from '@mui/icons-material/Group';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ViewListIcon from '@mui/icons-material/ViewList';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageIcon from '@mui/icons-material/Image';
import PreviewIcon from '@mui/icons-material/Preview';
import EditIcon from '@mui/icons-material/Edit';
import ViewStreamIcon from '@mui/icons-material/ViewStream';
import DashboardIcon from '@mui/icons-material/Dashboard';
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

// Re-export types for SiteRenderer
export type { SiteConfig, SiteSection, SitePage };

// ── Icon map (UI only, not in shared types) ──

const SECTION_ICONS: Record<SectionType, React.ReactElement> = {
  hero: <HomeIcon sx={{ fontSize: 18 }} />,
  announcements: <CampaignIcon sx={{ fontSize: 18 }} />,
  players: <GroupIcon sx={{ fontSize: 18 }} />,
  bracket: <EmojiEventsIcon sx={{ fontSize: 18 }} />,
  mappool: <ViewListIcon sx={{ fontSize: 18 }} />,
  richtext: <TextFieldsIcon sx={{ fontSize: 18 }} />,
  image: <ImageIcon sx={{ fontSize: 18 }} />,
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
        <CircularProgress size={32} />
      </Box>
    );
  }

  if (!tournament) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', bgcolor: 'background.default' }}>
        <Typography variant="h5" fontWeight="bold" sx={{ mb: 1 }}>Tournament not found</Typography>
        <Button onClick={() => navigate('/tournaments')}>Go back</Button>
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', bgcolor: 'background.default' }}>
      {/* Top bar */}
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5, px: 2, py: 1,
        borderBottom: '1px solid', borderColor: 'divider',
        bgcolor: 'background.paper', flexShrink: 0,
      }}>
        <IconButton size="small" onClick={handleBack} sx={{ mr: 0.5 }}>
          <ArrowBackIcon sx={{ fontSize: 20 }} />
        </IconButton>

        {tournament.logo_url && (
          <Box component="img" src={tournament.logo_url} sx={{ height: 24, width: 24, borderRadius: 0.5, objectFit: 'cover' }} />
        )}
        <Typography variant="body2" fontWeight={700} sx={{ color: 'primary.main' }}>
          {tournament.abbreviation}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mr: 'auto' }}>
          Site Editor
        </Typography>

        {/* Undo / Redo */}
        <Box sx={{ display: 'flex', gap: 0 }}>
          <Tooltip title="Undo (Ctrl+Z)">
            <span>
              <IconButton size="small" onClick={undo} disabled={undoStack.length === 0}
                sx={{ borderRadius: '6px 0 0 6px', border: '1px solid', borderColor: 'divider', borderRight: 'none', px: 0.75 }}>
                <UndoIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Redo (Ctrl+Y)">
            <span>
              <IconButton size="small" onClick={redo} disabled={redoStack.length === 0}
                sx={{ borderRadius: '0 6px 6px 0', border: '1px solid', borderColor: 'divider', px: 0.75 }}>
                <RedoIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>

        {dirty && (
          <Chip label="Unsaved" size="small" color="warning" variant="outlined" sx={{ height: 22, fontSize: 10 }} />
        )}

        <Button
          size="small"
          variant={showPreview ? 'contained' : 'outlined'}
          color="secondary"
          startIcon={showPreview ? <EditIcon sx={{ fontSize: 14 }} /> : <PreviewIcon sx={{ fontSize: 14 }} />}
          onClick={() => setShowPreview(!showPreview)}
          sx={{ fontSize: 11 }}
        >
          {showPreview ? 'Editor' : 'Preview'}
        </Button>

        <Button
          size="small"
          variant="contained"
          startIcon={<SaveIcon sx={{ fontSize: 14 }} />}
          onClick={handleSave}
          disabled={saving || !dirty}
          sx={{ fontSize: 11 }}
        >
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </Box>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ borderRadius: 0 }}>{error}</Alert>}
      {success && <Alert severity="success" onClose={() => setSuccess('')} sx={{ borderRadius: 0 }}>{success}</Alert>}

      {/* Main area */}
      {showPreview ? (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <SitePreview config={config} tournament={tournament} activePageId={selectedPageId} />
        </Box>
      ) : (
        <Box sx={{ flex: 1, display: 'grid', gridTemplateColumns: isCanvasMode ? '220px 1fr 280px' : '180px 1fr 260px', overflow: 'hidden' }}>
          {/* Left sidebar */}
          {isCanvasMode ? (
            <Box sx={{ borderRight: '1px solid', borderColor: 'divider', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              {/* Page switcher */}
              <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
                  Pages
                </Typography>
                <Stack spacing={0.25}>
                  {config.pages.map((page) => (
                    <Box
                      key={page.id}
                      onClick={() => { setSelectedPageId(page.id); setSelectedSectionId(null); }}
                      sx={{
                        px: 1, py: 0.5, borderRadius: 0.5, cursor: 'pointer', fontSize: 11,
                        bgcolor: selectedPageId === page.id ? 'primary.main' : 'transparent',
                        color: selectedPageId === page.id ? 'white' : 'text.primary',
                        display: 'flex', alignItems: 'center', gap: 0.5,
                        '&:hover': { bgcolor: selectedPageId === page.id ? 'primary.main' : 'action.hover' },
                      }}
                    >
                      <DashboardIcon sx={{ fontSize: 12, opacity: 0.7 }} />
                      <Typography variant="caption" fontSize={11} fontWeight={selectedPageId === page.id ? 600 : 400} noWrap>
                        {page.name}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.75 }}>
                  <Button size="small" startIcon={<AddIcon sx={{ fontSize: 12 }} />} onClick={() => setAddPageOpen(true)}
                    sx={{ fontSize: 10, textTransform: 'none', flex: 1, minWidth: 0 }}>
                    Page
                  </Button>
                  <ToggleButtonGroup
                    value={isCanvasMode ? 'canvas' : 'stack'}
                    exclusive
                    onChange={togglePageLayout}
                    size="small"
                    sx={{ '& .MuiToggleButton-root': { fontSize: 9, py: 0.25, px: 0.75, textTransform: 'none' } }}
                  >
                    <ToggleButton value="stack"><ViewStreamIcon sx={{ fontSize: 12 }} /></ToggleButton>
                    <ToggleButton value="canvas"><DashboardIcon sx={{ fontSize: 12 }} /></ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>
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
            </Box>
          ) : (
            <Box sx={{ borderRight: '1px solid', borderColor: 'divider', p: 1.5, overflow: 'auto' }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
                Pages
              </Typography>
              <Stack spacing={0.5}>
                {config.pages.map((page) => (
                  <Box
                    key={page.id}
                    onClick={() => { setSelectedPageId(page.id); setSelectedSectionId(null); }}
                    sx={{
                      px: 1.5, py: 0.75, borderRadius: 1, cursor: 'pointer',
                      bgcolor: selectedPageId === page.id ? 'primary.main' : 'transparent',
                      color: selectedPageId === page.id ? 'white' : 'text.primary',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      '&:hover': { bgcolor: selectedPageId === page.id ? 'primary.main' : 'action.hover' },
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, minWidth: 0 }}>
                      {page.layout === 'canvas' ? (
                        <DashboardIcon sx={{ fontSize: 13, opacity: 0.7 }} />
                      ) : (
                        <ViewStreamIcon sx={{ fontSize: 13, opacity: 0.7 }} />
                      )}
                      <Typography variant="body2" fontSize={12} fontWeight={selectedPageId === page.id ? 600 : 400} noWrap>
                        {page.name}
                      </Typography>
                    </Box>
                    {config.pages.length > 1 && selectedPageId === page.id && (
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); removePage(page.id); }}
                        sx={{ p: 0.25, color: 'inherit', opacity: 0.7 }}>
                        <DeleteIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    )}
                  </Box>
                ))}
              </Stack>
              <Button
                size="small"
                startIcon={<AddIcon sx={{ fontSize: 14 }} />}
                onClick={() => setAddPageOpen(true)}
                sx={{ mt: 1, fontSize: 11, textTransform: 'none', width: '100%' }}
              >
                Add Page
              </Button>

              {/* Layout mode toggle */}
              {selectedPage && (
                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid', borderColor: 'divider' }}>
                  <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mb: 0.75, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
                    Layout
                  </Typography>
                  <ToggleButtonGroup
                    value={isCanvasMode ? 'canvas' : 'stack'}
                    exclusive
                    onChange={togglePageLayout}
                    size="small"
                    fullWidth
                    sx={{ '& .MuiToggleButton-root': { fontSize: 10, py: 0.5, textTransform: 'none' } }}
                  >
                    <ToggleButton value="stack">
                      <ViewStreamIcon sx={{ fontSize: 14, mr: 0.5 }} /> Stack
                    </ToggleButton>
                    <ToggleButton value="canvas">
                      <DashboardIcon sx={{ fontSize: 14, mr: 0.5 }} /> Canvas
                    </ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              )}
            </Box>
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
            <Box sx={{ p: 2, overflow: 'auto' }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mb: 1.5, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
                {selectedPage?.name} — Sections
              </Typography>
              {selectedPage && selectedPage.sections.length === 0 ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                  <Typography variant="body2" color="text.disabled" sx={{ mb: 1.5 }}>
                    No sections yet. Add one to start building.
                  </Typography>
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setAddSectionOpen(true)}>
                    Add Section
                  </Button>
                </Box>
              ) : (
                <Stack spacing={1}>
                  {selectedPage?.sections.map((section, idx) => {
                    const reg = SECTION_REGISTRY[section.type];
                    return (
                      <Card
                        key={section.id}
                        variant="outlined"
                        onClick={() => setSelectedSectionId(section.id)}
                        sx={{
                          cursor: 'pointer',
                          borderColor: selectedSectionId === section.id ? 'primary.main' : 'divider',
                          borderWidth: selectedSectionId === section.id ? 2 : 1,
                          transition: 'border-color 0.15s',
                        }}
                      >
                        <CardContent sx={{ py: 1, px: 1.5, '&:last-child': { pb: 1 }, display: 'flex', alignItems: 'center', gap: 1 }}>
                          <DragIndicatorIcon sx={{ fontSize: 16, color: 'text.disabled', cursor: 'grab' }} />
                          <Box sx={{ color: 'primary.main', display: 'flex' }}>{SECTION_ICONS[section.type]}</Box>
                          <Typography variant="body2" fontWeight={500} sx={{ flex: 1 }}>{reg.label}</Typography>
                          <Stack direction="row" spacing={0.25}>
                            <IconButton size="small" disabled={idx === 0} onClick={(e) => { e.stopPropagation(); moveSection(section.id, -1); }}>
                              <ArrowUpwardIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <IconButton size="small" disabled={idx === selectedPage.sections.length - 1} onClick={(e) => { e.stopPropagation(); moveSection(section.id, 1); }}>
                              <ArrowDownwardIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); removeSection(section.id); }}
                              sx={{ '&:hover': { color: 'error.main' } }}>
                              <DeleteIcon sx={{ fontSize: 14 }} />
                            </IconButton>
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                  <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={() => setAddSectionOpen(true)}
                    sx={{ alignSelf: 'flex-start', fontSize: 12, textTransform: 'none' }}>
                    Add Section
                  </Button>
                </Stack>
              )}
            </Box>
          )}

          {/* Right: Style panel or Properties */}
          {isCanvasMode ? (
            <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', overflow: 'hidden' }}>
              <StylePanel
                element={selectedSectionId ? builderElements[selectedSectionId] || null : null}
                config={config}
                onUpdateStyles={updateBuilderElementStyles}
                onUpdateContent={updateBuilderElementContent}
                onUpdateName={updateBuilderElementName}
                onUpdateTheme={(theme) => updateConfig({ ...config, theme })}
              />
            </Box>
          ) : (
            <Box sx={{ borderLeft: '1px solid', borderColor: 'divider', p: 1.5, overflow: 'auto' }}>
              <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ mb: 1, display: 'block', textTransform: 'uppercase', letterSpacing: 0.5, fontSize: 10 }}>
                Properties
              </Typography>
              {selectedSection ? (
                <Stack spacing={2}>
                  <SectionPropsEditor
                    section={selectedSection}
                    tournament={tournament}
                    onUpdate={(props) => updateSectionProps(selectedSection.id, props)}
                  />
                  {/* Canvas position/size fields */}
                  {isCanvasMode && selectedSection.canvas && (
                    <>
                      <Divider />
                      <CanvasLayoutEditor
                        layout={selectedSection.canvas}
                        onChange={(layout) => updateSectionCanvas(selectedSection.id, layout)}
                      />
                    </>
                  )}
                </Stack>
              ) : (
                <ThemeEditor
                  theme={config.theme}
                  onChange={(theme) => updateConfig({ ...config, theme })}
                />
              )}
            </Box>
          )}
        </Box>
      )}

      {/* Add Section Dialog */}
      <Dialog open={addSectionOpen} onClose={() => setAddSectionOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Section</DialogTitle>
        <DialogContent>
          <Stack spacing={1} sx={{ mt: 1 }}>
            {(Object.entries(SECTION_REGISTRY) as [SectionType, (typeof SECTION_REGISTRY)[SectionType]][]).map(([type, reg]) => (
              <Paper
                key={type}
                variant="outlined"
                onClick={() => addSection(type as SectionType)}
                sx={{
                  p: 1.5, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 1.5,
                  '&:hover': { borderColor: 'primary.main', bgcolor: 'rgba(132,169,140,0.05)' },
                }}
              >
                <Box sx={{ color: 'primary.main', display: 'flex' }}>{SECTION_ICONS[type as SectionType]}</Box>
                <Typography variant="body2" fontWeight={500}>{reg.label}</Typography>
              </Paper>
            ))}
          </Stack>
        </DialogContent>
      </Dialog>

      {/* Add Page Dialog */}
      <Dialog open={addPageOpen} onClose={() => setAddPageOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Add Page</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField label="Page Name" size="small" fullWidth value={newPageName} onChange={(e) => setNewPageName(e.target.value)} autoFocus />
            <TextField
              label="URL Path" size="small" fullWidth value={newPagePath} onChange={(e) => setNewPagePath(e.target.value)}
              placeholder={newPageName ? `/${newPageName.toLowerCase().replace(/\s+/g, '-')}` : '/custom-page'}
              helperText="Leave empty to auto-generate from name"
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setAddPageOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={addPage} disabled={!newPageName.trim()}>Add</Button>
        </DialogActions>
      </Dialog>
    </Box>
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
    <Stack spacing={1.5}>
      <Typography variant="body2" fontWeight={600}>Position & Size</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
        <TextField size="small" label="X" type="number" value={Math.round(layout.x)}
          onChange={(e) => onChange({ x: parseInt(e.target.value) || 0 })}
          slotProps={{ htmlInput: { style: { fontSize: 12 } } }}
        />
        <TextField size="small" label="Y" type="number" value={Math.round(layout.y)}
          onChange={(e) => onChange({ y: parseInt(e.target.value) || 0 })}
          slotProps={{ htmlInput: { style: { fontSize: 12 } } }}
        />
        <TextField size="small" label="W" type="number" value={Math.round(layout.width)}
          onChange={(e) => onChange({ width: Math.max(50, parseInt(e.target.value) || 50) })}
          slotProps={{ htmlInput: { min: 50, style: { fontSize: 12 } } }}
        />
        <TextField size="small" label="H" type="number" value={Math.round(layout.height)}
          onChange={(e) => onChange({ height: Math.max(50, parseInt(e.target.value) || 50) })}
          slotProps={{ htmlInput: { min: 50, style: { fontSize: 12 } } }}
        />
      </Box>
      <TextField size="small" label="Layer (z-index)" type="number" value={layout.zIndex}
        onChange={(e) => onChange({ zIndex: parseInt(e.target.value) || 0 })}
        slotProps={{ htmlInput: { style: { fontSize: 12 } } }}
      />
      <FormControlLabel
        control={<Switch size="small" checked={!!layout.locked} onChange={(_, v) => onChange({ locked: v })} />}
        label={<Typography variant="body2">Lock position</Typography>}
      />
    </Stack>
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
    <Stack spacing={1.5}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <Box sx={{ color: 'primary.main', display: 'flex' }}>{SECTION_ICONS[section.type]}</Box>
        <Typography variant="body2" fontWeight={600}>{reg.label}</Typography>
      </Box>
      <Divider />

      {section.type === 'hero' && (
        <>
          <FormControlLabel control={<Switch size="small" checked={!!section.props.showLogo} onChange={(_, v) => onUpdate({ showLogo: v })} />}
            label={<Typography variant="body2">Show Logo</Typography>} />
          <FormControlLabel control={<Switch size="small" checked={!!section.props.showName} onChange={(_, v) => onUpdate({ showName: v })} />}
            label={<Typography variant="body2">Show Name</Typography>} />
          <FormControlLabel control={<Switch size="small" checked={!!section.props.showStatus} onChange={(_, v) => onUpdate({ showStatus: v })} />}
            label={<Typography variant="body2">Show Status</Typography>} />
        </>
      )}

      {section.type === 'announcements' && (
        <TextField label="Max announcements" size="small" type="number" value={section.props.limit ?? 5}
          onChange={(e) => onUpdate({ limit: parseInt(e.target.value) || 5 })}
          slotProps={{ htmlInput: { min: 1, max: 20 } }} />
      )}

      {section.type === 'players' && (
        <>
          <FormControlLabel control={<Switch size="small" checked={!!section.props.showSeeds} onChange={(_, v) => onUpdate({ showSeeds: v })} />}
            label={<Typography variant="body2">Show Seeds</Typography>} />
          <FormControlLabel control={<Switch size="small" checked={!!section.props.showAvatars} onChange={(_, v) => onUpdate({ showAvatars: v })} />}
            label={<Typography variant="body2">Show Avatars</Typography>} />
        </>
      )}

      {section.type === 'mappool' && (
        <FormControl size="small" fullWidth>
          <InputLabel>Stage</InputLabel>
          <Select value={section.props.stage as string || ''} label="Stage" onChange={(e) => onUpdate({ stage: e.target.value })}>
            <MenuItem value="">All Stages</MenuItem>
            {tournament.stages?.map((s) => (<MenuItem key={s.id} value={s.name}>{s.name}</MenuItem>))}
          </Select>
        </FormControl>
      )}

      {section.type === 'richtext' && (
        <TextField label="Content" size="small" multiline rows={6} fullWidth value={section.props.content as string || ''}
          onChange={(e) => onUpdate({ content: e.target.value })} placeholder="Write text content here..." />
      )}

      {section.type === 'image' && (
        <>
          <TextField label="Image URL" size="small" fullWidth value={section.props.url as string || ''} onChange={(e) => onUpdate({ url: e.target.value })} />
          <TextField label="Alt Text" size="small" fullWidth value={section.props.alt as string || ''} onChange={(e) => onUpdate({ alt: e.target.value })} />
          <FormControlLabel control={<Switch size="small" checked={!!section.props.fullWidth} onChange={(_, v) => onUpdate({ fullWidth: v })} />}
            label={<Typography variant="body2">Full Width</Typography>} />
        </>
      )}
    </Stack>
  );
}

// ── Theme Editor ──

function ThemeEditor({ theme, onChange }: { theme: SiteConfig['theme']; onChange: (theme: SiteConfig['theme']) => void }) {
  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" fontWeight={600} sx={{ mb: 0.5 }}>Site Theme</Typography>
      <Divider />
      {([['Primary Color', 'primaryColor'], ['Background', 'backgroundColor'], ['Text Color', 'textColor']] as const).map(([label, key]) => (
        <Box key={key}>
          <Typography variant="caption" color="text.secondary">{label}</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
            <Box component="input" type="color" value={theme[key]}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange({ ...theme, [key]: e.target.value })}
              sx={{ width: 32, height: 32, border: '1px solid', borderColor: 'divider', borderRadius: 1, cursor: 'pointer', p: 0 }}
            />
            <Typography variant="caption" sx={{ fontFamily: 'monospace' }}>{theme[key]}</Typography>
          </Box>
        </Box>
      ))}
      <FormControl size="small" fullWidth>
        <InputLabel>Font</InputLabel>
        <Select value={theme.fontFamily} label="Font" onChange={(e) => onChange({ ...theme, fontFamily: e.target.value })} sx={{ fontSize: 12 }}>
          <MenuItem value="Inter, sans-serif">Inter</MenuItem>
          <MenuItem value="'Roboto', sans-serif">Roboto</MenuItem>
          <MenuItem value="'Poppins', sans-serif">Poppins</MenuItem>
          <MenuItem value="'Montserrat', sans-serif">Montserrat</MenuItem>
          <MenuItem value="system-ui, sans-serif">System UI</MenuItem>
        </Select>
      </FormControl>
    </Stack>
  );
}
