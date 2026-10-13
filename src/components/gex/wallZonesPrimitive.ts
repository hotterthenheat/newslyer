/*
==================================================
  SLAYER TERMINAL - THE WALL'S TWO ZONES ON A CHART
  (components/gex/wallZonesPrimitive.ts)

  What At the wall draws on today's price that the
  library's own series cannot (the chart stays the
  library's — the crosshair, the axes and the line
  are untouched):

    TWO ZONES   plain boxes AHEAD OF NOW, from the
                wall's price to where price goes:
                one if the wall breaks, one if it
                holds. Each as tall as the distance,
                each with its odds and its words
                inside. Boxes, never a band that
                widens.
    THE WALL    a line from its first test today (or
                from now, untested) to the end of
                the zones — never across the whole
                day (Noah, 2026-09-26: levels across
                a chart's face "block the look of
                it").
    THE TESTS   a dot ON the price line where price
                tested the wall: silver where it
                held, warm where it broke.
    NOW         a dashed rule.

  The zones sit under the price line; the wall, the
  dots and the words sit over it.
==================================================
*/

import type { IChartApi, IPrimitivePaneRenderer, IPrimitivePaneView, ISeriesApi, ISeriesPrimitive, SeriesAttachedParameter, SeriesType, Time, UTCTimestamp } from 'lightweight-charts';

interface BitmapScope {
  context: CanvasRenderingContext2D;
  horizontalPixelRatio: number;
  verticalPixelRatio: number;
  mediaSize: { width: number; height: number };
}
interface DrawTarget {
  useBitmapCoordinateSpace(cb: (scope: BitmapScope) => void): void;
}

const SANS = "'Inter', -apple-system, 'Segoe UI', sans-serif";

export interface WallZone {
  key: 'breaks' | 'holds';
  /** The wall's price and where price goes — either order */
  from: number;
  to: number;
  fill: string;
  edge: string;
  title: string;
  titleInk: string;
  sub: string;
  subInk: string;
}
export interface WallZonesData {
  /** Now, and the end of the room ahead — unix seconds, both on the chart's time scale */
  t0: number;
  t1: number;
  zones: WallZone[];
  wall: { price: number; from: number; color: string } | null;
  marks: { time: number; price: number; color: string }[];
  nowInk: string;
  /** The plot's own ground — a dot wears a ring of it */
  ground: string;
}

const EMPTY: WallZonesData = { t0: 0, t1: 0, zones: [], wall: null, marks: [], nowInk: 'transparent', ground: 'transparent' };

class UnderRenderer implements IPrimitivePaneRenderer {
  constructor(private readonly source: WallZonesPrimitive) {}
  draw(target: DrawTarget): void {
    const { chart, series, data } = this.source;
    if (!chart || !series || !data.t0) return;
    const ts = chart.timeScale();
    const xa = ts.timeToCoordinate(data.t0 as UTCTimestamp);
    const xb = ts.timeToCoordinate(data.t1 as UTCTimestamp);
    if (xa == null || xb == null) return;
    target.useBitmapCoordinateSpace(scope => {
      const ctx = scope.context;
      const hr = scope.horizontalPixelRatio;
      const vr = scope.verticalPixelRatio;
      const H = scope.mediaSize.height * vr;
      const left = xa * hr;
      const width = Math.max(0, (xb - xa) * hr);
      /* now: a dashed rule, top to bottom */
      ctx.strokeStyle = data.nowInk;
      ctx.lineWidth = Math.max(1, Math.round(hr));
      ctx.setLineDash([2 * vr, 3 * vr]);
      ctx.beginPath();
      ctx.moveTo(Math.round(left) + 0.5, 0);
      ctx.lineTo(Math.round(left) + 0.5, H);
      ctx.stroke();
      ctx.setLineDash([]);
      for (const z of data.zones) {
        const y0 = series.priceToCoordinate(z.from);
        const y1 = series.priceToCoordinate(z.to);
        if (y0 == null || y1 == null) continue;
        const top = Math.min(y0, y1) * vr;
        const h = Math.abs(y1 - y0) * vr;
        if (h < 2 || width < 4) continue;
        ctx.fillStyle = z.fill;
        ctx.strokeStyle = z.edge;
        ctx.lineWidth = Math.max(1, Math.round(vr));
        ctx.beginPath();
        ctx.roundRect(left + 0.5, top + 0.5, width - 1, h - 1, 5 * hr);
        ctx.fill();
        ctx.stroke();
      }
    });
  }
}

