

import { trpc } from "@/lib/trpc";
import {
  AreaChart,
  Area,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

interface TideSparklineProps {
  spotId: number | undefined;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  return (
    <div
      className="bg-white border border-black px-2 py-1 text-[9px] uppercase tracking-wide shadow-sm"
      style={{ fontFamily: "'JetBrains Mono', monospace" }}
    >
      <div>{d.label}</div>
      <div>{d.heightFt.toFixed(1)}ft · {d.phase ?? "—"}</div>
    </div>
  );
};

const formatHour = (h: number) => {
  if (h === 0) return "12a";
  if (h === 12) return "12p";
  return h < 12 ? `${h}a` : `${h - 12}p`;
};

export function TideSparkline({ spotId }: TideSparklineProps) {
  const currentHour = new Date().getHours();

  const { data, isLoading } = trpc.forecasts.getTimeline.useQuery(
    { spotId: spotId!, hours: 24 },
    { enabled: spotId != null, staleTime: 30 * 60 * 1000 }
  );

  const points = data?.timeline
    .filter((pt) => pt.tideHeightFt != null)
    .map((pt) => ({
      hour: new Date(pt.forecastTimestamp).getHours(),
      label: formatHour(new Date(pt.forecastTimestamp).getHours()),
      heightFt: pt.tideHeightFt! / 10,
      phase: pt.tidePhase,
    })) ?? [];

  const currentPoint = points.find((p) => p.hour === currentHour);
  const currentHeightFt = currentPoint?.heightFt;

  const monoFont = { fontFamily: "'JetBrains Mono', monospace" };

  if (!spotId) return null;

  if (isLoading) {
    return (
      <div className="h-[70px] bg-gray-50 animate-pulse rounded-sm" />
    );
  }

  if (!points.length) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[9px] uppercase tracking-widest text-gray-600" style={monoFont}>
          Today's Tide
        </span>
        {currentHeightFt != null && (
          <span className="text-[9px] uppercase tracking-wide text-slate-700 font-bold" style={monoFont}>
            {currentHeightFt.toFixed(1)}ft · {currentPoint?.phase ?? ""}
          </span>
        )}
      </div>
      <ResponsiveContainer width="100%" height={68}>
        <AreaChart data={points} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="tideGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <Tooltip content={<CustomTooltip />} cursor={{ stroke: "#cbd5e1", strokeWidth: 1 }} />
          <ReferenceLine
            x={currentHour}
            stroke="#000000"
            strokeWidth={1.5}
            strokeDasharray="3 3"
          />
          <Area
            type="monotone"
            dataKey="heightFt"
            stroke="#64748b"
            strokeWidth={1.5}
            fill="url(#tideGradient)"
            dot={false}
            activeDot={{ r: 3, fill: "#1e293b", stroke: "none" }}
          />
        </AreaChart>
      </ResponsiveContainer>
      {/* Hour markers */}
      <div className="flex justify-between px-0 mt-0.5">
        {[0, 6, 12, 18, 23].map((h) => (
          <span
            key={h}
            className="text-[8px] text-gray-500"
            style={monoFont}
          >
            {formatHour(h)}
          </span>
        ))}
      </div>
    </div>
  );
}
