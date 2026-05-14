import { Hono } from "hono";
import { authMiddleware, type AuthUser } from "./supabase-auth";
import { PERMISSIONS, ROLE_PRESETS } from "./permissions";
import { rateLimiter, RateLimits } from "./rate-limiter";
import { logSecurityEvent, SecurityEventType, createSecurityContext } from "./security-logger";
import * as validator from "./validation";
import { db } from "./db";

type Bindings = {
  SUPABASE_JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Get all HR users (for permission management)
app.get("/api/admin/hr-users", authMiddleware, async (c) => {
  try {
    const authUser = c.get("user") as AuthUser;

    const { data: userProfile } = await db
      .from('users').select('*').eq('mocha_user_id', authUser.id).single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    const { data: hrUsers } = await db
      .from('users')
      .select('id, mocha_user_id, first_name, last_name, email, hr_permissions, created_at, updated_at')
      .eq('role', 'HR')
      .order('first_name');

    const usersWithParsedPermissions = (hrUsers || []).map((user: any) => ({
      ...user,
      permissions: user.hr_permissions ? JSON.parse(user.hr_permissions) : []
    }));

    return c.json(usersWithParsedPermissions);
  } catch (error) {
    console.error('Error getting HR users:', error);
    return c.json({ error: 'Failed to get HR users' }, 500);
  }
});

// Update HR user permissions
app.put("/api/admin/hr-users/:id/permissions", authMiddleware, rateLimiter(RateLimits.SENSITIVE), async (c) => {
  try {
    const authUser = c.get("user") as AuthUser;
    const targetUserId = validator.validateInteger(c.req.param('id'), 1);
    const { permissions } = await c.req.json();

    if (!targetUserId) {
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: authUser.id,
        details: { field: 'targetUserId' }
      });
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    const { data: userProfile } = await db
      .from('users').select('*').eq('mocha_user_id', authUser.id).single();

    if (!userProfile || userProfile.role !== 'HR') {
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.PERMISSION_DENIED,
        userId: authUser.id,
        details: { action: 'update_hr_permissions' }
      });
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    if (!Array.isArray(permissions)) {
      return c.json({ error: 'Permissions must be an array' }, 400);
    }

    const validPermissions = Object.values(PERMISSIONS);
    const invalidPerms = permissions.filter((p: string) => !validPermissions.includes(p as any));
    if (invalidPerms.length > 0) {
      return c.json({ error: 'Invalid permissions in array' }, 400);
    }

    logSecurityEvent({
      ...createSecurityContext(c),
      type: SecurityEventType.PERMISSION_CHANGED,
      userId: authUser.id,
      userEmail: userProfile.email,
      details: { targetUserId, permissionsCount: permissions.length }
    });

    const { error: updateErr } = await db
      .from('users')
      .update({ hr_permissions: JSON.stringify(permissions), updated_at: new Date().toISOString() })
      .eq('id', targetUserId)
      .eq('role', 'HR');

    if (updateErr) throw updateErr;

    const { data: updatedUser } = await db
      .from('users')
      .select('id, mocha_user_id, first_name, last_name, email, hr_permissions, created_at, updated_at')
      .eq('id', targetUserId)
      .single();

    if (!updatedUser) return c.json({ error: 'User not found' }, 404);

    return c.json({
      ...updatedUser,
      permissions: updatedUser.hr_permissions ? JSON.parse(updatedUser.hr_permissions) : []
    });
  } catch (error) {
    console.error('Error updating HR user permissions:', error);
    return c.json({ error: 'Failed to update permissions' }, 500);
  }
});

// Get available permissions and role presets
app.get("/api/admin/permissions-config", authMiddleware, async (c) => {
  try {
    const authUser = c.get("user") as AuthUser;

    const { data: userProfile } = await db
      .from('users').select('role').eq('mocha_user_id', authUser.id).single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    return c.json({ permissions: PERMISSIONS, rolePresets: ROLE_PRESETS });
  } catch (error) {
    console.error('Error getting permissions config:', error);
    return c.json({ error: 'Failed to get permissions config' }, 500);
  }
});

// Apply role preset to user
app.post("/api/admin/hr-users/:id/apply-preset", authMiddleware, async (c) => {
  try {
    const authUser = c.get("user") as AuthUser;
    const targetUserId = parseInt(c.req.param('id'));
    const { preset } = await c.req.json();

    const { data: userProfile } = await db
      .from('users').select('*').eq('mocha_user_id', authUser.id).single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    const presetPermissions = (ROLE_PRESETS as any)[preset];
    if (!presetPermissions) return c.json({ error: 'Invalid preset' }, 400);

    const { error: updateErr } = await db
      .from('users')
      .update({ hr_permissions: JSON.stringify(presetPermissions), updated_at: new Date().toISOString() })
      .eq('id', targetUserId)
      .eq('role', 'HR');

    if (updateErr) throw updateErr;

    const { data: updatedUser } = await db
      .from('users')
      .select('id, mocha_user_id, first_name, last_name, email, hr_permissions, created_at, updated_at')
      .eq('id', targetUserId)
      .single();

    if (!updatedUser) return c.json({ error: 'User not found' }, 404);

    return c.json({
      ...updatedUser,
      permissions: updatedUser.hr_permissions ? JSON.parse(updatedUser.hr_permissions) : []
    });
  } catch (error) {
    console.error('Error applying preset to HR user:', error);
    return c.json({ error: 'Failed to apply preset' }, 500);
  }
});

