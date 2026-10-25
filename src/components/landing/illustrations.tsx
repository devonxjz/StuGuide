/**
 * Minh họa vector tự vẽ cho StuGuide – nền trong suốt, bảng màu tươi sáng của trẻ thơ.
 * Không phụ thuộc ảnh ngoài; đặt className để chỉnh kích thước.
 */

const C = {
  ink: "#1e293b",
  skin: "#fcd5b5",
  skinDark: "#e8b48f",
  blue: "#3b82f6",
  blueSoft: "#dbeafe",
  violet: "#8b5cf6",
  violetSoft: "#ede9fe",
  amber: "#fbbf24",
  amberSoft: "#fef3c7",
  coral: "#fb7185",
  coralSoft: "#ffe4e6",
  mint: "#34d399",
  mintSoft: "#d1fae5",
  sky: "#38bdf8",
  white: "#ffffff",
  line: "#e2e8f0",
  hairBrown: "#7c4a2d",
  hairDark: "#3f2a1d",
};

type SvgProps = { className?: string };

/* ───────────── Thành phần dùng chung ───────────── */

function Face({ r = 14 }: { r?: number }) {
  const k = r / 14;
  return (
    <g>
      <circle cx={-5 * k} cy={2 * k} r={1.7 * k} fill={C.ink} />
      <circle cx={5 * k} cy={2 * k} r={1.7 * k} fill={C.ink} />
      <circle cx={-8 * k} cy={6.5 * k} r={2.4 * k} fill={C.coral} opacity={0.35} />
      <circle cx={8 * k} cy={6.5 * k} r={2.4 * k} fill={C.coral} opacity={0.35} />
      <path d={`M ${-4 * k} ${7 * k} Q 0 ${10.5 * k} ${4 * k} ${7 * k}`} stroke={C.ink} strokeWidth={1.6 * k} fill="none" strokeLinecap="round" />
    </g>
  );
}

function Head({ hair, bun, pigtails }: { hair: string; bun?: boolean; pigtails?: boolean }) {
  return (
    <g>
      {bun && <circle cx={0} cy={-17} r={7} fill={hair} />}
      {pigtails && (
        <>
          <circle cx={-15} cy={-4} r={5.5} fill={hair} />
          <circle cx={15} cy={-4} r={5.5} fill={hair} />
        </>
      )}
      <circle r={14} fill={C.skin} />
      <path d="M -14.6 -1 A 14.6 14.6 0 0 1 14.6 -1 Q 6 -7 -2 -5 Q -9 -4 -14.6 -1 Z" fill={hair} />
      <Face />
    </g>
  );
}

/** Người đứng, gốc tọa độ = tâm đầu. */
function Person({
  x,
  y,
  s = 1,
  hair = C.hairBrown,
  shirt = C.blue,
  pants = C.ink,
  bun,
  pigtails,
  dress,
  armUp,
}: {
  x: number;
  y: number;
  s?: number;
  hair?: string;
  shirt?: string;
  pants?: string;
  bun?: boolean;
  pigtails?: boolean;
  dress?: boolean;
  armUp?: "left" | "right";
}) {
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <rect x={-9} y={40} width={7} height={22} rx={3.5} fill={dress ? C.skin : pants} />
      <rect x={2} y={40} width={7} height={22} rx={3.5} fill={dress ? C.skin : pants} />
      <ellipse cx={-5.5} cy={62} rx={5.5} ry={3} fill={C.ink} />
      <ellipse cx={5.5} cy={62} rx={5.5} ry={3} fill={C.ink} />
      <rect
        x={armUp === "left" ? -24 : -22}
        y={armUp === "left" ? -2 : 16}
        width={7}
        height={armUp === "left" ? 24 : 24}
        rx={3.5}
        fill={shirt}
        transform={armUp === "left" ? "rotate(20 -20 20)" : undefined}
      />
      <rect
        x={armUp === "right" ? 17 : 15}
        y={armUp === "right" ? -2 : 16}
        width={7}
        height={24}
        rx={3.5}
        fill={shirt}
        transform={armUp === "right" ? "rotate(-20 20 20)" : undefined}
      />
      {dress ? <path d="M -14 14 Q 0 8 14 14 L 20 46 Q 0 50 -20 46 Z" fill={shirt} /> : <rect x={-16} y={12} width={32} height={32} rx={12} fill={shirt} />}
      <Head hair={hair} bun={bun} pigtails={pigtails} />
    </g>
  );
}

