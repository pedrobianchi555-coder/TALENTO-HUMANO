import { useState, useEffect } from "react";
import { useAuth } from "@/react-app/contexts/AuthContext";
import { useNavigate } from "react-router";
import {
  Zap, Gift, TrendingUp, TrendingDown, Minus,
  Award, AlertTriangle, Users, BarChart2,
  CheckCircle2, Clock, ShoppingBag, ChevronRight,
} from "lucide-react";

// ─────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────
type MoodScore = 1 | 2 | 3 | 4 | 5;

const MOODS: { score: MoodScore; emoji: string; label: string; color: string }[] = [
  { score: 1, emoji: "😴", label: "Agotado",   color: "bg-red-100 border-red-300 text-red-700" },
  { score: 2, emoji: "😕", label: "Bajo",       color: "bg-orange-100 border-orange-300 text-orange-700" },
  { score: 3, emoji: "😐", label: "Normal",     color: "bg-yellow-100 border-yellow-300 text-yellow-700" },
  { score: 4, emoji: "🙂", label: "Bien",       color: "bg-green-100 border-green-300 text-green-700" },
  { score: 5, emoji: "🤩", label: "Excelente",  color: "bg-blue-100 border-blue-300 text-blue-700" },
];

const TREND_ICON = {
  IMPROVING: <TrendingUp className="w-4 h-4 text-green-500" />,
  DECLINING: <TrendingDown className="w-4 h-4 text-red-500" />,
  STABLE: <Minus className="w-4 h-4 text-gray-400" />,
  INSUFFICIENT_DATA: <Minus className="w-4 h-4 text-gray-300" />,
};

