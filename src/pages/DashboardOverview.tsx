import { useDashboardData } from '@/hooks/useDashboardData';
import { enrichKontakte } from '@/lib/enrich';
import type { EnrichedKontakte } from '@/types/enriched';
import type { Firmen } from '@/types/app';
import { APP_IDS } from '@/types/app';
import { LivingAppsService, createRecordUrl } from '@/services/livingAppsService';
import { formatDate } from '@/lib/formatters';
import { AI_PHOTO_SCAN, AI_PHOTO_LOCATION } from '@/config/ai-features';
import { useState, useMemo } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { StatCard } from '@/components/StatCard';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FirmenDialog } from '@/components/dialogs/FirmenDialog';
import { KontakteDialog } from '@/components/dialogs/KontakteDialog';
import {
  IconAlertCircle, IconTool, IconRefresh, IconCheck,
  IconBuilding, IconUsers, IconSearch, IconPlus,
  IconPencil, IconTrash, IconChevronDown, IconChevronRight,
  IconPhone, IconMail, IconWorld, IconUserPlus, IconBriefcase,
} from '@tabler/icons-react';

const APPGROUP_ID = '6aec6517807f70e15e8545a1';
const REPAIR_ENDPOINT = '/claude/build/repair';

export default function DashboardOverview() {
  const {
    firmen, kontakte,
    firmenMap,
    loading, error, fetchAll,
  } = useDashboardData();

  const enrichedKontakte = enrichKontakte(kontakte, { firmenMap });

  // All hooks before early returns
  const [search, setSearch] = useState('');
  const [expandedFirmen, setExpandedFirmen] = useState<Set<string>>(new Set());
  const [firmenDialog, setFirmenDialog] = useState<{ open: boolean; record?: Firmen }>({ open: false });
  const [kontakteDialog, setKontakteDialog] = useState<{ open: boolean; record?: EnrichedKontakte; prefillFirmaId?: string }>({ open: false });
  const [deleteFirma, setDeleteFirma] = useState<Firmen | null>(null);
  const [deleteKontakt, setDeleteKontakt] = useState<EnrichedKontakte | null>(null);

  const filteredData = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return { firmen, enrichedKontakte };
    const matchedKontakte = enrichedKontakte.filter(k =>
      [k.fields.vorname, k.fields.nachname, k.fields.email, k.fields.telefon, k.fields.position, k.firmaName]
        .some(v => v?.toLowerCase().includes(q))
    );
    const matchedFirmenIds = new Set(matchedKontakte.map(k => {
      const url = k.fields.firma;
      if (!url || typeof url !== 'string') return null;
      const m = url.match(/([a-f0-9]{24})$/i);
      return m ? m[1] : null;
    }).filter(Boolean) as string[]);
    const matchedFirmen = firmen.filter(f =>
      [f.fields.firmenname, f.fields.branche, f.fields.ort, f.fields.email]
        .some(v => v?.toLowerCase().includes(q)) ||
      matchedFirmenIds.has(f.record_id)
    );
    return { firmen: matchedFirmen, enrichedKontakte: matchedKontakte };
  }, [search, firmen, enrichedKontakte]);

  const kontakteByFirma = useMemo(() => {
    const map = new Map<string, EnrichedKontakte[]>();
    filteredData.enrichedKontakte.forEach(k => {
      const url = k.fields.firma;
      let firmaId = '__none__';
      if (url && typeof url === 'string') {
        const m = url.match(/([a-f0-9]{24})$/i);
        if (m) firmaId = m[1];
      }
      if (!map.has(firmaId)) map.set(firmaId, []);
      map.get(firmaId)!.push(k);
    });
    return map;
  }, [filteredData.enrichedKontakte]);

  const ohneFiremaKontakte = kontakteByFirma.get('__none__') ?? [];

  const toggleFirma = (id: string) => {
    setExpandedFirmen(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) return <DashboardSkeleton />;
  if (error) return <DashboardError error={error} onRetry={fetchAll} />;

  const aktiveKontakte = kontakte.filter(k => k.fields.status?.key === 'aktiv').length;
  const kundenCount = kontakte.filter(k => k.fields.kontaktart?.key === 'kunde').length;

  return (
    <div className="space-y-6">
      {/* KPI-Zeile */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          title="Firmen"
          value={String(firmen.length)}
          description="Gesamt"
          icon={<IconBuilding size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Kontakte"
          value={String(kontakte.length)}
          description="Gesamt"
          icon={<IconUsers size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Aktive"
          value={String(aktiveKontakte)}
          description="Aktive Kontakte"
          icon={<IconUserPlus size={18} className="text-muted-foreground" />}
        />
        <StatCard
          title="Kunden"
          value={String(kundenCount)}
          description="Kontaktart Kunde"
          icon={<IconBriefcase size={18} className="text-muted-foreground" />}
        />
      </div>

      {/* Aktionsleiste */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[180px]">
          <IconSearch size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Firma, Kontakt, E-Mail..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline" size="sm" onClick={() => setFirmenDialog({ open: true })}>
          <IconBuilding size={16} className="shrink-0 mr-1.5" />
          <span className="hidden sm:inline">Neue Firma</span>
          <span className="sm:hidden">Firma</span>
        </Button>
        <Button size="sm" onClick={() => setKontakteDialog({ open: true })}>
          <IconPlus size={16} className="shrink-0 mr-1.5" />
          <span className="hidden sm:inline">Neuer Kontakt</span>
          <span className="sm:hidden">Kontakt</span>
        </Button>
      </div>

      {/* Firmen-Liste mit Kontakten */}
      <div className="space-y-3">
        {filteredData.firmen.map(firma => {
          const firmaKontakte = kontakteByFirma.get(firma.record_id) ?? [];
          const isExpanded = expandedFirmen.has(firma.record_id);

          return (
            <div key={firma.record_id} className="bg-card border border-border rounded-2xl overflow-hidden">
              {/* Firma-Header */}
              <div className="flex items-center gap-3 px-4 py-3">
                <button
                  onClick={() => toggleFirma(firma.record_id)}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <IconBuilding size={18} className="text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-foreground truncate">
                        {firma.fields.firmenname ?? '—'}
                      </span>
                      {firma.fields.branche && (
                        <Badge variant="secondary" className="text-xs shrink-0">{firma.fields.branche}</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      {firma.fields.ort && <span>{firma.fields.ort}</span>}
                      {firma.fields.telefon && (
                        <a href={`tel:${firma.fields.telefon}`} onClick={e => e.stopPropagation()} className="hover:text-foreground flex items-center gap-1">
                          <IconPhone size={12} className="shrink-0" />{firma.fields.telefon}
                        </a>
                      )}
                      {firma.fields.email && (
                        <a href={`mailto:${firma.fields.email}`} onClick={e => e.stopPropagation()} className="hover:text-foreground flex items-center gap-1">
                          <IconMail size={12} className="shrink-0" />{firma.fields.email}
                        </a>
                      )}
                      {firma.fields.website && (
                        <a href={firma.fields.website} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="hover:text-foreground flex items-center gap-1">
                          <IconWorld size={12} className="shrink-0" />Website
                        </a>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Badge variant="outline" className="text-xs">{firmaKontakte.length} Kontakt{firmaKontakte.length !== 1 ? 'e' : ''}</Badge>
                    {isExpanded ? <IconChevronDown size={16} className="text-muted-foreground" /> : <IconChevronRight size={16} className="text-muted-foreground" />}
                  </div>
                </button>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8"
                    onClick={() => setKontakteDialog({ open: true, prefillFirmaId: firma.record_id })}
                    title="Kontakt hinzufügen"
                  >
                    <IconUserPlus size={15} className="shrink-0" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8"
                    onClick={() => setFirmenDialog({ open: true, record: firma })}
                    title="Firma bearbeiten"
                  >
                    <IconPencil size={15} className="shrink-0" />
                  </Button>
                  <Button
                    variant="ghost" size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={() => setDeleteFirma(firma)}
                    title="Firma löschen"
                  >
                    <IconTrash size={15} className="shrink-0" />
                  </Button>
                </div>
              </div>

              {/* Kontakte-Liste (ausgeklappt) */}
              {isExpanded && (
                <div className="border-t border-border">
                  {firmaKontakte.length === 0 ? (
                    <div className="px-4 py-4 text-sm text-muted-foreground text-center">
                      Keine Kontakte vorhanden.{' '}
                      <button
                        className="text-primary hover:underline"
                        onClick={() => setKontakteDialog({ open: true, prefillFirmaId: firma.record_id })}
                      >
                        Kontakt hinzufügen
                      </button>
                    </div>
                  ) : (
                    <div className="divide-y divide-border">
                      {firmaKontakte.map(kontakt => (
                        <KontaktRow
                          key={kontakt.record_id}
                          kontakt={kontakt}
                          onEdit={() => setKontakteDialog({ open: true, record: kontakt })}
                          onDelete={() => setDeleteKontakt(kontakt)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Kontakte ohne Firma */}
        {ohneFiremaKontakte.length > 0 && (
          <div className="bg-card border border-border rounded-2xl overflow-hidden">
            <div className="flex items-center gap-3 px-4 py-3">
              <button
                onClick={() => toggleFirma('__none__')}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
              >
                <div className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center shrink-0">
                  <IconUsers size={18} className="text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="font-semibold text-foreground">Ohne Firma</span>
                  <div className="text-xs text-muted-foreground mt-0.5">Nicht zugeordnete Kontakte</div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="text-xs">{ohneFiremaKontakte.length} Kontakt{ohneFiremaKontakte.length !== 1 ? 'e' : ''}</Badge>
                  {expandedFirmen.has('__none__') ? <IconChevronDown size={16} className="text-muted-foreground" /> : <IconChevronRight size={16} className="text-muted-foreground" />}
                </div>
              </button>
            </div>
            {expandedFirmen.has('__none__') && (
              <div className="border-t border-border divide-y divide-border">
                {ohneFiremaKontakte.map(kontakt => (
                  <KontaktRow
                    key={kontakt.record_id}
                    kontakt={kontakt}
                    onEdit={() => setKontakteDialog({ open: true, record: kontakt })}
                    onDelete={() => setDeleteKontakt(kontakt)}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* Leerstand */}
        {filteredData.firmen.length === 0 && ohneFiremaKontakte.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
              <IconBuilding size={28} className="text-muted-foreground" stroke={1.5} />
            </div>
            <div>
              <h3 className="font-semibold text-foreground mb-1">
                {search ? 'Keine Ergebnisse' : 'Noch keine Einträge'}
              </h3>
              <p className="text-sm text-muted-foreground max-w-xs">
                {search
                  ? `Keine Firmen oder Kontakte für „${search}" gefunden.`
                  : 'Lege deine erste Firma oder deinen ersten Kontakt an.'}
              </p>
            </div>
            {!search && (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setFirmenDialog({ open: true })}>
                  <IconBuilding size={15} className="mr-1.5 shrink-0" />Neue Firma
                </Button>
                <Button size="sm" onClick={() => setKontakteDialog({ open: true })}>
                  <IconPlus size={15} className="mr-1.5 shrink-0" />Neuer Kontakt
                </Button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Dialoge */}
      <FirmenDialog
        open={firmenDialog.open}
        onClose={() => setFirmenDialog({ open: false })}
        onSubmit={async (fields) => {
          if (firmenDialog.record) {
            await LivingAppsService.updateFirmenEntry(firmenDialog.record.record_id, fields);
          } else {
            await LivingAppsService.createFirmenEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={firmenDialog.record?.fields}
        enablePhotoScan={AI_PHOTO_SCAN['Firmen']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Firmen']}
      />

      <KontakteDialog
        open={kontakteDialog.open}
        onClose={() => setKontakteDialog({ open: false })}
        onSubmit={async (fields) => {
          if (kontakteDialog.record) {
            await LivingAppsService.updateKontakteEntry(kontakteDialog.record.record_id, fields);
          } else {
            await LivingAppsService.createKontakteEntry(fields);
          }
          fetchAll();
        }}
        defaultValues={
          kontakteDialog.record
            ? kontakteDialog.record.fields
            : kontakteDialog.prefillFirmaId
            ? { firma: createRecordUrl(APP_IDS.FIRMEN, kontakteDialog.prefillFirmaId) }
            : undefined
        }
        firmenList={firmen}
        enablePhotoScan={AI_PHOTO_SCAN['Kontakte']}
        enablePhotoLocation={AI_PHOTO_LOCATION['Kontakte']}
      />

      <ConfirmDialog
        open={!!deleteFirma}
        title="Firma löschen"
        description={`Firma „${deleteFirma?.fields.firmenname ?? ''}" wirklich löschen?`}
        onConfirm={async () => {
          if (!deleteFirma) return;
          await LivingAppsService.deleteFirmenEntry(deleteFirma.record_id);
          fetchAll();
          setDeleteFirma(null);
        }}
        onClose={() => setDeleteFirma(null)}
      />

      <ConfirmDialog
        open={!!deleteKontakt}
        title="Kontakt löschen"
        description={`Kontakt „${deleteKontakt ? [deleteKontakt.fields.vorname, deleteKontakt.fields.nachname].filter(Boolean).join(' ') : ''}" wirklich löschen?`}
        onConfirm={async () => {
          if (!deleteKontakt) return;
          await LivingAppsService.deleteKontakteEntry(deleteKontakt.record_id);
          fetchAll();
          setDeleteKontakt(null);
        }}
        onClose={() => setDeleteKontakt(null)}
      />
    </div>
  );
}

function KontaktRow({
  kontakt,
  onEdit,
  onDelete,
}: {
  kontakt: EnrichedKontakte;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const name = [kontakt.fields.anrede?.label, kontakt.fields.vorname, kontakt.fields.nachname]
    .filter(Boolean).join(' ');
  const statusKey = kontakt.fields.status?.key;

  return (
    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors">
      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0 text-xs font-semibold text-primary">
        {((kontakt.fields.vorname?.[0] ?? '') + (kontakt.fields.nachname?.[0] ?? '')).toUpperCase() || '?'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground truncate text-sm">{name || '—'}</span>
          {kontakt.fields.kontaktart && (
            <Badge variant="outline" className="text-xs shrink-0">{kontakt.fields.kontaktart.label}</Badge>
          )}
          {statusKey && (
            <span className={`text-xs px-1.5 py-0.5 rounded-full shrink-0 ${statusKey === 'aktiv' ? 'bg-green-500/15 text-green-700' : 'bg-muted text-muted-foreground'}`}>
              {kontakt.fields.status!.label}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground flex-wrap">
          {kontakt.fields.position && <span className="truncate">{kontakt.fields.position}</span>}
          {kontakt.fields.email && (
            <a href={`mailto:${kontakt.fields.email}`} className="hover:text-foreground flex items-center gap-1">
              <IconMail size={11} className="shrink-0" />{kontakt.fields.email}
            </a>
          )}
          {kontakt.fields.telefon && (
            <a href={`tel:${kontakt.fields.telefon}`} className="hover:text-foreground flex items-center gap-1">
              <IconPhone size={11} className="shrink-0" />{kontakt.fields.telefon}
            </a>
          )}
          {kontakt.fields.geburtstag && (
            <span>Geb. {formatDate(kontakt.fields.geburtstag)}</span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onEdit} title="Bearbeiten">
          <IconPencil size={14} className="shrink-0" />
        </Button>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete} title="Löschen">
          <IconTrash size={14} className="shrink-0" />
        </Button>
      </div>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
      </div>
      <div className="flex gap-3">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
      {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
    </div>
  );
}

function DashboardError({ error, onRetry }: { error: Error; onRetry: () => void }) {
  const [repairing, setRepairing] = useState(false);
  const [repairStatus, setRepairStatus] = useState('');
  const [repairDone, setRepairDone] = useState(false);
  const [repairFailed, setRepairFailed] = useState(false);

  const handleRepair = async () => {
    setRepairing(true);
    setRepairStatus('Reparatur wird gestartet...');
    setRepairFailed(false);

    const errorContext = JSON.stringify({
      type: 'data_loading',
      message: error.message,
      stack: (error.stack ?? '').split('\n').slice(0, 10).join('\n'),
      url: window.location.href,
    });

    try {
      const resp = await fetch(REPAIR_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ appgroup_id: APPGROUP_ID, error_context: errorContext }),
      });

      if (!resp.ok || !resp.body) {
        setRepairing(false);
        setRepairFailed(true);
        return;
      }

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const raw of lines) {
          const line = raw.trim();
          if (!line.startsWith('data: ')) continue;
          const content = line.slice(6);
          if (content.startsWith('[STATUS]')) setRepairStatus(content.replace(/^\[STATUS]\s*/, ''));
          if (content.startsWith('[DONE]')) { setRepairDone(true); setRepairing(false); }
          if (content.startsWith('[ERROR]') && !content.includes('Dashboard-Links')) setRepairFailed(true);
        }
      }
    } catch {
      setRepairing(false);
      setRepairFailed(true);
    }
  };

  if (repairDone) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
          <IconCheck size={22} className="text-green-500" />
        </div>
        <div className="text-center">
          <h3 className="font-semibold text-foreground mb-1">Dashboard repariert</h3>
          <p className="text-sm text-muted-foreground max-w-xs">Das Problem wurde behoben. Bitte lade die Seite neu.</p>
        </div>
        <Button size="sm" onClick={() => window.location.reload()}>
          <IconRefresh size={14} className="mr-1" />Neu laden
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-2xl bg-destructive/10 flex items-center justify-center">
        <IconAlertCircle size={22} className="text-destructive" />
      </div>
      <div className="text-center">
        <h3 className="font-semibold text-foreground mb-1">Fehler beim Laden</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {repairing ? repairStatus : error.message}
        </p>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onRetry} disabled={repairing}>Erneut versuchen</Button>
        <Button size="sm" onClick={handleRepair} disabled={repairing}>
          {repairing
            ? <span className="inline-block w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin mr-1" />
            : <IconTool size={14} className="mr-1" />}
          {repairing ? 'Reparatur läuft...' : 'Dashboard reparieren'}
        </Button>
      </div>
      {repairFailed && <p className="text-sm text-destructive">Automatische Reparatur fehlgeschlagen. Bitte kontaktiere den Support.</p>}
    </div>
  );
}
