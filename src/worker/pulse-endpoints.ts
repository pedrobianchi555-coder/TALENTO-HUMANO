import { Hono } from "hono";
import { authMiddleware, type AuthUser } from "./supabase-auth";
import { rateLimiter, RateLimits } from "./rate-limiter";
import { db } from "./db";

type Bindings = { SUPABASE_JWT_SECRET: string };

const app = new Hono<{ Bindings: Bindings }>();

// ──────────────────────────────────────────────────────────────
// Helpers internos
// ──────────────────────────────────────────────────────────────

async function getCallerProfile(mochaId: string) {
  const { data } = await db
    .from("users")
    .select("id, role, department")
    .eq("mocha_user_id", mochaId)
    .single();
  return data;
}

const POINTS = {
  DAILY_SHOT: 10,
  STREAK_7: 30,
  STREAK_30: 100,
} as const;

async function awardPoints(userId: number, points: number, reason: string, refId?: number) {
  await db.from("pulse_point_ledger").insert({
    user_id: userId,
    points,
    reason,
    reference_id: refId ?? null,
  });
}

async function getCurrentStreak(userId: number): Promise<number> {
  // Contar días consecutivos hasta hoy
  const { data: shots } = await db
    .from("pulse_mood_shots")
    .select("day_date")
    .eq("user_id", userId)
    .gte("day_date", new Date(Date.now() - 90 * 86400000).toISOString().slice(0, 10))
    .order("day_date", { ascending: false });

  if (!shots?.length) return 0;

  const uniqueDays = [...new Set(shots.map((s) => s.day_date))].sort().reverse();
  let streak = 0;
  let expected = new Date();
  expected.setHours(0, 0, 0, 0);

  for (const day of uniqueDays) {
    const d = new Date(day);
    d.setHours(0, 0, 0, 0);
    const diff = Math.round((expected.getTime() - d.getTime()) / 86400000);
    if (diff > 1) break;
    streak++;
    expected = d;
  }
  return streak;
}