// ─────────────────────────────────────────────────
// Hook de datos
// ─────────────────────────────────────────────────
function usePulseDashboard() {
  const [dashboard, setDashboard] = useState<any>(null);
  const [rewards, setRewards]     = useState<any[]>([]);
  const [teamPulse, setTeamPulse] = useState<any[]>([]);
  const [alerts, setAlerts]       = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);
  const { user } = useAuth();
  const isHR = user?.profile?.role === "HR";

  const reload = async () => {
    setLoading(true);
    try {
      const [dashRes, rewardsRes] = await Promise.all([
        fetch("/api/pulse/my-dashboard"),
        fetch("/api/pulse/rewards"),
      ]);
      if (dashRes.ok)    setDashboard(await dashRes.json());
      if (rewardsRes.ok) setRewards(await rewardsRes.json());

      if (isHR) {
        const [teamRes, alertsRes] = await Promise.all([
          fetch("/api/pulse/hr/team-pulse?days=7"),
          fetch("/api/pulse/hr/alerts"),
        ]);
        if (teamRes.ok)   setTeamPulse(await teamRes.json());
        if (alertsRes.ok) setAlerts(await alertsRes.json());
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, [isHR]);
  return { dashboard, rewards, teamPulse, alerts, loading, reload };
}

// ─────────────────────────────────────────────────
// Sub-componentes
// ─────────────────────────────────────────────────

function MoodShotCard({ dashboard, onRecorded }: { dashboard: any; onRecorded: () => void }) {
  const [selected, setSelected] = useState<MoodScore | null>(null);
  const [session, setSession]   = useState<"MORNING" | "EVENING">("MORNING");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult]     = useState<any>(null);

  const hour = new Date().getHours();
  const defaultSession = hour < 13 ? "MORNING" : "EVENING";

  useEffect(() => { setSession(defaultSession); }, [defaultSession]);

  const alreadyDone =
    dashboard && (
      (session === "MORNING" && dashboard.today?.morning_done) ||
      (session === "EVENING" && dashboard.today?.evening_done)
    );

  const handleSubmit = async () => {
    if (!selected) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/pulse/mood", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mood_score: selected, session }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setTimeout(() => { setResult(null); setSelected(null); onRecorded(); }, 3000);
      }
    } finally {
      setSubmitting(false);
    }
  };

  if (result) {
    return (
      <div className="bg-white rounded-2xl border border-green-200 p-6 text-center shadow-sm">
        <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
        <p className="text-lg font-semibold text-gray-900">¡Registrado!</p>
        <p className="text-gray-500 mt-1">
          +{result.points_earned} Flow Coins
          {result.bonus === "STREAK_7"  && " · 🔥 ¡Bonus de racha de 7 días! +30"}
          {result.bonus === "STREAK_30" && " · 🏆 ¡Bonus de racha de 30 días! +100"}
        </p>
        <p className="text-2xl font-bold text-blue-600 mt-2">⚡ {result.balance} coins</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">¿Cómo estás hoy?</h3>
        <div className="flex gap-1">
          {(["MORNING", "EVENING"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setSession(s)}
              className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                session === s
                  ? "bg-blue-600 text-white border-blue-600"
                  : "text-gray-500 border-gray-200 hover:border-gray-300"
              }`}
            >
              {s === "MORNING" ? "🌅 Mañana" : "🌙 Tarde"}
            </button>
          ))}
        </div>
      </div>

      {alreadyDone ? (
        <p className="text-sm text-gray-400 text-center py-4">
          ✅ Ya registraste el mood de {session === "MORNING" ? "la mañana" : "la tarde"} hoy
        </p>
      ) : (
        <>
          <div className="grid grid-cols-5 gap-2 mb-4">
            {MOODS.map((m) => (
              <button
                key={m.score}
                onClick={() => setSelected(m.score)}
                className={`flex flex-col items-center p-3 rounded-xl border-2 transition-all ${
                  selected === m.score ? m.color + " scale-110 shadow-md" : "border-gray-100 hover:border-gray-300"
                }`}
              >
                <span className="text-2xl">{m.emoji}</span>
                <span className="text-xs mt-1 font-medium">{m.label}</span>
              </button>
            ))}
          </div>
          <button
            onClick={handleSubmit}
            disabled={!selected || submitting}
            className="w-full py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-40 transition-colors"
          >
            {submitting ? "Guardando..." : "Registrar (+10 ⚡)"}
          </button>
        </>
      )}
    </div>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  const level = streak >= 30 ? "🏆" : streak >= 7 ? "🔥" : streak >= 3 ? "✨" : "💧";
  return (
    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
      <span className="text-2xl">{level}</span>
      <div>
        <p className="text-xs text-gray-500">Racha actual</p>
        <p className="font-bold text-gray-900">{streak} días</p>
      </div>
    </div>
  );
}

function RewardCard({ reward, balance, onRedeem }: { reward: any; balance: number; onRedeem: (id: number) => void }) {
  const canAfford = balance >= reward.cost_points;
  const outOfStock = reward.stock === 0;

  return (
    <div className={`bg-white rounded-xl border p-4 transition-all ${canAfford && !outOfStock ? "border-gray-200 hover:shadow-md" : "border-gray-100 opacity-60"}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="font-medium text-gray-900 text-sm">{reward.title}</p>
          <p className="text-xs text-gray-500 mt-0.5">{reward.description}</p>
        </div>
        <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-semibold ml-2 whitespace-nowrap">
          ⚡ {reward.cost_points}
        </span>
      </div>
      {reward.stock !== null && (
        <p className="text-xs text-gray-400 mt-2">{reward.stock} disponibles</p>
      )}
      <button
        onClick={() => onRedeem(reward.id)}
        disabled={!canAfford || outOfStock}
        className="mt-3 w-full text-xs py-1.5 rounded-lg font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-100 disabled:text-gray-400"
      >
        {outOfStock ? "Agotado" : !canAfford ? "Saldo insuficiente" : "Canjear"}
      </button>
    </div>
  );
}

function TeamPulseCard({ data }: { data: any[] }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-2">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">Pulso por Departamento</h3>
        <span className="ml-auto text-xs text-gray-400">últimos 7 días</span>
      </div>
      <div className="divide-y divide-gray-50">
        {data.map((dept) => (
          <div key={dept.department} className="px-6 py-4 flex items-center gap-4">
            <div className="flex-1">
              <p className="font-medium text-gray-900 text-sm">{dept.department}</p>
              <p className="text-xs text-gray-400">{dept.participation_pct ?? 0}% participación</p>
            </div>
            {dept.is_anonymous && dept.avg_mood ? (
              <div className="flex items-center gap-2">
                <div className="flex">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className={`w-3 h-6 rounded-sm mx-0.5 ${
                        i < Math.round(dept.avg_mood)
                          ? dept.avg_mood >= 4 ? "bg-green-400" : dept.avg_mood >= 3 ? "bg-yellow-400" : "bg-red-400"
                          : "bg-gray-100"
                      }`}
                    />
                  ))}
                </div>
                <span className="text-sm font-bold text-gray-700">{dept.avg_mood}</span>
                {TREND_ICON[dept.mood_trend as keyof typeof TREND_ICON]}
              </div>
            ) : (
              <span className="text-xs text-gray-400 italic">datos insuficientes</span>
            )}
          </div>
        ))}
        {data.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-8">Sin datos disponibles aún</p>
        )}
      </div>
    </div>
  );
}

function AlertBanner({ alerts, onAck }: { alerts: any[]; onAck: (id: number) => void }) {
  if (!alerts.length) return null;
  return (
    <div className="space-y-2">
      {alerts.slice(0, 3).map((a) => (
        <div
          key={a.id}
          className={`flex items-start gap-3 p-4 rounded-xl border ${
            a.severity === "CRITICAL"
              ? "bg-red-50 border-red-200"
              : "bg-amber-50 border-amber-200"
          }`}
        >
          <AlertTriangle
            className={`w-5 h-5 mt-0.5 flex-shrink-0 ${
              a.severity === "CRITICAL" ? "text-red-500" : "text-amber-500"
            }`}
          />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900">{a.alert_type.replace(/_/g, " ")}</p>
            <p className="text-xs text-gray-600 mt-0.5">{a.message}</p>
          </div>
          <button
            onClick={() => onAck(a.id)}
            className="text-xs text-gray-400 hover:text-gray-600 flex-shrink-0"
          >
            ✕
          </button>
        </div>
      ))}
    </div>
  );
}

