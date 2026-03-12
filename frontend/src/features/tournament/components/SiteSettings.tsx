import { useState, useEffect } from 'react';
import { Globe, Upload, CircleOff, Save, ExternalLink, Globe2, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useNavigate } from 'react-router-dom';
import {
  getSite,
  saveSite,
  publishSite,
  deleteSite,
  type Tournament,
  type TournamentSite,
} from '../api/tournaments';

interface SiteSettingsProps {
  tournament: Tournament;
}

export default function SiteSettings({ tournament }: SiteSettingsProps) {
  const navigate = useNavigate();
  const [site, setSite] = useState<TournamentSite | null>(null);
  const [subdomain, setSubdomain] = useState(tournament.abbreviation.toLowerCase());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [subdomainDirty, setSubdomainDirty] = useState(false);

  useEffect(() => {
    getSite(tournament.abbreviation).then((s) => {
      if (s) {
        setSite(s);
        setSubdomain(s.subdomain || tournament.abbreviation.toLowerCase());
      }
    }).finally(() => setLoading(false));
  }, [tournament.abbreviation]);

  const handleSaveSubdomain = async () => {
    setSaving(true);
    try {
      const config = site?.config || JSON.stringify({
        theme: { primaryColor: '#52796f', backgroundColor: '#2f3e46', textColor: '#cad2c5', fontFamily: 'Inter, sans-serif' },
        pages: [
          { id: 'home', name: 'Home', path: '/', sections: [
            { id: 's1', type: 'hero', props: { showLogo: true, showName: true, showStatus: true } },
            { id: 's2', type: 'announcements', props: { limit: 5 } },
          ]},
          { id: 'players', name: 'Players', path: '/players', sections: [
            { id: 's3', type: 'players', props: { showSeeds: true, showAvatars: true } },
          ]},
          { id: 'mappool', name: 'Mappool', path: '/mappool', sections: [
            { id: 's4', type: 'mappool', props: { stage: '' } },
          ]},
        ],
      });
      const saved = await saveSite(tournament.abbreviation, { subdomain, config });
      setSite(saved);
      setSubdomainDirty(false);
      toast.success('Subdomain saved!');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!site) {
      await handleSaveSubdomain();
    }
    setPublishing(true);
    try {
      const updated = await publishSite(tournament.abbreviation, !site?.published);
      setSite(updated);
      if (updated.published) {
        toast.success('Site published!');
      } else {
        toast('Site unpublished');
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to publish');
    } finally {
      setPublishing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete your site? This removes all pages and sections.')) return;
    setDeleting(true);
    try {
      await deleteSite(tournament.abbreviation);
      setSite(null);
      setSubdomain(tournament.abbreviation.toLowerCase());
      toast.success('Site deleted');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-6 text-center">
        <Spinner className="size-6" />
      </div>
    );
  }

  const hasSite = !!site;
  const pageCount = (() => {
    if (!site?.config) return 0;
    try { return JSON.parse(site.config).pages?.length || 0; } catch { return 0; }
  })();
  const sectionCount = (() => {
    if (!site?.config) return 0;
    try {
      const cfg = JSON.parse(site.config);
      return (cfg.pages || []).reduce((sum: number, p: { sections?: unknown[] }) => sum + (p.sections?.length || 0), 0);
    } catch { return 0; }
  })();

  return (
    <div className="flex flex-col gap-2.5">
      {/* Hero card */}
      <div className="border rounded-lg p-3">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center gap-1.5">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground">
              <Globe2 className="size-[22px]" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">Tournament Website</p>
              <p className="text-sm text-muted-foreground">
                {hasSite ? 'Your site is configured' : 'Create a website for your tournament'}
              </p>
            </div>
            {site?.published && (
              <Badge variant="default" className="h-6 text-[11px] font-semibold bg-green-600 text-white">
                <Globe className="size-3.5" data-icon="inline-start" />
                Live
              </Badge>
            )}
          </div>

          {/* Stats row */}
          {hasSite && (
            <>
              <Separator />
              <div className="flex gap-6">
                <div>
                  <p className="text-xs text-muted-foreground">Pages</p>
                  <p className="text-lg font-bold">{pageCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Sections</p>
                  <p className="text-lg font-bold">{sectionCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <p className={`text-lg font-bold ${site?.published ? 'text-green-500' : 'text-muted-foreground'}`}>
                    {site?.published ? 'Published' : 'Draft'}
                  </p>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Subdomain */}
          <div>
            <p className="text-sm font-semibold mb-1">Subdomain</p>
            <div className="flex items-center gap-1">
              <Input
                value={subdomain}
                onChange={(e) => { setSubdomain(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')); setSubdomainDirty(true); }}
                className="flex-1 text-[13px] font-mono"
                placeholder={tournament.abbreviation.toLowerCase()}
              />
              <span className="text-sm text-muted-foreground font-mono text-xs shrink-0">
                .packshare.gg
              </span>
              {subdomainDirty && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveSubdomain}
                  disabled={saving || !subdomain.trim()}
                  className="text-[11px] shrink-0"
                >
                  <Save className="size-3.5" data-icon="inline-start" />
                  {saving ? '...' : 'Save'}
                </Button>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-row flex-wrap gap-1.5">
            <Button
              onClick={() => navigate(`/tournaments/${tournament.abbreviation}/editor`)}
            >
              <Pencil data-icon="inline-start" />
              {hasSite ? 'Open Editor' : 'Create Site'}
            </Button>

            {hasSite && (
              <Button
                variant={site?.published ? 'outline' : 'default'}
                className={!site?.published ? 'bg-green-600 hover:bg-green-700 text-white' : ''}
                onClick={handlePublish}
                disabled={publishing}
              >
                {site?.published ? <CircleOff data-icon="inline-start" /> : <Upload data-icon="inline-start" />}
                {publishing ? '...' : site?.published ? 'Unpublish' : 'Publish'}
              </Button>
            )}

            {site?.published && site.subdomain && (
              <Button
                variant="outline"
                render={<a href={`/site/${site.subdomain}`} target="_blank" rel="noopener noreferrer" />}
              >
                <ExternalLink data-icon="inline-start" />
                View Site
              </Button>
            )}

            {hasSite && (
              <Button
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting}
                className="ml-auto"
              >
                <Trash2 data-icon="inline-start" />
                {deleting ? '...' : 'Delete Site'}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
