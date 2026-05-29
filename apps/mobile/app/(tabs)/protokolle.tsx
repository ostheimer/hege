import { useEffect, useMemo, useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";
import type { ProtokollDetail, ProtokollListItem } from "@hege/domain";

import { Badge } from "../../components/badge";
import { FilterChipRow } from "../../components/filter-chip-row";
import { ScreenShell } from "../../components/screen-shell";
import { SearchInput } from "../../components/search-input";
import { StateView } from "../../components/state-view";
import { formatDateTime } from "../../lib/format";
import { fetchProtokollDetail, fetchProtokolleList } from "../../lib/api";
import {
  applyProtokollFilter,
  DEFAULT_PROTOKOLL_FILTER,
  isProtokollFilterActive,
  type ProtokollFilterState,
  type ProtokollSortKey,
  type ProtokollStatusFilter
} from "../../lib/protokoll-filter.helpers";
import type { ThemeColors } from "../../lib/theme";
import { useThemedStyles } from "../../lib/use-themed-styles";

export default function ProtokolleScreen() {
  const styles = useThemedStyles(createStyles);
  const [protokolle, setProtokolle] = useState<ProtokollListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<ProtokollDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<ProtokollFilterState>(DEFAULT_PROTOKOLL_FILTER);

  const visibleProtokolle = useMemo(
    () => applyProtokollFilter(protokolle, filter),
    [protokolle, filter]
  );
  const filterActive = useMemo(() => isProtokollFilterActive(filter), [filter]);

  useEffect(() => {
    void loadProtokolle();
  }, []);

  async function loadProtokolle() {
    setIsLoading(true);
    setError(null);

    try {
      const entries = await fetchProtokolleList();
      setProtokolle(entries);

      if (entries.length > 0) {
        const nextSelected = selectedId ?? entries[0].id;
        setSelectedId(nextSelected);
        await loadDetail(nextSelected);
      } else {
        setSelectedId(null);
        setDetail(null);
      }
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "Unbekannter Fehler");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadDetail(id: string) {
    setDetailLoading(true);

    try {
      setDetail(await fetchProtokollDetail(id));
    } catch (fetchError) {
      setDetail(null);
      setError(fetchError instanceof Error ? fetchError.message : "Unbekannter Fehler");
    } finally {
      setDetailLoading(false);
    }
  }

  return (
    <ScreenShell
      eyebrow="Protokolle"
      title="Beschlüsse und Sitzungsunterlagen immer dabei."
      subtitle="Freigegebene Protokolle bleiben mobil lesbar, Entwürfe sind fürs Backoffice reserviert."
    >
      {isLoading ? (
        <StateView
          mode="loading"
          title="Protokolle werden geladen"
          description="Die freigegebenen Sitzungen werden über die API geladen."
        />
      ) : error ? (
        <StateView mode="error" title="API nicht erreichbar" description={error} />
      ) : null}

      {!isLoading && !error && protokolle.length > 0 ? (
        <View style={styles.filterSection}>
          <SearchInput
            value={filter.search}
            onChangeText={(text) => setFilter((current) => ({ ...current, search: text }))}
            placeholder="Suche Titel, Ort oder Zusammenfassung ..."
            accessibilityLabel="Protokolle durchsuchen"
          />
          <View style={styles.filterGroup}>
            <Text style={styles.filterEyebrow}>Status</Text>
            <FilterChipRow<ProtokollStatusFilter>
              value={filter.status}
              onChange={(key) => setFilter((current) => ({ ...current, status: key }))}
              accessibilityLabel="Protokoll-Status filtern"
              options={[
                { key: "alle", label: "Alle" },
                { key: "entwurf", label: "Entwürfe" },
                { key: "freigegeben", label: "Freigegeben" }
              ]}
            />
          </View>
          <View style={styles.filterGroup}>
            <Text style={styles.filterEyebrow}>Sortierung</Text>
            <FilterChipRow<ProtokollSortKey>
              value={filter.sort}
              onChange={(key) => setFilter((current) => ({ ...current, sort: key }))}
              accessibilityLabel="Sortierung wählen"
              options={[
                { key: "termin-neueste", label: "Neueste zuerst" },
                { key: "termin-aelteste", label: "Älteste zuerst" },
                { key: "nach-titel", label: "Nach Titel" },
                { key: "nach-beschluesse", label: "Meiste Beschlüsse" }
              ]}
            />
          </View>
          {filterActive ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Filter zurücksetzen"
              onPress={() => setFilter(DEFAULT_PROTOKOLL_FILTER)}
              style={styles.filterReset}
            >
              <Text style={styles.filterResetText}>
                Filter zurücksetzen ({visibleProtokolle.length}/{protokolle.length})
              </Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      {!isLoading && !error && visibleProtokolle.length === 0 ? (
        <StateView
          mode="empty"
          title={protokolle.length === 0 ? "Noch keine Protokolle" : "Keine Treffer"}
          description={
            protokolle.length === 0
              ? "Sobald die Schriftführung Sitzungen anlegt und freigibt, erscheinen sie hier."
              : "Mit den aktuellen Filtern findet sich kein Eintrag. Filter zurücksetzen oder Suchbegriff anpassen."
          }
        />
      ) : null}

      <View style={styles.list}>
        {visibleProtokolle.map((entry) => (
          <Pressable
            key={entry.id}
            style={[styles.card, selectedId === entry.id ? styles.cardActive : null]}
            onPress={async () => {
              setSelectedId(entry.id);
              await loadDetail(entry.id);
            }}
          >
            <View style={styles.row}>
              <View style={styles.grow}>
                <Text style={styles.title}>{entry.title}</Text>
                <Text style={styles.copy}>{entry.locationLabel}</Text>
              </View>
              <Badge tone={entry.status === "freigegeben" ? "success" : "warning"}>{entry.status}</Badge>
            </View>
            <Text style={styles.copy}>{formatDateTime(entry.scheduledAt)}</Text>
            {entry.summaryPreview ? <Text style={styles.copy}>{entry.summaryPreview}</Text> : null}
            <Text style={styles.copy}>{entry.beschlussCount} Beschlüsse</Text>
            {entry.publishedDocument ? <Text style={styles.copy}>Dokument: {entry.publishedDocument.title}</Text> : null}
          </Pressable>
        ))}
      </View>

      {detail ? (
        <View style={styles.detailCard}>
          <Text style={styles.detailTitle}>{detail.title}</Text>
          <Text style={styles.copy}>{detail.locationLabel}</Text>
          <Text style={styles.copy}>{formatDateTime(detail.scheduledAt)}</Text>
          <Text style={styles.copy}>{detail.participants.filter((entry) => entry.anwesend).length} Teilnehmer anwesend</Text>
          <View style={styles.separator} />
          <ScrollView nestedScrollEnabled contentContainerStyle={styles.detailList}>
            {detail.versions.map((version) => (
              <View key={version.id} style={styles.version}>
                <Text style={styles.versionTitle}>{formatDateTime(version.createdAt)}</Text>
                <Text style={styles.copy}>{version.summary}</Text>
                {version.beschluesse.map((beschluss) => (
                  <View key={beschluss.id} style={styles.decision}>
                    <Text style={styles.decisionTitle}>{beschluss.title}</Text>
                    <Text style={styles.copy}>{beschluss.decision}</Text>
                  </View>
                ))}
              </View>
            ))}
          </ScrollView>
          {detailLoading ? <Text style={styles.copy}>Detail wird aktualisiert ...</Text> : null}
        </View>
      ) : null}
    </ScreenShell>
  );
}

const createStyles = (theme: ThemeColors) =>
  ({
  list: {
    gap: 12
  },
  card: {
    gap: 8,
    padding: 18,
    borderRadius: 22,
    backgroundColor: theme.card
  },
  cardActive: {
    borderWidth: 1,
    borderColor: theme.accent
  },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start"
  },
  grow: {
    flex: 1,
    gap: 4
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.ink
  },
  copy: {
    fontSize: 14,
    lineHeight: 20,
    color: theme.muted
  },
  separator: {
    height: 1,
    backgroundColor: "#e5dfd1",
    marginVertical: 4
  },
  filterSection: {
    gap: 10,
    padding: 14,
    borderRadius: 18,
    backgroundColor: theme.card
  },
  filterGroup: {
    gap: 6
  },
  filterEyebrow: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    color: theme.muted,
    fontWeight: "700"
  },
  filterReset: {
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
    backgroundColor: theme.accent
  },
  filterResetText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#fff9ef"
  },
  detailCard: {
    gap: 10,
    padding: 18,
    borderRadius: 22,
    backgroundColor: theme.card
  },
  detailTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.ink
  },
  detailList: {
    gap: 12,
    paddingBottom: 8
  },
  version: {
    gap: 6
  },
  versionTitle: {
    fontSize: 13,
    textTransform: "uppercase",
    letterSpacing: 1.1,
    color: theme.muted
  },
  decision: {
    gap: 4
  },
  decisionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.ink
  }
}) as const;
