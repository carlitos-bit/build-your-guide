import { normalizeAvatar } from "@/lib/avatar";
import { cn } from "@/lib/utils";

export function StudentAvatar({ value, className, portrait = false }: { value?: unknown; className?: string; portrait?: boolean }) {
  const a = normalizeAvatar(value);
  const skin = `avatar-skin-${a.skin}`;
  const hair = `avatar-hair-${a.hairColor}`;
  const outfit = `avatar-outfit-${a.outfitColor}`;
  const width = a.body === 1 ? 42 : a.body === 2 ? 29 : 35;
  return (
    <svg viewBox={portrait ? "34 8 112 112" : "0 0 180 260"} className={cn("shrink-0", className)} role="img" aria-label="Avatar personnalisé">
      {!portrait && <ellipse cx="90" cy="247" rx="49" ry="5" className="fill-foreground/10" />}
      <path d="M66 184h22v48H65zm26 0h22l1 48H93z" className="fill-avatar-denim" />
      {a.shoes === 1 ? <path d="M64 219h24v23H54q0-12 10-12zm29 0h23v11q12 0 12 12H93z" className="fill-avatar-hair-0" /> : <path d="M64 231h24v12H52q-1-10 12-12zm29 0h23q14 3 14 12H93z" className={a.shoes === 0 ? "fill-primary-foreground stroke-foreground" : "fill-avatar-hair-1"} strokeWidth="2" />}
      <path d={`M${90-width} 118q-17 8-20 54l12 3 14-36h${2*width-12}l14 36 12-3q-3-46-20-54z`} className={`fill-${outfit}`} />
      <path d={`M${90-width+4} 118q34-14 ${2*width-8} 0l7 72H${90-width-3}z`} className={`fill-${outfit}`} />
      {a.clothes === 1 && <><path d="M71 115q-6 20 19 21 25-1 19-21M90 134v27" className="fill-none stroke-primary-foreground/60" strokeWidth="3" /><rect x="74" y="161" width="32" height="14" rx="5" className="fill-foreground/15" /></>}
      {a.clothes === 2 && <><path d="M90 117v72M74 122l9 20 7-9 7 9 9-20" className="fill-none stroke-primary-foreground" strokeWidth="4" /><path d="M74 157h-10m42 0h10" className="stroke-primary-foreground/70" strokeWidth="3" /></>}
      {a.clothes === 3 && <path d={`M${90-width+4} 144h${2*width-8}l18 61H${90-width-14}z`} className={`fill-${outfit}`} />}
      {a.clothes === 0 && <path d="m82 148 5 5 11-13" className="stroke-primary-foreground fill-none" strokeWidth="4" strokeLinecap="round" />}
      <circle cx={90-width-13} cy="177" r="7" className={`fill-${skin}`} /><circle cx={90+width+13} cy="177" r="7" className={`fill-${skin}`} />
      <rect x="80" y="97" width="20" height="27" rx="9" className={`fill-${skin}`} />
      {a.hair === 1 && <path d="M48 61q0-39 42-39t42 39v66q-18 8-32-12H80q-15 20-32 12z" className={`fill-${hair}`} />}
      <circle cx="52" cy="77" r="8" className={`fill-${skin}`} /><circle cx="128" cy="77" r="8" className={`fill-${skin}`} />
      <rect x="54" y="33" width="72" height="76" rx={a.head === 0 ? 31 : a.head === 1 ? 36 : 18} className={`fill-${skin}`} />
      {a.hair === 0 && <path d="M52 65V48q1-29 38-29 39 0 39 29v17l-13-24q-19 13-47 9z" className={`fill-${hair}`} />}
      {a.hair === 1 && <path d="M52 69V47q0-27 38-27 41 0 40 29v24l-20-33q-25 21-45 13z" className={`fill-${hair}`} />}
      {a.hair === 2 && <g className={`fill-${hair}`}>{[[58,42],[67,29],[84,26],[102,27],[117,35],[125,48]].map(([cx,cy]) => <circle key={cx} cx={cx} cy={cy} r="14" />)}</g>}
      {a.hair === 3 && <g className={`fill-${hair}`}><circle cx="90" cy="17" r="15" /><path d="M52 62V46q0-27 38-27t38 27v16l-12-21q-29 10-52 0z" /></g>}
      <g className="stroke-avatar-ink fill-none" strokeWidth="3" strokeLinecap="round">
        <path d="M69 64h11m20 0h11" strokeWidth="2" />
        {a.face === 1 ? <path d="m70 76 4-4 4 4m24 0 4-4 4 4" /> : <><path d="M74 74v4" />{a.face === 3 ? <path d="m102 76 8-2" /> : <path d="M106 74v4" />}</>}
        <path d="m88 79-2 7h5" strokeWidth="2" />
        {a.face === 2 ? <path d="M82 95h16" /> : <path d="M80 92q10 12 20 0" />}
      </g>
      {a.accessory === 1 && <g className="stroke-avatar-ink fill-none" strokeWidth="3"><rect x="62" y="69" width="23" height="15" rx="5" /><rect x="95" y="69" width="23" height="15" rx="5" /><path d="M85 75h10m-40-3 7 3m56 0 7-3" /></g>}
      {a.accessory === 2 && <g className="fill-avatar-denim"><path d="M50 51q2-32 40-32 40 0 42 32z" /><rect x="71" y="45" width="70" height="9" rx="4" /></g>}
      {a.accessory === 3 && <><path d="M45 75V59q0-40 45-40t45 40v16" className="stroke-avatar-ink fill-none" strokeWidth="7" /><rect x="42" y="63" width="13" height="27" rx="6" className="fill-accent" /><rect x="125" y="63" width="13" height="27" rx="6" className="fill-accent" /></>}
      {a.accessory === 4 && <g className="stroke-trofeu fill-none" strokeWidth="4"><circle cx="51" cy="88" r="6" /><circle cx="129" cy="88" r="6" /></g>}
    </svg>
  );
}