class OverRenderer implements IPrimitivePaneRenderer {
  constructor(private readonly source: WallZonesPrimitive) {}
  draw(target: DrawTarget): void {
    const { chart, series, data } = this.source;
    if (!chart || !series || !data.t0) return;
    const ts = chart.timeScale();
    const xa = ts.timeToCoordinate(data.t0 as UTCTimestamp);
    const xb = ts.timeToCoordinate(data.t1 as UTCTimestamp);
    if (xa == null || xb == null) return;
    target.useBitmapCoordinateSpace(scope => {
      const ctx = scope.context;
      const hr = scope.horizontalPixelRatio;
      const vr = scope.verticalPixelRatio;
      const left = xa * hr;
      const width = Math.max(0, (xb - xa) * hr);
      /* the zones' words — the title always when the box takes it, the second line only with room for both */
      for (const z of data.zones) {
        const y0 = series.priceToCoordinate(z.from);
        const y1 = series.priceToCoordinate(z.to);
        if (y0 == null || y1 == null) continue;
        const top = Math.min(y0, y1) * vr;
        const h = Math.abs(y1 - y0) * vr;
        const room = width - 24 * hr;
        if (h < 18 * vr || room < 48 * hr) continue;
        const two = h >= 40 * vr;
        const mid = top + h / 2;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        const fits = (text: string) => ctx.measureText(text).width <= room;
        /* the title at its size, a size down in a narrow box, never cut */
        ctx.font = `650 ${13 * vr}px ${SANS}`;
        if (!fits(z.title)) ctx.font = `650 ${11 * vr}px ${SANS}`;
        if (fits(z.title)) {
          ctx.fillStyle = z.titleInk;
          ctx.fillText(z.title, left + 12 * hr, two ? mid - 8 * vr : mid);
        }
        if (two && z.sub) {
          ctx.font = `400 ${11 * vr}px ${SANS}`;
          /* the words cut at the box's room, never past its edge */
          let words = z.sub;
          while (words && !fits(words)) {
            const cut = words.replace(/…$/, '').lastIndexOf(' ');
            words = cut <= 0 ? '' : `${words.slice(0, cut).replace(/[ ·,]+$/, '')}…`;
          }
          if (words) {
            ctx.fillStyle = z.subInk;
            ctx.fillText(words, left + 12 * hr, mid + 9 * vr);
          }
        }
      }
      /* the wall: from its first test, or from now */
      if (data.wall) {
        const y = series.priceToCoordinate(data.wall.price);
        const xf = ts.timeToCoordinate(data.wall.from as UTCTimestamp);
        if (y != null) {
          const from = (xf ?? xa) * hr;
          ctx.strokeStyle = data.wall.color;
          ctx.lineWidth = 1.5 * vr;
          ctx.beginPath();
          ctx.moveTo(from, y * vr);
          ctx.lineTo(left + width, y * vr);
          ctx.stroke();
        }
      }
      /* the tests: a dot on the price line, ringed in the plot's own ground */
      for (const m of data.marks) {
        const x = ts.timeToCoordinate(m.time as UTCTimestamp);
        const y = series.priceToCoordinate(m.price);
        if (x == null || y == null) continue;
        ctx.beginPath();
        ctx.arc(x * hr, y * vr, 4.5 * hr, 0, Math.PI * 2);
        ctx.fillStyle = m.color;
        ctx.fill();
        ctx.lineWidth = 2 * hr;
        ctx.strokeStyle = data.ground;
        ctx.stroke();
      }
    });
  }
}

class View implements IPrimitivePaneView {
  constructor(
    private readonly r: IPrimitivePaneRenderer,
    private readonly z: 'bottom' | 'top'
  ) {}
  zOrder(): 'bottom' | 'top' {
    return this.z;
  }
  renderer(): IPrimitivePaneRenderer {
    return this.r;
  }
}

export class WallZonesPrimitive implements ISeriesPrimitive<Time> {
  chart: IChartApi | null = null;
  series: ISeriesApi<SeriesType> | null = null;
  data: WallZonesData = EMPTY;
  private requestUpdate?: () => void;
  private readonly views: View[];
  constructor() {
    this.views = [new View(new UnderRenderer(this), 'bottom'), new View(new OverRenderer(this), 'top')];
  }
  attached(param: SeriesAttachedParameter<Time>): void {
    this.chart = param.chart;
    this.series = param.series;
    this.requestUpdate = param.requestUpdate;
  }
  detached(): void {
    this.chart = null;
    this.series = null;
    this.requestUpdate = undefined;
  }
  paneViews(): View[] {
    return this.views;
  }
  update(data: WallZonesData): void {
    this.data = data;
    this.requestUpdate?.();
  }
}
