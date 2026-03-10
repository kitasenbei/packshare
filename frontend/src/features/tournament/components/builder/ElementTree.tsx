import { useState, useCallback } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import ImageIcon from '@mui/icons-material/Image';
import SmartButtonIcon from '@mui/icons-material/SmartButton';
import HorizontalRuleIcon from '@mui/icons-material/HorizontalRule';
import UnfoldMoreIcon from '@mui/icons-material/UnfoldMore';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import AddIcon from '@mui/icons-material/Add';
import type { BuilderElement, BuilderElementType } from '../../types/siteConfig';
import { ELEMENT_REGISTRY } from '../../types/siteConfig';

const ELEMENT_ICONS: Record<BuilderElementType, React.ReactElement> = {
  container: <ViewColumnIcon sx={{ fontSize: 13 }} />,
  text: <TextFieldsIcon sx={{ fontSize: 13 }} />,
  image: <ImageIcon sx={{ fontSize: 13 }} />,
  button: <SmartButtonIcon sx={{ fontSize: 13 }} />,
  divider: <HorizontalRuleIcon sx={{ fontSize: 13 }} />,
  spacer: <UnfoldMoreIcon sx={{ fontSize: 13 }} />,
};

const TYPE_COLORS: Record<BuilderElementType, string> = {
  container: '#3b82f6',
  text: '#a78bfa',
  image: '#f59e0b',
  button: '#10b981',
  divider: '#6b7280',
  spacer: '#6b7280',
};

interface ElementTreeProps {
  elements: Record<string, BuilderElement>;
  rootIds: string[];
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAddElement: (type: BuilderElementType, parentId: string | null) => void;
}

export default function ElementTree({
  elements,
  rootIds,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onDelete,
  onDuplicate,
  onAddElement,
}: ElementTreeProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Element palette */}
      <Box sx={{ p: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
        <Typography sx={{
          fontSize: 9, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase',
          letterSpacing: 1, mb: 1, display: 'block',
        }}>
          Elements
        </Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 3 }}>
          {(Object.keys(ELEMENT_REGISTRY) as BuilderElementType[]).map((type) => {
            const reg = ELEMENT_REGISTRY[type];
            return (
              <Tooltip key={type} title={`Add ${reg.label}`} placement="top" arrow>
                <Box
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('builder/element-type', type);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  onClick={() => onAddElement(type, null)}
                  sx={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0.5,
                    py: 1, borderRadius: 1, cursor: 'grab',
                    bgcolor: 'rgba(255,255,255,0.02)',
                    border: '1px solid transparent',
                    transition: 'all 0.15s',
                    '&:hover': {
                      borderColor: TYPE_COLORS[type],
                      bgcolor: `${TYPE_COLORS[type]}10`,
                      transform: 'translateY(-1px)',
                    },
                    '&:active': { cursor: 'grabbing', transform: 'scale(0.95)' },
                  }}
                >
                  <Box sx={{ color: TYPE_COLORS[type], display: 'flex', opacity: 0.8 }}>{ELEMENT_ICONS[type]}</Box>
                  <Typography sx={{ fontSize: 8, color: 'text.disabled', lineHeight: 1, fontWeight: 500 }}>
                    {reg.label}
                  </Typography>
                </Box>
              </Tooltip>
            );
          })}
        </Box>
      </Box>

      {/* Layer tree */}
      <Box sx={{ flex: 1, overflow: 'auto', py: 1 }}>
        <Typography sx={{
          fontSize: 9, fontWeight: 700, color: 'text.disabled', textTransform: 'uppercase',
          letterSpacing: 1, mb: 0.5, px: 1.5, display: 'block',
        }}>
          Layers
        </Typography>
        {rootIds.length === 0 ? (
          <Box sx={{ px: 1.5, py: 2, textAlign: 'center' }}>
            <Typography sx={{ fontSize: 10, color: 'text.disabled' }}>
              No elements yet
            </Typography>
          </Box>
        ) : (
          rootIds.map((id) => (
            <TreeNode
              key={id}
              elementId={id}
              elements={elements}
              selectedId={selectedId}
              hoveredId={hoveredId}
              onSelect={onSelect}
              onHover={onHover}
              onDelete={onDelete}
              onDuplicate={onDuplicate}
              onAddElement={onAddElement}
              depth={0}
            />
          ))
        )}
      </Box>
    </Box>
  );
}

