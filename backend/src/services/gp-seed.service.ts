interface RawRecord {
  stateCode: number | string;
  stateNameEnglish: string;
  districtCode: number | string;
  districtNameEnglish: string;
  subdistrictCode: number | string;
  subdistrictNameEnglish: string;
  villageCode: number | string;
  villageNameEnglish: string;
  pincode: number | string;
  [key: string]: unknown;
}

export interface GramPanchayatSeedRecord {
  lgd_code: string;
  name: string;
  subdistrict: string;
  subdistrict_code: string;
  district: string;
  district_lgd_code: string;
  state: string;
  state_lgd_code: string;
  pincode: string;
}

export interface SeedGramPanchayatResult {
  inserted: number;
  pagesFetched: number;
  totalReported: number;
}

interface SeedConfig {
  apiKey: string;
  resourceId: string;
  batchSize: number;
  fetchLimit: number;
  stateFilter?: string;
}

interface GramPanchayatSeeder {
  bulkUpsertGramPanchayats(batch: GramPanchayatSeedRecord[]): Promise<void>;
}

function str(value: unknown): string {
  return value == null ? '' : String(value).trim();
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/(?:^|\s|-)(\S)/g, (_, ch: string) => String(ch).toUpperCase());
}

function parseRow(row: RawRecord): GramPanchayatSeedRecord | null {
  const name = toTitleCase(str(row.villageNameEnglish));
  const district = toTitleCase(str(row.districtNameEnglish));
  const state = toTitleCase(str(row.stateNameEnglish));
  const lgdCode = str(row.villageCode);

  if (!lgdCode || !name || !district || !state) return null;

  return {
    lgd_code: lgdCode,
    name,
    subdistrict: toTitleCase(str(row.subdistrictNameEnglish)),
    subdistrict_code: str(row.subdistrictCode),
    district,
    district_lgd_code: str(row.districtCode),
    state,
    state_lgd_code: str(row.stateCode),
    pincode: str(row.pincode),
  };
}

async function fetchPage(
  config: SeedConfig,
  offset: number
): Promise<{ records: RawRecord[]; total: number }> {
  const url = new URL(`https://api.data.gov.in/resource/${config.resourceId}`);
  url.searchParams.set('api-key', config.apiKey);
  url.searchParams.set('format', 'json');
  url.searchParams.set('limit', String(config.fetchLimit));
  url.searchParams.set('offset', String(offset));

  if (config.stateFilter) {
    url.searchParams.set('filters[stateNameEnglish]', config.stateFilter);
  }

  const response = await fetch(url.toString());
  if (!response.ok) {
    const body = await response.text().catch(() => '');
    throw new Error(`data.gov.in ${response.status}: ${body.slice(0, 300)}`);
  }

  const json = (await response.json()) as {
    records?: RawRecord[];
    data?: RawRecord[];
    total?: number;
  };
  const records = json.records ?? json.data ?? [];
  const total = Number(json.total ?? records.length);
  return { records, total };
}

export async function seedGramPanchayats(
  neo4jService: GramPanchayatSeeder,
  options: {
    apiKey?: string;
    resourceId?: string;
    batchSize?: number;
    fetchLimit?: number;
    stateFilter?: string;
  } = {}
): Promise<SeedGramPanchayatResult> {
  const apiKey = options.apiKey ?? process.env.DATA_GOV_IN_API_KEY ?? '';
  const resourceId = options.resourceId ?? process.env.LGD_GP_RESOURCE_ID ?? '';
  if (!apiKey) throw new Error('DATA_GOV_IN_API_KEY not set');
  if (!resourceId) throw new Error('LGD_GP_RESOURCE_ID not set');

  const config: SeedConfig = {
    apiKey,
    resourceId,
    batchSize: Math.max(1, Number(options.batchSize || 500)),
    fetchLimit: Math.max(1, Number(options.fetchLimit || 1000)),
    stateFilter: options.stateFilter?.trim() || undefined,
  };

  let inserted = 0;
  let pagesFetched = 0;
  let totalReported = 0;
  let offset = 0;
  let pending: GramPanchayatSeedRecord[] = [];

  const flush = async (): Promise<void> => {
    if (pending.length === 0) return;
    await neo4jService.bulkUpsertGramPanchayats(pending);
    inserted += pending.length;
    pending = [];
  };

  const processPage = async (records: RawRecord[]): Promise<void> => {
    for (const raw of records) {
      const row = parseRow(raw);
      if (!row) continue;
      if (config.stateFilter && row.state.toLowerCase() !== config.stateFilter.toLowerCase())
        continue;

      pending.push(row);
      if (pending.length >= config.batchSize) {
        await flush();
      }
    }
  };

  const firstPage = await fetchPage(config, offset);
  pagesFetched += 1;
  totalReported = firstPage.total;
  await processPage(firstPage.records);
  offset += config.fetchLimit;

  while (true) {
    const page = await fetchPage(config, offset);
    if (page.records.length === 0) break;
    pagesFetched += 1;
    await processPage(page.records);
    offset += config.fetchLimit;
    if (page.records.length < config.fetchLimit) break;
  }

  await flush();

  return {
    inserted,
    pagesFetched,
    totalReported,
  };
}
