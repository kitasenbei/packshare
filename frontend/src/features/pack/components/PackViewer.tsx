import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Download, Share2, ExternalLink, Eye, Music, Calendar } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationPrevious,
  PaginationNext,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import BackButton from '../../../shared/components/BackButton';
import { getPack, trackDownload, type Pack } from '../api/packs';
import BeatmapRow from '../../../shared/components/BeatmapRow';
import DownloadButton from '../../../shared/components/DownloadButton';
import OsuButton from '../../../shared/components/OsuButton';
import PackBanner from './PackBanner';

const MAPS_PER_PAGE = 10;

interface PackViewerProps {
  packId?: string;
}

function buildPageNumbers(currentPage: number, pageCount: number): (number | 'ellipsis')[] {
  const pages: (number | 'ellipsis')[] = [];
  if (pageCount <= 7) {
    for (let i = 1; i <= pageCount; i++) pages.push(i);
    return pages;
  }
  pages.push(1);
  if (currentPage > 3) pages.push('ellipsis');
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(pageCount - 1, currentPage + 1);
  for (let i = start; i <= end; i++) pages.push(i);
  if (currentPage < pageCount - 2) pages.push('ellipsis');
  pages.push(pageCount);
  return pages;
}

export default function PackViewer({ packId }: PackViewerProps) {
  const navigate = useNavigate();
  const [pack, setPack] = useState<Pack | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (!packId) {
      setError('No pack ID provided');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    getPack(packId)
      .then((data) => {
        setPack(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load pack');
        setLoading(false);
      });
  }, [packId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Spinner className="size-6 text-primary" />
      </div>
    );
  }

  if (error || !pack) {
    return (
      <div>
        <Card className="p-4 text-center">
          <h5 className="mb-2 text-xl font-semibold">Pack not found</h5>
          <p className="text-muted-foreground">{error || 'This pack may have been deleted or the link is invalid.'}</p>
        </Card>
        <BackButton onClick={() => navigate(-1)} />
      </div>
    );
  }

  const pageCount = Math.ceil(pack.beatmaps.length / MAPS_PER_PAGE);
  const displayMaps = pack.beatmaps.slice(
    (currentPage - 1) * MAPS_PER_PAGE,
    currentPage * MAPS_PER_PAGE
  );

  const hasSelection = selectedIds.size > 0;

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleDownload = () => {
    const targets = hasSelection
      ? pack.beatmaps.filter((b) => selectedIds.has(b.id))
      : pack.beatmaps;
    targets.forEach((beatmap, index) => {
      setTimeout(() => {
        const link = document.createElement('a');
        link.href = `https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`;
        link.download = '';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        trackDownload(pack.share_code, beatmap.beatmapset_id);
      }, index * 500);
    });
    setSelectedIds(new Set());
  };


  const handleOpenOsu = (beatmap: Pack['beatmaps'][0]) => {
    window.open(`https://osu.ppy.sh/beatmapsets/${beatmap.beatmapset_id}`, '_blank');
  };

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/s/${pack.share_code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: pack.name,
          text: `Check out this beatmap pack: ${pack.name}`,
          url: shareUrl,
        });
        return;
      } catch {
        // User cancelled or share failed, fall back to copy
      }
    }
    navigator.clipboard.writeText(shareUrl);
    toast.success('Link copied to clipboard!');
  };

  return (
    <div>
      {/* Banner collage */}
      <Card className="mb-3 overflow-hidden rounded-lg p-0">
        <PackBanner beatmaps={pack.beatmaps} />
      </Card>

      {/* Header row: pack name + action buttons */}
      <div className="mb-2 flex flex-wrap items-start justify-between gap-1.5">
        <h4 className="text-2xl font-bold">
          {pack.name}
        </h4>
        <div className="flex shrink-0 flex-row gap-1">
          <Button
            size="sm"
            onClick={handleDownload}
            className="px-2"
          >
            <Download data-icon="inline-start" />
            {hasSelection ? `Download (${selectedIds.size})` : 'Download All'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleShare}
          >
            <Share2 data-icon="inline-start" />
            Share
          </Button>
          <Button
            variant="outline"
            size="sm"
            render={<Link to={`/s/${pack.share_code}`} />}
          >
            <ExternalLink data-icon="inline-start" />
            Shared Page
          </Button>
        </div>
      </div>

      {/* Two-column layout: beatmap list (left) + sidebar (right) */}
      <div className="flex flex-col gap-3 md:flex-row md:items-start">
        {/* Left column — Beatmap list */}
        <Card className="min-w-0 flex-1 overflow-hidden rounded-lg p-0">
          {/* Info bar */}
          {hasSelection && (
            <div className="flex items-center justify-end border-b border-border bg-muted/50 px-2 py-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedIds(new Set())}
              >
                Deselect {selectedIds.size}
              </Button>
            </div>
          )}

          {/* Beatmap rows */}
          <div className="p-1">
            {displayMaps.map((beatmap) => {
              const isSelected = selectedIds.has(beatmap.id);
              return (
                <BeatmapRow
                  key={beatmap.id}
                  title={beatmap.title}
                  artist={beatmap.artist}
                  keys={beatmap.keys}
                  creator={beatmap.downloads ? `${beatmap.creator} · ${beatmap.downloads} download${beatmap.downloads !== 1 ? 's' : ''}` : beatmap.creator}
                  creatorPrefix="mapped by"
                  difficultyName={beatmap.difficulty_name}
                  starRating={beatmap.star_rating}
                  beatmapsetId={beatmap.beatmapset_id}
                  onClick={() => toggleSelect(beatmap.id)}
                  sx={isSelected ? {
                    backgroundColor: 'rgba(100,181,246,0.15)',
                    border: '1px solid rgba(100,181,246,0.4)',
                  } : undefined}
                  actions={
                    <div className="flex flex-row gap-0.5" onClick={(e) => e.stopPropagation()}>
                      <OsuButton onClick={() => handleOpenOsu(beatmap)} />
                      <DownloadButton
                        downloadUrl={`https://api.nerinyan.moe/d/${beatmap.beatmapset_id}`}
                        downloadName={`${beatmap.artist} - ${beatmap.title}`}
                        stashData={{
                          id: beatmap.id,
                          beatmapsetId: beatmap.beatmapset_id,
                          title: beatmap.title,
                          artist: beatmap.artist,
                          creator: beatmap.creator,
                          keys: beatmap.keys,
                          source: 'download',
                          sourcePackId: pack.share_code,
                          sourcePackName: pack.name,
                        }}
                        onDownloaded={() => trackDownload(pack.share_code, beatmap.beatmapset_id)}
                      />
                    </div>
                  }
                />
              );
            })}
          </div>

          {/* Pagination */}
          {pageCount > 1 && (
            <div className="flex justify-center border-t border-border py-2">
              <Pagination>
                <PaginationContent>
                  <PaginationItem>
                    <PaginationPrevious
                      onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.max(1, p - 1)); }}
                      href="#"
                      aria-disabled={currentPage === 1}
                      className={currentPage === 1 ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                  {buildPageNumbers(currentPage, pageCount).map((page, i) =>
                    page === 'ellipsis' ? (
                      <PaginationItem key={`ellipsis-${i}`}>
                        <PaginationEllipsis />
                      </PaginationItem>
                    ) : (
                      <PaginationItem key={page}>
                        <PaginationLink
                          href="#"
                          isActive={page === currentPage}
                          onClick={(e) => { e.preventDefault(); setCurrentPage(page); }}
                        >
                          {page}
                        </PaginationLink>
                      </PaginationItem>
                    )
                  )}
                  <PaginationItem>
                    <PaginationNext
                      onClick={(e) => { e.preventDefault(); setCurrentPage((p) => Math.min(pageCount, p + 1)); }}
                      href="#"
                      aria-disabled={currentPage === pageCount}
                      className={currentPage === pageCount ? 'pointer-events-none opacity-50' : ''}
                    />
                  </PaginationItem>
                </PaginationContent>
              </Pagination>
            </div>
          )}
        </Card>

        {/* Right column — Sidebar */}
        <div className="w-full shrink-0 md:w-[280px]">
          {/* About */}
          <Card className="mb-2 rounded-lg p-2.5">
            <p className="mb-1.5 text-sm font-bold">
              About
            </p>
            {pack.description ? (
              <p className="mb-2 text-sm text-muted-foreground">
                {pack.description}
              </p>
            ) : (
              <p className="mb-2 text-sm italic text-muted-foreground/50">
                No description provided.
              </p>
            )}
            <Separator className="mb-2" />
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-1.5">
                <Music className="size-[18px] text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">
                  {pack.beatmaps.length} beatmaps
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Eye className="size-[18px] text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">
                  {pack.views.toLocaleString()} views
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <Calendar className="size-[18px] text-muted-foreground/50" />
                <span className="text-sm text-muted-foreground">
                  Created {new Date(pack.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                </span>
              </div>
            </div>
          </Card>

          {/* Creator */}
          <Card className="rounded-lg p-2.5">
            <p className="mb-1.5 text-sm font-bold">
              Creator
            </p>
            <Link
              to={pack.user ? `/explore?user_id=${pack.user.id}&username=${encodeURIComponent(pack.user.username)}` : '#'}
              className="-m-0.5 flex items-center gap-1.5 rounded p-0.5 no-underline hover:bg-muted"
            >
              {pack.user?.avatar_url && (
                <img
                  src={pack.user.avatar_url}
                  className="size-8 rounded-full"
                  alt=""
                />
              )}
              <span className="text-sm font-medium">
                {pack.user?.username || 'Unknown'}
              </span>
            </Link>
          </Card>
        </div>
      </div>

      <BackButton onClick={() => navigate(-1)} />
    </div>
  );
}
