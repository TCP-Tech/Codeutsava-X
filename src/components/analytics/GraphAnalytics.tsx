'use client';

import { Activity, Users } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import styles from './GraphAnalytics.module.css';

export type GraphDataPoint = { label: string; teams: number; participants: number };

const DEFAULT_GROWTH_DATA: readonly GraphDataPoint[] = [
  { label: '2016', teams: 120, participants: 400 },
  { label: '2018', teams: 200, participants: 800 },
  { label: '2020', teams: 450, participants: 1600 },
  { label: '2022', teams: 580, participants: 1900 },
  { label: '2023', teams: 640, participants: 2500 },
  { label: '2024', teams: 820, participants: 3300 },
];

type GraphAnalyticsProps = { data?: readonly GraphDataPoint[]; className?: string };
type TooltipData = { active?: boolean; label?: string; payload?: Array<{ value?: number; payload?: GraphDataPoint }>; suffix: string };
type BarShape = { x?: number; y?: number; width?: number; height?: number; fill?: string; payload?: GraphDataPoint; activeLabel: string | null };

const formatNumber = (value: number) => new Intl.NumberFormat('en-IN').format(value);

function ChartTooltip({ active, label, payload, suffix }: TooltipData) {
  if (!active || payload?.[0]?.value === undefined) return null;
  return <div className={styles.tooltip}><span>{payload[0].payload?.label ?? label}</span><strong>{formatNumber(payload[0].value)} {suffix}</strong></div>;
}

function ParticipationBar({ x = 0, y = 0, width = 0, height = 0, fill = '#ff5fcf', payload, activeLabel }: BarShape) {
  const isActive = payload?.label === activeLabel;
  const growth = isActive ? 5 : 0;
  return <rect x={x} y={y - growth / 2} width={width} height={height + growth} rx={(height + growth) / 2} fill={fill} className={styles.participationBar} style={{ outline : 'none', filter: isActive ? 'drop-shadow(0 0 7px rgba(255, 95, 207, 0.72))' : undefined }} />;
}

export function GraphAnalytics({ data = DEFAULT_GROWTH_DATA, className = '' }: GraphAnalyticsProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false);
  const [activeParticipationLabel, setActiveParticipationLabel] = useState<string | null>(null);
  const chartData = [...data];

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setHasEnteredViewport(true);
        observer.disconnect();
      }
    }, { threshold: 0.28 });


  return (
<div className="relative mx-auto max-w-7xl">
    <div className="mb-10 flex flex-col gap-6 sm:mb-14 md:flex-row md:items-end md:justify-between">
        <div className="max-w-2xl">
            {/* <p className="mb-3 flex items-center gap-2 font-mono text-[10px] tracking-[0.32em] text-cyan-200/80"><Zap className="h-3.5 w-3.5" /> LIVE ARCHIVE / 2016—2024</p> */}
        <h2 id="analytics-title" data-text="GRAPH AND ANALYTICS." className={`${styles.sponsorHeading} uppercase leading-[.85]`}>GRAPH AND ANALYTICS.</h2>
        </div>
        <p className="max-w-sm border-l border-[#ff5fcf]/60 pl-4 font-mono text-xs leading-relaxed text-white/60">Hover or select any signal point to inspect how the Codeutsava universe keeps expanding.</p>
    </div>
    <section ref={sectionRef} id="analytics" className={`${styles.section} ${className}`} aria-labelledby="analytics-title">
      <div className={styles.gridOverlay} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />
      <div className={styles.content}>
        <header className={styles.intro}>
          <h2 id="analytics-title" className={styles.sectionHeading}>GRAPH AND ANALYTICS</h2>
          {/* <p className={styles.bodyCopy}>Explore Codeutsava&apos;s participations</p> */}
        </header>

        <div className={styles.chartGrid}>
          <article className={styles.chartCard} aria-labelledby="teams-chart-title">
            <header className={styles.chartCardHeader}><p id="teams-chart-title" className={styles.metricLabel}><Users size={19} /> Total number of teams</p><span className={styles.metricNote}>2016 — 2024</span></header>
            <div className={styles.chartFrame}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart key={hasEnteredViewport ? 'teams-revealed' : 'teams-pending'} data={chartData} margin={{ top: 18, right: 12, bottom: 2, left: -14 }} accessibilityLayer={false} style={{ outline: 'none' }}>
                  <defs><linearGradient id="teams-area" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#ff5fcf" stopOpacity={0.55} /><stop offset="100%" stopColor="#ff5fcf" stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid vertical={false} stroke="rgba(250,235,146,0.13)" strokeDasharray="3 6" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'rgba(250,235,146,0.7)', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} width={42} tickFormatter={formatNumber} tick={{ fill: 'rgba(250,235,146,0.55)', fontFamily: 'var(--font-mono)', fontSize: 10 }} />
                  <Tooltip cursor={{ stroke: '#faeb92', strokeOpacity: 0.38, strokeDasharray: '3 4' }} content={<ChartTooltip suffix="teams" />} />
                  <Area type="monotone" dataKey="teams" stroke="#ff5fcf" strokeWidth={3} fill="url(#teams-area)" activeDot={{ r: 7, fill: '#05020a', stroke: '#faeb92', strokeWidth: 3 }} isAnimationActive={hasEnteredViewport} animationBegin={100} animationDuration={1900} animationEasing="ease-out" style={{ outline: 'none', pointerEvents: 'none' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </article>

          <article className={styles.chartCard} aria-labelledby="participation-chart-title">
            <header className={styles.chartCardHeader}><p id="participation-chart-title" className={styles.metricLabel}><Activity size={19} /> Total participation</p><span className={styles.metricNote}>2016 - 2024</span></header>
            <div className={styles.chartFrame}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart key={hasEnteredViewport ? 'participation-revealed' : 'participation-pending'} data={chartData} layout="vertical" margin={{ top: 7, right: 14, bottom: 7, left: 0 }} accessibilityLayer={false} onMouseMove={(state : any) => { const point = state?.activePayload?.[0]?.payload as GraphDataPoint | undefined; setActiveParticipationLabel(point?.label ?? null); }} onMouseLeave={() => setActiveParticipationLabel(null)} style={{ outline: 'none' }}>
                  <defs><linearGradient id="participation-bars" x1="0" x2="1" y1="0" y2="0"><stop offset="0%" stopColor="#9929ea" /><stop offset="58%" stopColor="#c056f6" /><stop offset="100%" stopColor="#ff5fcf" /></linearGradient></defs>
                  <CartesianGrid horizontal={false} stroke="rgba(250,235,146,0.1)" strokeDasharray="3 6" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="label" type="category" axisLine={false} tickLine={false} width={38} tick={{ fill: 'rgba(250,235,146,0.72)', fontFamily: 'var(--font-mono)', fontSize: 11 }} />
                  <Tooltip cursor={{ fill: 'rgba(255,95,207,0.08)' }} content={<ChartTooltip suffix="participants" />} />
                  <Bar dataKey="participants" fill="url(#participation-bars)" barSize={18} tabIndex={-1} style={{ outline: 'none' }} shape={(props) => <ParticipationBar {...props} activeLabel={activeParticipationLabel} />} isAnimationActive={hasEnteredViewport} animationBegin={350} animationDuration={1900} animationEasing="ease-out" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>
      </div>
    </section>
</div>
  );
