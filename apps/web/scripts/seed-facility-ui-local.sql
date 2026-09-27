-- Nur lokale Testeinrichtungen; deterministische IDs verhindern Duplikate.
WITH areas AS (
 SELECT a->>'kind' AS kind,
 ST_SetSRID(ST_GeomFromGeoJSON(jsonb_build_object('type','MultiPolygon','coordinates',a->'polygons')::text),4326) AS geom
 FROM revier_maps, jsonb_array_elements(data->'areas') a
 WHERE revier_id='revier-gaenserndorf'
), territory AS (
 SELECT ST_Difference(ST_Union(geom) FILTER (WHERE kind='boundary'),
 COALESCE(ST_Union(geom) FILTER (WHERE kind='exclusion'),ST_GeomFromText('POLYGON EMPTY',4326))) AS geom FROM areas
), points AS (
 SELECT dumped.path[1] AS n, dumped.geom AS point FROM territory,
 LATERAL ST_Dump(ST_GeneratePoints(geom,8,42)) dumped
)
INSERT INTO reviereinrichtungen (id,revier_id,type,name,status,location_lat,location_lng,location_label,beschreibung,created_by_membership_id)
SELECT 'ui-test-gaenserndorf-'||n, 'revier-gaenserndorf',
 (ARRAY['hochstand','kanzel','salzlecke','hochstand'])[1+((n-1)%4)::int],
 'Test · '||(ARRAY['Hochstand Feldrand','Kanzel Waldrand','Salzlecke','Hochstand Wiese'])[1+((n-1)%4)::int]||' '||n,
 (ARRAY['gut','wartung-faellig','gesperrt'])[1+((n-1)%3)::int],
 ST_Y(point),ST_X(point),'Gänserndorf · Teststandort',
 'Erfundene Einrichtung für UI-Tests, innerhalb der importierten Reviergrenze und außerhalb der Ausschlussflächen.',
 'member-ostheimer-gaenserndorf' FROM points
ON CONFLICT (id) DO NOTHING;