// ─────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────
export default function PulseFlow() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { dashboard, rewards, teamPulse, alerts, loading, reload } = usePulseDashboard();
  const [activeTab, setActiveTab] = useState<"employee" | "hr">("employee");
  const [redeeming, setRedeeming] = useState(false);

  const isHR = user?.profile?.role === "HR";

  const handleRedeem = async (rewardId: number) => {
    if (!confirm("¿Confirmas el canje de este beneficio?")) return;
    setRedeeming(true);
    try {
      const res = await fetch("/api/pulse/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reward_id: rewardId }),
      });
      if (res.ok) { alert("¡Canje exitoso! El equipo de RRHH lo procesará pronto."); reload(); }
      else { const d = await res.json(); alert(d.error || "Error al canjear"); }
    } finally {
      setRedeeming(false);
    }
  };

  const handleAckAlert = async (id: number) => {
    await fetch(`/api/pulse/hr/alerts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resolved: true }),
    });
    reload();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const balance = dashboard?.balance ?? 0;
  const streak  = dashboard?.streak ?? 0;

  const rewardsByCategory = {
    TIME:    rewards.filter((r) => r.category === "TIME"),
    DIGITAL: rewards.filter((r) => r.category === "DIGITAL"),
    CULTURE: rewards.filter((r) => r.category === "CULTURE"),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">Pulse & Flow</h1>
              <p className="text-xs text-gray-500">Radar de Bienestar</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-xs text-gray-400">Flow Coins</p>
              <p className="font-bold text-blue-600">⚡ {balance}</p>
            </div>
            {isHR && (
              <div className="flex border border-gray-200 rounded-lg overflow-hidden">
                <button
                  onClick={() => setActiveTab("employee")}
                  className={`px-3 py-1.5 text-xs font-medium ${activeTab === "employee" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  Mi vista
                </button>
                <button
                  onClick={() => setActiveTab("hr")}
                  className={`px-3 py-1.5 text-xs font-medium ${activeTab === "hr" ? "bg-blue-600 text-white" : "text-gray-600 hover:bg-gray-50"}`}
                >
                  HR
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Vista HR */}
        {isHR && activeTab === "hr" && (
          <>
            <AlertBanner alerts={alerts} onAck={handleAckAlert} />
            <TeamPulseCard data={teamPulse} />
          </>
        )}

        {/* Vista empleado */}
        {activeTab === "employee" && (
          <>
            {/* Stats rápidos */}
            <div className="grid grid-cols-3 gap-3">
              <StreakBadge streak={streak} />
              <div className="col-span-2 grid grid-cols-2 gap-3">
                <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
                  <p className="text-xs text-gray-400">Mood-Shots</p>
                  <p className="text-2xl font-bold text-gray-900">{dashboard?.total_shots ?? 0}</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 px-4 py-3 text-center">
                  <p className="text-xs text-gray-400">Balance</p>
                  <p className="text-2xl font-bold text-blue-600">{balance}</p>
                </div>
              </div>
            </div>

            {/* Mood-Shot del día */}
            <MoodShotCard dashboard={dashboard} onRecorded={reload} />

            {/* Historial últimos 7 días */}
            {dashboard?.last_7_days?.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart2 className="w-4 h-4 text-blue-600" />
                  Últimos 7 días
                </h3>
                <div className="flex items-end gap-2 h-20">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date(Date.now() - (6 - i) * 86400000).toISOString().slice(0, 10);
                    const shots = (dashboard.last_7_days || []).filter((s: any) => s.day_date === date);
                    const avg = shots.length ? shots.reduce((a: number, s: any) => a + s.mood_score, 0) / shots.length : 0;
                    const h = avg ? Math.round((avg / 5) * 64) : 4;
                    const color = avg >= 4 ? "bg-green-400" : avg >= 3 ? "bg-yellow-400" : avg > 0 ? "bg-red-400" : "bg-gray-100";
                    return (
                      <div key={date} className="flex-1 flex flex-col items-center gap-1">
                        <div className={`w-full rounded-t-sm ${color}`} style={{ height: h }} />
                        <span className="text-xs text-gray-400">{new Date(date + "T12:00:00").toLocaleDateString("es", { weekday: "narrow" })}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Marketplace de beneficios */}
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Gift className="w-5 h-5 text-purple-600" />
                Marketplace de Beneficios
              </h3>
              {(["TIME", "DIGITAL", "CULTURE"] as const).map((cat) => (
                rewardsByCategory[cat].length > 0 && (
                  <div key={cat}>
                    <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2">
                      {cat === "TIME" ? "⏰ Tiempo y Flexibilidad" : cat === "DIGITAL" ? "🎮 Bienestar Digital" : "🎨 Cultura de Equipo"}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {rewardsByCategory[cat].map((r) => (
                        <RewardCard key={r.id} reward={r} balance={balance} onRedeem={handleRedeem} />
                      ))}
                    </div>
                  </div>
                )
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