// ── Tree Node ──

function TreeNode({
  elementId,
  elements,
  selectedId,
  hoveredId,
  onSelect,
  onHover,
  onDelete,
  onDuplicate,
  onAddElement,
  depth,
}: {
  elementId: string;
  elements: Record<string, BuilderElement>;
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onAddElement: (type: BuilderElementType, parentId: string | null) => void;
  depth: number;
}) {
  const el = elements[elementId];
  const [collapsed, setCollapsed] = useState(false);
  if (!el) return null;

  const isSelected = selectedId === elementId;
  const isHovered = hoveredId === elementId;
  const isContainer = el.type === 'container';
  const hasChildren = isContainer && el.children.length > 0;
  const color = TYPE_COLORS[el.type];

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(elementId);
  }, [elementId, onSelect]);

  const toggleCollapse = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setCollapsed(!collapsed);
  }, [collapsed]);

  return (
    <>
      <Box
        onClick={handleClick}
        onMouseEnter={() => onHover(elementId)}
        onMouseLeave={() => onHover(null)}
        sx={{
          display: 'flex', alignItems: 'center',
          pl: depth * 1.25 + (hasChildren ? 0 : 1.75) + 0.5,
          pr: 0.5, py: 0.3,
          mx: 0.5, borderRadius: 0.75,
          cursor: 'pointer',
          bgcolor: isSelected ? `${color}20` : isHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
          borderLeft: isSelected ? `2px solid ${color}` : '2px solid transparent',
          transition: 'all 0.1s',
          '&:hover': { bgcolor: isSelected ? `${color}20` : 'rgba(255,255,255,0.04)' },
          '&:hover .tree-actions': { opacity: 1 },
        }}
      >
        {/* Collapse toggle */}
        {hasChildren && (
          <IconButton size="small" onClick={toggleCollapse} sx={{ p: 0, mr: 0.25, width: 16, height: 16 }}>
            {collapsed
              ? <ChevronRightIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
              : <ExpandMoreIcon sx={{ fontSize: 14, color: 'text.disabled' }} />
            }
          </IconButton>
        )}

        {/* Icon */}
        <Box sx={{ color, display: 'flex', flexShrink: 0, mr: 0.5, opacity: isSelected ? 1 : 0.6 }}>
          {ELEMENT_ICONS[el.type]}
        </Box>

        {/* Name */}
        <Typography noWrap sx={{
          flex: 1, fontSize: 11,
          fontWeight: isSelected ? 600 : 400,
          color: isSelected ? 'text.primary' : 'text.secondary',
        }}>
          {el.name || el.type}
        </Typography>

        {/* Child count badge */}
        {isContainer && el.children.length > 0 && !isSelected && (
          <Typography sx={{ fontSize: 8, color: 'text.disabled', fontFamily: 'monospace', mr: 0.5 }}>
            {el.children.length}
          </Typography>
        )}

        {/* Actions */}
        <Box className="tree-actions" sx={{ display: 'flex', opacity: isSelected ? 1 : 0, transition: 'opacity 0.15s', flexShrink: 0 }}>
          {isContainer && (
            <Tooltip title="Add child" placement="top">
              <IconButton size="small" onClick={(e) => { e.stopPropagation(); onAddElement('container', elementId); }}
                sx={{ p: 0.15, width: 18, height: 18 }}>
                <AddIcon sx={{ fontSize: 11 }} />
              </IconButton>
            </Tooltip>
          )}
          <Tooltip title="Duplicate" placement="top">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDuplicate(elementId); }}
              sx={{ p: 0.15, width: 18, height: 18 }}>
              <ContentCopyIcon sx={{ fontSize: 10 }} />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete" placement="top">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); onDelete(elementId); }}
              sx={{ p: 0.15, width: 18, height: 18, '&:hover': { color: '#ef4444' } }}>
              <DeleteOutlineIcon sx={{ fontSize: 11 }} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Children */}
      {hasChildren && !collapsed && el.children.map((childId) => (
        <TreeNode
          key={childId}
          elementId={childId}
          elements={elements}
          selectedId={selectedId}
          hoveredId={hoveredId}
          onSelect={onSelect}
          onHover={onHover}
          onDelete={onDelete}
          onDuplicate={onDuplicate}
          onAddElement={onAddElement}
          depth={depth + 1}
        />
      ))}
    </>
  );
}
