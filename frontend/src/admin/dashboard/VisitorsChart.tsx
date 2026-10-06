import { useLayoutEffect, useRef, useState, type PointerEvent } from 'react';
import type { Stats } from '../types';
import { formatDay, formatNumber } from '../../lib/format';

type Point = Stats['daily'][number];

const HEIGHT = 240;
const PAD = { top: 16, right: 20, bottom: 30, left: 40 };

/** Graduation « ronde » : 0, 5, 10… ou 0, 20, 40… selon le maximum. */
function niceScale(max: number): { top: number; ticks: number[] } {
  if (max <= 0) {
    return { top: 4, ticks: [0, 2, 4] };
  }

  const rough = max / 4;
  const power = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 5, 10].map((factor) => factor * power).find((candidate) => candidate >= rough) ?? rough;
  const top = Math.ceil(max / step) * step;
  const ticks: number[] = [];

  for (let value = 0; value <= top + step / 2; value += step) {
    ticks.push(value);
  }

  return { top, ticks };
}

/**
 * Visiteurs par jour : une seule série, donc pas de légende (le titre du
 * bloc la nomme). Trait de 2 px, voile à 10 %, graduations discrètes.
 *
 * Au survol (ou au doigt), une ligne de repère et une bulle donnent le jour,
 * les visiteurs et les pages vues. Les mêmes chiffres existent sous forme de
 * tableau pour les lecteurs d'écran.
 */
export default function VisitorsChart({ data }: { data: Point[] }) {
  const frameRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  const [hover, setHover] = useState<number | null>(null);

  // Mesuré avant le premier affichage : le graphique ne déborde jamais,
  // même un instant, sur un écran étroit. (Le panel n'est jamais pré-rendu.)
  useLayoutEffect(() => {
    const frame = frameRef.current;

    if (!frame) {
      return;
    }

    setWidth(Math.max(280, frame.clientWidth));

    const observer = new ResizeObserver(([entry]) => setWidth(Math.max(280, Math.round(entry.contentRect.width))));
    observer.observe(frame);

    return () => observer.disconnect();
  }, []);

  const n = data.length;
  const { top, ticks } = niceScale(Math.max(0, ...data.map((point) => point.visitors)));
  const plotWidth = width - PAD.left - PAD.right;
  const plotHeight = HEIGHT - PAD.top - PAD.bottom;

  const x = (index: number) => PAD.left + (n <= 1 ? plotWidth / 2 : (index * plotWidth) / (n - 1));
  const y = (value: number) => PAD.top + plotHeight - (value / top) * plotHeight;

  const line = data.map((point, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)},${y(point.visitors).toFixed(1)}`).join(' ');
  const area = n > 0 ? `${line} L${x(n - 1).toFixed(1)},${y(0)} L${x(0).toFixed(1)},${y(0)} Z` : '';

  // Trois dates au plus sous l'axe : le début, le milieu, la fin.
  const labelled = n <= 1 ? [0] : [0, Math.floor((n - 1) / 2), n - 1];

  const onPointer = (event: PointerEvent<SVGSVGElement>) => {
    const box = event.currentTarget.getBoundingClientRect();
    const relative = ((event.clientX - box.left) / box.width) * width;
    const index = Math.round(((relative - PAD.left) / plotWidth) * (n - 1));
    setHover(Math.min(n - 1, Math.max(0, index)));
  };

  const last = n - 1;
  const active = hover ?? null;
  const tooltipLeft = active !== null ? Math.min(Math.max(x(active), 80), width - 80) : 0;

  return (
    <div ref={frameRef} className="relative w-full">
      <svg
        width={width}
        height={HEIGHT}
        viewBox={`0 0 ${width} ${HEIGHT}`}
        role="img"
        aria-label="Visiteurs par jour sur la période"
        onPointerMove={onPointer}
        onPointerDown={onPointer}
        onPointerLeave={() => setHover(null)}
        className="block touch-pan-y select-none"
      >
        {/* Graduations : traits fins, pleins, un cran au-dessus du fond. */}
        {ticks.map((tick) => (
          <g key={tick}>
            <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} className="stroke-surface-container" strokeWidth={1} />
            <text x={PAD.left - 10} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-on-surface-variant text-[11px] tabular-nums">
              {formatNumber(tick)}
            </text>
          </g>
        ))}

        {labelled.map((index) => (
          <text
            key={index}
            x={x(index)}
            y={HEIGHT - 8}
            textAnchor={index === 0 ? 'start' : index === n - 1 ? 'end' : 'middle'}
            className="fill-on-surface-variant text-[11px]"
          >
            {formatDay(data[index].date)}
          </text>
        ))}

        <path d={area} className="fill-brand-blue/10" />
        <path d={line} fill="none" className="stroke-brand-blue" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

        {/* Dernier point, avec sa valeur : le chiffre du jour. */}
        {n > 0 && active === null && (
          <g>
            <circle cx={x(last)} cy={y(data[last].visitors)} r={4} strokeWidth={2} className="fill-brand-blue stroke-white" />
            {/* Liseré blanc sous le chiffre : lisible même posé sur la courbe. */}
            <text
              x={x(last) - 8}
              y={y(data[last].visitors) - 10}
              textAnchor="end"
              paintOrder="stroke"
              strokeWidth={4}
              strokeLinejoin="round"
              className="fill-primary stroke-white text-xs font-semibold tabular-nums"
            >
              {formatNumber(data[last].visitors)}
            </text>
          </g>
        )}

        {active !== null && (
          <g>
            <line x1={x(active)} x2={x(active)} y1={PAD.top} y2={PAD.top + plotHeight} className="stroke-on-surface-variant/40" strokeWidth={1} />
            <circle cx={x(active)} cy={y(data[active].visitors)} r={5} strokeWidth={2} className="fill-brand-blue stroke-white" />
          </g>
        )}
      </svg>

      {active !== null && (
        <div
          // Bulle réservée à la souris et au doigt : un lecteur d'écran
          // l'annoncerait à chaque mouvement, et il a déjà le tableau.
          aria-hidden="true"
          className="pointer-events-none absolute top-0 -translate-x-1/2 rounded-xl bg-primary px-3 py-2 text-xs text-white shadow-lg"
          style={{ left: tooltipLeft }}
        >
          <p className="font-semibold">{formatDay(data[active].date, true)}</p>
          <p className="mt-0.5 text-on-primary-soft">
            {formatNumber(data[active].visitors)} visiteur{data[active].visitors > 1 ? 's' : ''}
          </p>
          <p className="text-on-primary-variant">
            {formatNumber(data[active].pageviews)} page{data[active].pageviews > 1 ? 's' : ''} vue{data[active].pageviews > 1 ? 's' : ''}
          </p>
        </div>
      )}

      {/*
        sr-only sur l'enveloppe, jamais sur la <table> : un tableau ignore la
        hauteur de 1 px qu'impose sr-only, et ses lignes invisibles
        allongeaient la page d'un grand vide sous le tableau de bord.
      */}
      <div className="sr-only">
        <table>
          <caption>Visiteurs et pages vues par jour</caption>
          <thead>
            <tr>
              <th scope="col">Jour</th>
              <th scope="col">Visiteurs</th>
              <th scope="col">Pages vues</th>
            </tr>
          </thead>
          <tbody>
            {data.map((point) => (
              <tr key={point.date}>
                <th scope="row">{formatDay(point.date, true)}</th>
                <td>{point.visitors}</td>
                <td>{point.pageviews}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
