import type {
  EinrichtungZustand,
  Reviereinrichtung,
  ReviereinrichtungKontrolle,
  ReviereinrichtungListItem,
  PhotoAsset,
  WartungsEintrag
} from "@hege/domain";
import type {
  ReviereinrichtungKontrolleRecord,
  ReviereinrichtungRecord,
  ReviereinrichtungWartungRecord
} from "../../db/schema";
import { normalizeDeAtVisibleText } from "../../text/de-at";

export function mapDemoReviereinrichtungToListItem(
  entry: Reviereinrichtung
): ReviereinrichtungListItem {
  const kontrollen = [...entry.kontrollen].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const wartung = [...entry.wartung].sort((left, right) => left.dueAt.localeCompare(right.dueAt));

  return {
    ...entry,
    kontrollen,
    wartung,
    letzteKontrolleAt: kontrollen[0]?.createdAt,
    offeneWartungen: wartung.filter((item) => item.status === "offen").length
  };
}

export function mapDbReviereinrichtungToListItem(
  entry: ReviereinrichtungRecord,
  kontrollen: ReviereinrichtungKontrolleRecord[],
  wartungen: ReviereinrichtungWartungRecord[],
  photos: PhotoAsset[] = []
): ReviereinrichtungListItem {
  const mappedKontrollen = kontrollen.map(mapKontrolleRecordToDomain);
  const mappedWartungen = wartungen.map(mapWartungRecordToDomain);
  const sortedKontrollen = [...mappedKontrollen].sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const sortedWartungen = [...mappedWartungen].sort((left, right) => left.dueAt.localeCompare(right.dueAt));

  return {
    id: entry.id,
    revierId: entry.revierId,
    type: entry.type,
    name: normalizeDeAtVisibleText(entry.name),
    status: entry.status,
    location: {
      lat: entry.locationLat,
      lng: entry.locationLng,
      label: normalizeDeAtVisibleText(entry.locationLabel) ?? undefined
    },
    beschreibung: normalizeDeAtVisibleText(entry.beschreibung) ?? undefined,
    orientationDegrees: entry.orientationDegrees ?? undefined,
    details: entry.details ?? undefined,
    createdAt: entry.createdAt,
    createdByMembershipId: entry.createdByMembershipId ?? undefined,
    photos,
    kontrollen: sortedKontrollen,
    wartung: sortedWartungen,
    letzteKontrolleAt: sortedKontrollen[0]?.createdAt,
    offeneWartungen: sortedWartungen.filter((item) => item.status === "offen").length
  };
}

function mapKontrolleRecordToDomain(record: ReviereinrichtungKontrolleRecord): ReviereinrichtungKontrolle {
  return {
    id: record.id,
    createdAt: record.createdAt,
    createdByMembershipId: record.createdByMembershipId,
    zustand: record.zustand as EinrichtungZustand,
    note: normalizeDeAtVisibleText(record.note) ?? undefined
  };
}

function mapWartungRecordToDomain(record: ReviereinrichtungWartungRecord): WartungsEintrag {
  return {
    id: record.id,
    dueAt: record.dueAt,
    status: record.status,
    title: normalizeDeAtVisibleText(record.title),
    note: normalizeDeAtVisibleText(record.note) ?? undefined
  };
}