function Sparkle({ x, y, s = 1, fill = C.amber }: { x: number; y: number; s?: number; fill?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -8 C1 -2 2 -1 8 0 C2 1 1 2 0 8 C-1 2 -2 1 -8 0 C-2 -1 -1 -2 0 -8 Z" fill={fill} />;
}

function Heart({ x, y, s = 1, fill = C.coral }: { x: number; y: number; s?: number; fill?: string }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 6 C-8 0 -10 -5 -6 -8 C-3 -10 0 -7 0 -5 C0 -7 3 -10 6 -8 C10 -5 8 0 0 6 Z" fill={fill} />;
}

function Block({ x, y, s = 22, fill, letter }: { x: number; y: number; s?: number; fill: string; letter: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={s} height={s} rx={4} fill={fill} />
      <rect x={3} y={3} width={s - 6} height={s - 6} rx={3} fill="none" stroke={C.white} strokeOpacity={0.5} strokeWidth={1.5} />
      <text x={s / 2} y={s / 2 + 5} textAnchor="middle" fontSize={s * 0.55} fontWeight={800} fill={C.white} fontFamily="ui-sans-serif, system-ui">
        {letter}
      </text>
    </g>
  );
}

function Ball({ x, y, r = 14 }: { x: number; y: number; r?: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle r={r} fill={C.coral} />
      <path d={`M ${-r} 0 Q 0 ${-r * 0.5} ${r} 0`} stroke={C.white} strokeWidth={r * 0.22} fill="none" />
      <path d={`M ${-r * 0.85} ${r * 0.5} Q 0 ${r * 0.1} ${r * 0.85} ${r * 0.5}`} stroke={C.amber} strokeWidth={r * 0.22} fill="none" />
      <circle cx={-r * 0.35} cy={-r * 0.45} r={r * 0.2} fill={C.white} opacity={0.5} />
    </g>
  );
}

/* ───────────── Minh họa tính năng ───────────── */

/** Chat → giáo án */
export function IllustrationPlan({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 240 160" className={className} aria-hidden>
      {/* Tờ giáo án */}
      <g transform="rotate(-4 120 85)">
        <rect x={78} y={18} width={96} height={128} rx={10} fill={C.white} stroke={C.line} strokeWidth={2} />
        <rect x={78} y={18} width={96} height={26} rx={10} fill={C.blue} />
        <rect x={78} y={34} width={96} height={10} fill={C.blue} />
        <rect x={90} y={27} width={40} height={6} rx={3} fill={C.white} opacity={0.9} />
        {[56, 76, 96, 116].map((y, i) => (
          <g key={y}>
            <rect x={90} y={y} width={10} height={10} rx={3} fill={[C.mint, C.amber, C.coral, C.violet][i]} />
            <rect x={106} y={y + 2} width={i % 2 ? 44 : 56} height={6} rx={3} fill={C.line} />
          </g>
        ))}
      </g>
      {/* Bong bóng chat */}
      <g>
        <rect x={14} y={36} width={72} height={34} rx={14} fill={C.violet} />
        <path d="M 30 68 L 24 80 L 40 70 Z" fill={C.violet} />
        <circle cx={36} cy={53} r={3.5} fill={C.white} />
        <circle cx={50} cy={53} r={3.5} fill={C.white} />
        <circle cx={64} cy={53} r={3.5} fill={C.white} />
      </g>
      <g>
        <rect x={156} y={96} width={72} height={32} rx={14} fill={C.sky} />
        <path d="M 210 126 L 218 138 L 200 128 Z" fill={C.sky} />
        <rect x={168} y={106} width={40} height={5} rx={2.5} fill={C.white} />
        <rect x={168} y={115} width={26} height={5} rx={2.5} fill={C.white} opacity={0.8} />
      </g>
      {/* Bút chì */}
      <g transform="translate(184 22) rotate(40)">
        <rect width={12} height={52} rx={2} fill={C.amber} />
        <rect width={12} height={8} rx={2} fill={C.coral} />
        <path d="M 0 52 L 6 64 L 12 52 Z" fill={C.skin} />
        <path d="M 4 59 L 6 64 L 8 59 Z" fill={C.ink} />
      </g>
      <Sparkle x={36} y={20} s={1.1} />
      <Sparkle x={210} y={78} s={0.8} fill={C.violet} />
      <Sparkle x={56} y={130} s={0.9} fill={C.mint} />
    </svg>
  );
}

/** Kiểm tra an toàn vật liệu */
export function IllustrationSafety({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 240 160" className={className} aria-hidden>
      <path d="M120 14 L170 32 V74 C170 108 148 130 120 144 C92 130 70 108 70 74 V32 Z" fill={C.mint} />
      <path d="M120 26 L160 40 V74 C160 101 143 119 120 131 C97 119 80 101 80 74 V40 Z" fill={C.mintSoft} />
      <path d="M100 78 L114 92 L142 62" stroke={C.mint} strokeWidth={10} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <Block x={18} y={112} fill={C.coral} letter="A" s={26} />
      <Block x={46} y={112} fill={C.blue} letter="B" s={26} />
      <Block x={32} y={84} fill={C.amber} letter="C" s={26} />
      <Ball x={200} y={122} r={18} />
      {/* Kính lúp */}
      <g transform="translate(186 28)">
        <circle r={16} fill={C.blueSoft} stroke={C.violet} strokeWidth={5} />
        <rect x={10} y={10} width={8} height={24} rx={4} fill={C.violet} transform="rotate(-45 14 14)" />
        <circle cx={-5} cy={-5} r={4} fill={C.white} opacity={0.8} />
      </g>
      <Sparkle x={44} y={34} fill={C.amber} />
      <Sparkle x={214} y={80} s={0.7} fill={C.coral} />
    </svg>
  );
}

/** Ghi nhớ về lớp */
export function IllustrationMemory({ className }: SvgProps) {
  const kids = [
    { x: 70, hair: C.hairDark, shirt: C.coral, pig: true },
    { x: 120, hair: C.hairBrown, shirt: C.amber },
    { x: 170, hair: C.ink, shirt: C.sky, pig: true },
  ];
  return (
    <svg viewBox="0 0 240 160" className={className} aria-hidden>
      {/* Bảng ghim */}
      <rect x={30} y={16} width={180} height={128} rx={14} fill={C.amberSoft} stroke={C.amber} strokeWidth={3} />
      {kids.map((k, i) => (
        <g key={k.x} transform={`rotate(${[-5, 3, -2][i]} ${k.x} 70)`}>
          <rect x={k.x - 22} y={34} width={44} height={56} rx={6} fill={C.white} />
          <rect x={k.x - 18} y={38} width={36} height={36} rx={4} fill={[C.coralSoft, C.violetSoft, C.blueSoft][i]} />
          <g transform={`translate(${k.x} 58)`}>
            <rect x={-12} y={10} width={24} height={10} rx={5} fill={k.shirt} />
            <Head hair={k.hair} pigtails={k.pig} />
          </g>
          <rect x={k.x - 14} y={79} width={28} height={4} rx={2} fill={C.line} />
          <circle cx={k.x} cy={33} r={4} fill={[C.coral, C.blue, C.mint][i]} />
        </g>
      ))}
      <rect x={52} y={104} width={60} height={8} rx={4} fill={C.white} />
      <rect x={52} y={118} width={40} height={8} rx={4} fill={C.white} />
      <Heart x={150} y={118} s={1.4} />
      <Sparkle x={180} y={116} fill={C.violet} />
      <Sparkle x={24} y={20} s={0.9} />
    </svg>
  );
}

/** Thẻ hoạt động cho phụ huynh ở nhà */
export function IllustrationFamily({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 240 160" className={className} aria-hidden>
      {/* Ngôi nhà */}
      <rect x={20} y={70} width={70} height={66} rx={6} fill={C.blueSoft} />
      <path d="M 12 74 L 55 36 L 98 74 Z" fill={C.coral} />
      <rect x={45} y={100} width={20} height={36} rx={4} fill={C.blue} />
      <rect x={28} y={82} width={14} height={14} rx={3} fill={C.amber} />
      <rect x={68} y={82} width={14} height={14} rx={3} fill={C.amber} />
      {/* Bố/mẹ + bé */}
      <Person x={132} y={60} hair={C.hairDark} shirt={C.violet} bun dress armUp="right" />
      <Person x={168} y={86} s={0.7} hair={C.hairBrown} shirt={C.mint} pants={C.blue} />
      <Ball x={196} y={140} r={11} />
      {/* Thẻ nhiệm vụ bay */}
      <g transform="translate(176 14) rotate(8)">
        <rect width={52} height={40} rx={8} fill={C.white} stroke={C.line} strokeWidth={2} />
        <rect x={8} y={8} width={20} height={5} rx={2.5} fill={C.violet} />
        <rect x={8} y={18} width={34} height={4} rx={2} fill={C.line} />
        <rect x={8} y={26} width={26} height={4} rx={2} fill={C.line} />
        <Heart x={42} y={10} s={0.6} />
      </g>
      <Sparkle x={110} y={24} fill={C.amber} />
      <Heart x={104} y={120} s={0.9} />
    </svg>
  );
}

/* ───────────── Minh họa vai trò ───────────── */

export function IllustrationTeacher({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden>
      <rect x={80} y={18} width={104} height={70} rx={8} fill={C.mint} />
      <rect x={86} y={24} width={92} height={58} rx={5} fill="#0f766e" />
      <text x={132} y={62} textAnchor="middle" fontSize={24} fontWeight={800} fill={C.white} fontFamily="ui-sans-serif, system-ui">
        A B C
      </text>
      <rect x={124} y={88} width={6} height={30} fill={C.mint} />
      <Person x={52} y={48} hair={C.hairDark} shirt={C.violet} bun dress armUp="right" />
      <Sparkle x={176} y={16} fill={C.amber} />
      <Block x={150} y={106} s={20} fill={C.coral} letter="1" />
      <Block x={172} y={106} s={20} fill={C.amber} letter="2" />
    </svg>
  );
}

export function IllustrationParent({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden>
      <circle cx={160} cy={30} r={16} fill={C.amber} />
      <Person x={72} y={40} hair={C.hairBrown} shirt={C.blue} armUp="right" />
      <Person x={118} y={70} s={0.7} hair={C.hairDark} shirt={C.coral} pigtails dress armUp="left" />
      <Heart x={98} y={26} s={1.3} />
      <Ball x={156} y={118} r={12} />
      <Sparkle x={30} y={30} fill={C.violet} />
    </svg>
  );
}

export function IllustrationSchool({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden>
      <rect x={40} y={56} width={120} height={70} rx={6} fill={C.amberSoft} />
      <path d="M 30 60 L 100 22 L 170 60 Z" fill={C.violet} />
      <circle cx={100} cy={46} r={10} fill={C.white} />
      <path d="M 100 40 V 46 L 104 49" stroke={C.ink} strokeWidth={2} fill="none" strokeLinecap="round" />
      <rect x={86} y={92} width={28} height={34} rx={4} fill={C.blue} />
      {[52, 132].map((x) => (
        <g key={x}>
          <rect x={x} y={70} width={18} height={16} rx={3} fill={C.sky} />
          <rect x={x} y={96} width={18} height={16} rx={3} fill={C.sky} />
        </g>
      ))}
      <rect x={99} y={4} width={2.5} height={20} fill={C.ink} />
      <path d="M 101.5 5 L 118 10 L 101.5 15 Z" fill={C.coral} />
      <circle cx={24} cy={116} r={12} fill={C.mint} />
      <rect x={22} y={116} width={4} height={14} fill={C.hairBrown} />
      <circle cx={178} cy={114} r={14} fill={C.mint} />
      <rect x={176} y={114} width={4} height={16} fill={C.hairBrown} />
      <Sparkle x={168} y={30} fill={C.amber} />
    </svg>
  );
}

/* ───────────── Vật trang trí nổi quanh hero ───────────── */

export function DecorBlocks({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 80 80" className={className} aria-hidden>
      <Block x={6} y={42} fill={C.coral} letter="A" s={32} />
      <Block x={40} y={42} fill={C.blue} letter="B" s={32} />
      <Block x={23} y={8} fill={C.amber} letter="C" s={32} />
    </svg>
  );
}

export function DecorBall({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 60 60" className={className} aria-hidden>
      <Ball x={30} y={30} r={26} />
    </svg>
  );
}

export function DecorCrayon({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 40 110" className={className} aria-hidden>
      <rect x={8} y={20} width={24} height={80} rx={4} fill={C.violet} />
      <rect x={8} y={36} width={24} height={8} fill={C.white} opacity={0.5} />
      <rect x={8} y={80} width={24} height={8} fill={C.white} opacity={0.5} />
      <path d="M 8 20 L 20 2 L 32 20 Z" fill={C.violet} />
      <path d="M 16 8 L 20 2 L 24 8 Z" fill={C.ink} opacity={0.4} />
    </svg>
  );
}

export function DecorStar({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 60 60" className={className} aria-hidden>
      <path d="M30 4 L37 21 L56 23 L42 36 L46 55 L30 45 L14 55 L18 36 L4 23 L23 21 Z" fill={C.amber} stroke={C.white} strokeWidth={3} strokeLinejoin="round" />
      <circle cx={24} cy={30} r={2.4} fill={C.ink} />
      <circle cx={36} cy={30} r={2.4} fill={C.ink} />
      <path d="M 26 37 Q 30 40 34 37" stroke={C.ink} strokeWidth={2} fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function DecorPlane({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 80 60" className={className} aria-hidden>
      <path d="M 4 30 L 76 6 L 52 54 L 38 36 Z" fill={C.sky} />
      <path d="M 38 36 L 76 6 L 44 44 Z" fill="#0ea5e9" />
      <path d="M 38 36 L 40 50 L 46 42" fill="#0284c7" />
    </svg>
  );
}

export function DecorKids({ className }: SvgProps) {
  return (
    <svg viewBox="0 0 220 120" className={className} aria-hidden>
      <Person x={50} y={30} s={0.85} hair={C.hairDark} shirt={C.coral} pigtails dress armUp="right" />
      <Person x={110} y={24} s={0.95} hair={C.hairBrown} shirt={C.blue} armUp="left" />
      <Person x={170} y={30} s={0.85} hair={C.ink} shirt={C.mint} armUp="right" />
    </svg>
  );
}
