export type TemperatureEntry = {
  tminC: number | null;
  tmaxC: number | null;
};

export type AggregatedResult = {
  avgTminC: number | null;
  avgTmaxC: number | null;
  daysCountTmin: number;
  daysCountTmax: number;
};

const safeAverage = (values: Array<number | null>): { avg: number | null; count: number } => {
  const filtered = values.filter((value): value is number => typeof value === 'number');
  if (filtered.length === 0) {
    return { avg: null, count: 0 };
  }
  const sum = filtered.reduce((total, value) => total + value, 0);
  return { avg: sum / filtered.length, count: filtered.length };
};

export const aggregateTemperatureEntries = (entries: TemperatureEntry[]): AggregatedResult => {
  const { avg: avgTminC, count: daysCountTmin } = safeAverage(entries.map((e) => e.tminC));
  const { avg: avgTmaxC, count: daysCountTmax } = safeAverage(entries.map((e) => e.tmaxC));

  return { avgTminC, avgTmaxC, daysCountTmin, daysCountTmax };
};
