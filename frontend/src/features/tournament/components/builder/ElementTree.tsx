import { useState, useCallback } from 'react';
import {
  Trash2,
  Copy,
  Columns2,
  Type,
  ImageIcon,
  MousePointerClick,
  Minus,
  UnfoldVertical,
  ChevronDown,
  ChevronRight,
  Plus,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip';
import type { BuilderElement, BuilderElementType } from '../../types/siteConfig';
import { ELEMENT_REGISTRY } from '../../types/siteConfig';

const ELEMENT_ICONS: Record<BuilderElementType, React.ReactElement> = {
  container: <Columns2 className="size-[13px]" />,
  text: <Type className="size-[13px]" />,
  image: <ImageIcon className="size-[13px]" />,
  button: <MousePointerClick className="size-[13px]" />,
  divider: <Minus className="size-[13px]" />,
  spacer: <UnfoldVertical className="size-[13px]" />,
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
    <div className="flex flex-col h-full">
      {/* Element palette */}
      <div className="p-1.5 border-b border-border">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-1 block">
          Elements
        </span>
        <div className="grid grid-cols-3" style={{ gap: 3 }}>
          {(Object.keys(ELEMENT_REGISTRY) as BuilderElementType[]).map((type) => {
            const reg = ELEMENT_REGISTRY[type];
            return (
              <Tooltip key={type}>
                <TooltipTrigger
                  render={
                    <div
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('builder/element-type', type);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => onAddElement(type, null)}
                      className="flex flex-col items-center gap-0.5 py-1 rounded cursor-grab transition-all active:cursor-grabbing active:scale-95"
                      style={{
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        border: '1px solid transparent',
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = TYPE_COLORS[type];
                        (e.currentTarget as HTMLElement).style.backgroundColor = `${TYPE_COLORS[type]}10`;
                        (e.currentTarget as HTMLElement).style.transform = 'translateY(-1px)';
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLElement).style.borderColor = 'transparent';
                        (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.02)';
                        (e.currentTarget as HTMLElement).style.transform = 'none';
                      }}
                    />
                  }
                >
                  <span className="flex opacity-80" style={{ color: TYPE_COLORS[type] }}>{ELEMENT_ICONS[type]}</span>
                  <span className="text-[8px] text-muted-foreground font-medium leading-none">
                    {reg.label}
                  </span>
                </TooltipTrigger>
                <TooltipContent>Add {reg.label}</TooltipContent>
              </Tooltip>
            );
          })}
        </div>
      </div>

      {/* Layer tree */}
      <div className="flex-1 overflow-auto py-1">
        <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider mb-0.5 px-1.5 block">
          Layers
        </span>
        {rootIds.length === 0 ? (
          <div className="px-1.5 py-2 text-center">
            <span className="text-[10px] text-muted-foreground">
              No elements yet
            </span>
          </div>
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
      </div>
    </div>
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
      <div
        onClick={handleClick}
        onMouseEnter={() => onHover(elementId)}
        onMouseLeave={() => onHover(null)}
        className="group flex items-center cursor-pointer rounded-[3px] mx-0.5 transition-all"
        style={{
          paddingLeft: depth * 10 + (hasChildren ? 0 : 14) + 2,
          paddingRight: 2,
          paddingTop: 1,
          paddingBottom: 1,
          backgroundColor: isSelected ? `${color}20` : isHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
          borderLeft: isSelected ? `2px solid ${color}` : '2px solid transparent',
        }}
      >
        {/* Collapse toggle */}
        {hasChildren && (
          <button onClick={toggleCollapse} className="p-0 mr-0.5 w-4 h-4 flex items-center justify-center shrink-0">
            {collapsed
              ? <ChevronRight className="size-3.5 text-muted-foreground" />
              : <ChevronDown className="size-3.5 text-muted-foreground" />
            }
          </button>
        )}

        {/* Icon */}
        <span className="flex shrink-0 mr-0.5" style={{ color, opacity: isSelected ? 1 : 0.6 }}>
          {ELEMENT_ICONS[el.type]}
        </span>

        {/* Name */}
        <span className={`flex-1 text-[11px] truncate ${
          isSelected ? 'font-semibold text-foreground' : 'text-muted-foreground'
        }`}>
          {el.name || el.type}
        </span>

        {/* Child count badge */}
        {isContainer && el.children.length > 0 && !isSelected && (
          <span className="text-[8px] text-muted-foreground font-mono mr-0.5">
            {el.children.length}
          </span>
        )}

        {/* Actions */}
        <div className={`flex shrink-0 transition-opacity ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}>
          {isContainer && (
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button variant="ghost" size="icon-xs" className="p-0 w-[18px] h-[18px]"
                    onClick={(e) => { e.stopPropagation(); onAddElement('container', elementId); }} />
                }
              >
                <Plus className="size-[11px]" />
              </TooltipTrigger>
              <TooltipContent>Add child</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon-xs" className="p-0 w-[18px] h-[18px]"
                  onClick={(e) => { e.stopPropagation(); onDuplicate(elementId); }} />
              }
            >
              <Copy className="size-[10px]" />
            </TooltipTrigger>
            <TooltipContent>Duplicate</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button variant="ghost" size="icon-xs" className="p-0 w-[18px] h-[18px] hover:text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(elementId); }} />
              }
            >
              <Trash2 className="size-[11px]" />
            </TooltipTrigger>
            <TooltipContent>Delete</TooltipContent>
          </Tooltip>
        </div>
      </div>

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