// ──────────────────────────────────────────────────────────────
// POST /api/pulse/mood — Registrar Mood-Shot diario
// ──────────────────────────────────────────────────────────────
app.post("/api/pulse/mood", authMiddleware, rateLimiter(RateLimits.MUTATION), async (c) => {
  try {
    const caller = c.get("user") as AuthUser;
    const profile = await getCallerProfile(caller.id);
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    const { mood_score, session } = await c.req.json();

    if (!mood_score || mood_score < 1 || mood_score > 5) {
      return c.json({ error: "mood_score must be between 1 and 5" }, 400);
    }
    if (!["MORNING", "EVENING"].includes(session)) {
      return c.json({ error: "session must be MORNING or EVENING" }, 400);
    }

    const today = new Date().toISOString().slice(0, 10);

    const { data: shot, error } = await db
      .from("pulse_mood_shots")
      .upsert(
        { user_id: profile.id, day_date: today, session, mood_score },
        { onConflict: "user_id,day_date,session" }
      )
      .select()
      .single();

    if (error) throw error;

    // Asignar puntos base
    await awardPoints(profile.id, POINTS.DAILY_SHOT, "DAILY_SHOT", shot.id);

    // Evaluar streaks
    const streak = await getCurrentStreak(profile.id);
    let bonusAwarded: string | null = null;
    if (streak === 7) {
      await awardPoints(profile.id, POINTS.STREAK_7, "STREAK_7");
      bonusAwarded = "STREAK_7";
    } else if (streak === 30) {
      await awardPoints(profile.id, POINTS.STREAK_30, "STREAK_30");
      bonusAwarded = "STREAK_30";
    }

    // Balance actualizado
    const { data: bal } = await db
      .from("pulse_point_balance")
      .select("balance")
      .eq("user_id", profile.id)
      .single();

    return c.json({
      success: true,
      points_earned: POINTS.DAILY_SHOT,
      bonus: bonusAwarded,
      balance: bal?.balance ?? 0,
      streak,
    });
  } catch (err) {
    console.error("Error recording mood shot:", err);
    return c.json({ error: "Failed to record mood" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/pulse/my-dashboard — Dashboard personal del empleado
// ──────────────────────────────────────────────────────────────
app.get("/api/pulse/my-dashboard", authMiddleware, async (c) => {
  try {
    const caller = c.get("user") as AuthUser;
    const profile = await getCallerProfile(caller.id);
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);

    const [{ data: shots }, { data: bal }, streak] = await Promise.all([
      db
        .from("pulse_mood_shots")
        .select("day_date, mood_score, session")
        .eq("user_id", profile.id)
        .gte("day_date", sevenDaysAgo)
        .order("day_date", { ascending: true }),
      db.from("pulse_point_balance").select("balance, total_shots").eq("user_id", profile.id).single(),
      getCurrentStreak(profile.id),
    ]);

    // Hoy: ¿ya registró mood?
    const today = new Date().toISOString().slice(0, 10);
    const todayShots = (shots || []).filter((s) => s.day_date === today);

    return c.json({
      balance: bal?.balance ?? 0,
      total_shots: bal?.total_shots ?? 0,
      streak,
      today: {
        morning_done: todayShots.some((s) => s.session === "MORNING"),
        evening_done: todayShots.some((s) => s.session === "EVENING"),
      },
      last_7_days: shots ?? [],
    });
  } catch (err) {
    console.error("Error fetching pulse dashboard:", err);
    return c.json({ error: "Failed to load dashboard" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/pulse/rewards — Catálogo de beneficios
// ──────────────────────────────────────────────────────────────
app.get("/api/pulse/rewards", authMiddleware, async (c) => {
  try {
    const { data: rewards } = await db
      .from("pulse_rewards")
      .select("*")
      .eq("is_active", true)
      .order("cost_points");

    return c.json(rewards ?? []);
  } catch (err) {
    console.error("Error fetching rewards:", err);
    return c.json({ error: "Failed to fetch rewards" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/pulse/redeem — Canjear beneficio
// ──────────────────────────────────────────────────────────────
app.post("/api/pulse/redeem", authMiddleware, rateLimiter(RateLimits.MUTATION), async (c) => {
  try {
    const caller = c.get("user") as AuthUser;
    const profile = await getCallerProfile(caller.id);
    if (!profile) return c.json({ error: "Profile not found" }, 404);

    const { reward_id } = await c.req.json();

    const { data: reward } = await db
      .from("pulse_rewards")
      .select("*")
      .eq("id", reward_id)
      .eq("is_active", true)
      .single();

    if (!reward) return c.json({ error: "Reward not found or inactive" }, 404);

    // Verificar saldo
    const { data: bal } = await db
      .from("pulse_point_balance")
      .select("balance")
      .eq("user_id", profile.id)
      .single();

    if ((bal?.balance ?? 0) < reward.cost_points) {
      return c.json({ error: "Saldo insuficiente de Flow Coins" }, 400);
    }

    // Verificar stock
    if (reward.stock !== null && reward.stock <= 0) {
      return c.json({ error: "Beneficio agotado" }, 400);
    }

    // Crear redención
    const { data: redemption, error } = await db
      .from("pulse_redemptions")
      .insert({ user_id: profile.id, reward_id, points_used: reward.cost_points })
      .select()
      .single();

    if (error) throw error;

    // Descontar puntos del ledger
    await awardPoints(profile.id, -reward.cost_points, "REDEMPTION", redemption.id);

    // Reducir stock si aplica
    if (reward.stock !== null) {
      await db.from("pulse_rewards").update({ stock: reward.stock - 1 }).eq("id", reward_id);
    }

    return c.json({ success: true, redemption_id: redemption.id });
  } catch (err) {
    console.error("Error redeeming reward:", err);
    return c.json({ error: "Failed to redeem reward" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/pulse/hr/team-pulse — Dashboard de HR (datos agregados)
//     Solo muestra datos si cohorte ≥ 5 personas (privacidad)
// ──────────────────────────────────────────────────────────────
app.get("/api/pulse/hr/team-pulse", authMiddleware, async (c) => {
  try {
    const caller = c.get("user") as AuthUser;
    const profile = await getCallerProfile(caller.id);
    if (!profile || profile.role !== "HR") {
      return c.json({ error: "Unauthorized: HR access required" }, 403);
    }

    const days = parseInt(c.req.query("days") || "7");
    const dateFrom = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);
    const dateTo = new Date().toISOString().slice(0, 10);

    // Obtener lista de departamentos activos
    const { data: departments } = await db
      .from("users")
      .select("department")
      .eq("status", "ACTIVE")
      .not("department", "is", null);

    const uniqueDepts = [...new Set((departments || []).map((u) => u.department))];

    // Llamar a la función agregadora por departamento
    const results = await Promise.all(
      uniqueDepts.map(async (dept) => {
        const { data } = await db.rpc("get_team_pulse", {
          p_department: dept,
          p_date_from: dateFrom,
          p_date_to: dateTo,
        });
        return data?.[0] ?? {
          department: dept,
          avg_mood: null,
          participation_pct: 0,
          mood_trend: "INSUFFICIENT_DATA",
          sample_size: 0,
          is_anonymous: false,
        };
      })
    );

    return c.json(results);
  } catch (err) {
    console.error("Error fetching team pulse:", err);
    return c.json({ error: "Failed to fetch team pulse" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/pulse/hr/alerts — Alertas pendientes para HR
// ──────────────────────────────────────────────────────────────
app.get("/api/pulse/hr/alerts", authMiddleware, async (c) => {
  try {
    const caller = c.get("user") as AuthUser;
    const profile = await getCallerProfile(caller.id);
    if (!profile || profile.role !== "HR") {
      return c.json({ error: "Unauthorized: HR access required" }, 403);
    }

    const { data: alerts } = await db
      .from("pulse_alerts")
      .select("*")
      .eq("resolved", false)
      .order("triggered_at", { ascending: false })
      .limit(50);

    return c.json(alerts ?? []);
  } catch (err) {
    console.error("Error fetching alerts:", err);
    return c.json({ error: "Failed to fetch alerts" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// PATCH /api/pulse/hr/alerts/:id — Reconocer alerta
// ──────────────────────────────────────────────────────────────
app.patch("/api/pulse/hr/alerts/:id", authMiddleware, async (c) => {
  try {
    const caller = c.get("user") as AuthUser;
    const profile = await getCallerProfile(caller.id);
    if (!profile || profile.role !== "HR") {
      return c.json({ error: "Unauthorized: HR access required" }, 403);
    }

    const alertId = parseInt(c.req.param("id"));
    const { resolved } = await c.req.json();

    const { error } = await db
      .from("pulse_alerts")
      .update({
        acknowledged_by: profile.id,
        acknowledged_at: new Date().toISOString(),
        resolved: resolved ?? false,
      })
      .eq("id", alertId);

    if (error) throw error;
    return c.json({ success: true });
  } catch (err) {
    console.error("Error acknowledging alert:", err);
    return c.json({ error: "Failed to update alert" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/pulse/hr/team-friction — Datos operativos de fricción
// ──────────────────────────────────────────────────────────────
app.get("/api/pulse/hr/team-friction", authMiddleware, async (c) => {
  try {
    const caller = c.get("user") as AuthUser;
    const profile = await getCallerProfile(caller.id);
    if (!profile || profile.role !== "HR") {
      return c.json({ error: "Unauthorized: HR access required" }, 403);
    }

    const days = parseInt(c.req.query("days") || "14");
    const dept = c.req.query("department");
    const dateFrom = new Date(Date.now() - days * 86400000).toISOString().slice(0, 10);

    let query = db
      .from("pulse_team_friction")
      .select("*")
      .gte("metric_date", dateFrom)
      .order("metric_date", { ascending: false });

    if (dept) {
      query = query.eq("department", dept) as any;
    }

    const { data } = await query;
    return c.json(data ?? []);
  } catch (err) {
    console.error("Error fetching team friction:", err);
    return c.json({ error: "Failed to fetch friction data" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// POST /api/pulse/hr/friction — Ingestar métricas de fricción
//     Llamado por integraciones externas (Calendar/Jira worker)
//     con service_role key — NUNCA expone datos individuales
// ──────────────────────────────────────────────────────────────
app.post("/api/pulse/hr/friction", authMiddleware, async (c) => {
  try {
    const caller = c.get("user") as AuthUser;
    const profile = await getCallerProfile(caller.id);
    if (!profile || profile.role !== "HR") {
      return c.json({ error: "Unauthorized" }, 403);
    }

    const body = await c.req.json();
    const {
      department,
      metric_date,
      total_meeting_minutes,
      deep_work_blocks,
      zombie_meeting_count,
      after_hours_events,
      weekend_events,
      team_size,
    } = body;

    if (!department || !metric_date) {
      return c.json({ error: "department and metric_date are required" }, 400);
    }

    // Proteger anonimato: rechazar si team_size < 5
    if (team_size < 5) {
      return c.json({ error: "team_size must be >= 5 to preserve anonymity" }, 422);
    }

    const { error } = await db.from("pulse_team_friction").upsert(
      {
        department,
        metric_date,
        total_meeting_minutes: total_meeting_minutes ?? 0,
        deep_work_blocks: deep_work_blocks ?? 0,
        zombie_meeting_count: zombie_meeting_count ?? 0,
        after_hours_events: after_hours_events ?? 0,
        weekend_events: weekend_events ?? 0,
        team_size,
      },
      { onConflict: "department,metric_date" }
    );

    if (error) throw error;

    // Evaluar si se debe generar una alerta automática
    await evaluateFrictionAlerts(department, {
      zombie_meeting_count,
      after_hours_events,
      metric_date,
    });

    return c.json({ success: true });
  } catch (err) {
    console.error("Error ingesting friction data:", err);
    return c.json({ error: "Failed to ingest friction data" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// GET /api/pulse/hr/redemptions — Gestión de redenciones
// ──────────────────────────────────────────────────────────────
app.get("/api/pulse/hr/redemptions", authMiddleware, async (c) => {
  try {
    const caller = c.get("user") as AuthUser;
    const profile = await getCallerProfile(caller.id);
    if (!profile || profile.role !== "HR") {
      return c.json({ error: "Unauthorized: HR access required" }, 403);
    }

    const { data } = await db
      .from("pulse_redemptions")
      .select(
        "*, reward:pulse_rewards(title, category, cost_points), employee:users!pulse_redemptions_user_id_fkey(first_name, last_name, department)"
      )
      .order("created_at", { ascending: false })
      .limit(100);

    return c.json(data ?? []);
  } catch (err) {
    console.error("Error fetching redemptions:", err);
    return c.json({ error: "Failed to fetch redemptions" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// PATCH /api/pulse/hr/redemptions/:id — Aprobar / rechazar
// ──────────────────────────────────────────────────────────────
app.patch("/api/pulse/hr/redemptions/:id", authMiddleware, async (c) => {
  try {
    const caller = c.get("user") as AuthUser;
    const profile = await getCallerProfile(caller.id);
    if (!profile || profile.role !== "HR") {
      return c.json({ error: "Unauthorized: HR access required" }, 403);
    }

    const id = parseInt(c.req.param("id"));
    const { status, notes } = await c.req.json();

    if (!["APPROVED", "REJECTED", "DELIVERED"].includes(status)) {
      return c.json({ error: "Invalid status" }, 400);
    }

    const { error } = await db
      .from("pulse_redemptions")
      .update({ status, notes, approved_by: profile.id, approved_at: new Date().toISOString() })
      .eq("id", id);

    if (error) throw error;

    // Si se rechaza, devolver los puntos
    if (status === "REJECTED") {
      const { data: redemption } = await db
        .from("pulse_redemptions")
        .select("user_id, points_used")
        .eq("id", id)
        .single();
      if (redemption) {
        await awardPoints(redemption.user_id, redemption.points_used, "REDEMPTION_REFUND", id);
      }
    }

    return c.json({ success: true });
  } catch (err) {
    console.error("Error updating redemption:", err);
    return c.json({ error: "Failed to update redemption" }, 500);
  }
});

// ──────────────────────────────────────────────────────────────
// Helper: evaluar y crear alertas automáticas de fricción
// ──────────────────────────────────────────────────────────────
async function evaluateFrictionAlerts(
  department: string,
  metrics: { zombie_meeting_count: number; after_hours_events: number; metric_date: string }
) {
  const alerts: Array<{ alert_type: string; severity: string; message: string }> = [];

  if (metrics.zombie_meeting_count >= 3) {
    alerts.push({
      alert_type: "ZOMBIE_MEETINGS",
      severity: metrics.zombie_meeting_count >= 5 ? "CRITICAL" : "WARNING",
      message: `Dept. ${department}: ${metrics.zombie_meeting_count} reuniones zombie detectadas el ${metrics.metric_date}. Considera auditar la agenda y reducir reuniones sin objetivo claro.`,
    });
  }

  if (metrics.after_hours_events >= 10) {
    alerts.push({
      alert_type: "AFTER_HOURS_SPIKE",
      severity: "WARNING",
      message: `Dept. ${department}: ${metrics.after_hours_events} eventos de herramientas registrados fuera de horario el ${metrics.metric_date}.`,
    });
  }

  if (alerts.length > 0) {
    await db.from("pulse_alerts").insert(
      alerts.map((a) => ({ department, ...a }))
    );
  }
}

export default app;