// Get all active employees (non-HR users)
app.get("/api/admin/employees-list", authMiddleware, async (c) => {
  try {
    const authUser = c.get("user") as AuthUser;

    const { data: userProfile } = await db
      .from('users').select('role').eq('mocha_user_id', authUser.id).single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    const { data: employees } = await db
      .from('users')
      .select('id, mocha_user_id, first_name, last_name, email, department, position, created_at')
      .eq('role', 'EMPLOYEE')
      .eq('status', 'ACTIVE')
      .order('first_name');

    return c.json(employees || []);
  } catch (error) {
    console.error('Error getting employees list:', error);
    return c.json({ error: 'Failed to get employees list' }, 500);
  }
});

// Promote employee to HR
app.post("/api/admin/promote-to-hr/:id", authMiddleware, rateLimiter(RateLimits.SENSITIVE), async (c) => {
  try {
    const authUser = c.get("user") as AuthUser;
    const employeeId = validator.validateInteger(c.req.param('id'), 1);
    const { preset } = await c.req.json();

    if (!employeeId) return c.json({ error: 'Invalid employee ID' }, 400);

    const { data: userProfile } = await db
      .from('users').select('*').eq('mocha_user_id', authUser.id).single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    const { data: employee } = await db
      .from('users').select('*').eq('id', employeeId).single();

    if (!employee) return c.json({ error: 'Employee not found' }, 404);
    if (employee.role === 'HR') return c.json({ error: 'User is already HR' }, 400);

    let permissions: string[] = [];
    if (preset && (ROLE_PRESETS as any)[preset]) {
      permissions = (ROLE_PRESETS as any)[preset];
    }

    logSecurityEvent({
      ...createSecurityContext(c),
      type: SecurityEventType.USER_ROLE_CHANGED,
      userId: authUser.id,
      userEmail: userProfile.email,
      details: { targetUserId: employeeId, targetEmail: employee.email, oldRole: 'EMPLOYEE', newRole: 'HR', preset: preset || 'none' }
    });

    const { error: updateErr } = await db
      .from('users')
      .update({ role: 'HR', hr_permissions: JSON.stringify(permissions), updated_at: new Date().toISOString() })
      .eq('id', employeeId);

    if (updateErr) throw updateErr;

    const { data: updatedUser } = await db
      .from('users')
      .select('id, mocha_user_id, first_name, last_name, email, hr_permissions, created_at, updated_at')
      .eq('id', employeeId)
      .single();

    return c.json({
      ...updatedUser,
      permissions: updatedUser?.hr_permissions ? JSON.parse(updatedUser.hr_permissions) : []
    });
  } catch (error) {
    console.error('Error promoting employee to HR:', error);
    return c.json({ error: 'Failed to promote employee to HR' }, 500);
  }
});

// Demote HR user to employee
app.post("/api/admin/demote-from-hr/:id", authMiddleware, rateLimiter(RateLimits.SENSITIVE), async (c) => {
  try {
    const authUser = c.get("user") as AuthUser;
    const hrUserId = validator.validateInteger(c.req.param('id'), 1);

    if (!hrUserId) return c.json({ error: 'Invalid user ID' }, 400);

    const { data: userProfile } = await db
      .from('users').select('*').eq('mocha_user_id', authUser.id).single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    if (userProfile.id === hrUserId) {
      return c.json({ error: 'Cannot demote yourself' }, 400);
    }

    const { data: hrUser } = await db
      .from('users').select('*').eq('id', hrUserId).single();

    if (!hrUser) return c.json({ error: 'User not found' }, 404);
    if (hrUser.role !== 'HR') return c.json({ error: 'User is not HR' }, 400);

    logSecurityEvent({
      ...createSecurityContext(c),
      type: SecurityEventType.USER_ROLE_CHANGED,
      userId: authUser.id,
      userEmail: userProfile.email,
      details: { targetUserId: hrUserId, targetEmail: hrUser.email, oldRole: 'HR', newRole: 'EMPLOYEE' }
    });

    const { error: updateErr } = await db
      .from('users')
      .update({ role: 'EMPLOYEE', hr_permissions: null, updated_at: new Date().toISOString() })
      .eq('id', hrUserId);

    if (updateErr) throw updateErr;

    return c.json({ success: true });
  } catch (error) {
    console.error('Error demoting HR user:', error);
    return c.json({ error: 'Failed to demote HR user' }, 500);
  }
});

export default app;
