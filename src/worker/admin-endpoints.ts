import { Hono } from "hono";
import { authMiddleware } from "@getmocha/users-service/backend";
import { PERMISSIONS, ROLE_PRESETS } from "./permissions";
import { rateLimiter, RateLimits } from "./rate-limiter";
import { logSecurityEvent, SecurityEventType, createSecurityContext } from "./security-logger";
import * as validator from "./validation";

type Bindings = {
  DB: D1Database;
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// Get all HR users (for permission management)
app.get("/api/admin/hr-users", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user");
    if (!mochaUser) {
      return c.json({ error: 'User not found' }, 401);
    }
    
    // Get current user's profile to check if they're admin
    const userProfile = await c.env.DB.prepare(
      "SELECT * FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    // Get all HR users
    const hrUsers = await c.env.DB.prepare(`
      SELECT id, mocha_user_id, first_name, last_name, email, hr_permissions, created_at, updated_at
      FROM users 
      WHERE role = 'HR' 
      ORDER BY first_name, last_name
    `).all();

    const usersWithParsedPermissions = (hrUsers.results || []).map((user: any) => ({
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
    const mochaUser = c.get("user");
    if (!mochaUser) {
      return c.json({ error: 'User not found' }, 401);
    }
    const targetUserId = validator.validateInteger(c.req.param('id'), 1);
    const { permissions } = await c.req.json();

    if (!targetUserId) {
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser.id,
        details: { field: 'targetUserId' }
      });
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    // Get current user's profile to check if they're admin
    const userProfile = await c.env.DB.prepare(
      "SELECT * FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.PERMISSION_DENIED,
        userId: mochaUser.id,
        details: { action: 'update_hr_permissions' }
      });
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    // Validate permissions array
    if (!Array.isArray(permissions)) {
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser.id,
        details: { field: 'permissions', type: typeof permissions }
      });
      return c.json({ error: 'Permissions must be an array' }, 400);
    }

    // Validate each permission is a valid string from PERMISSIONS
    const validPermissions = Object.values(PERMISSIONS);
    const invalidPerms = permissions.filter(p => !validPermissions.includes(p));
    
    if (invalidPerms.length > 0) {
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser.id,
        details: { invalidPermissions: invalidPerms }
      });
      return c.json({ error: 'Invalid permissions in array' }, 400);
    }

    // Log permission change
    logSecurityEvent({
      ...createSecurityContext(c),
      type: SecurityEventType.PERMISSION_CHANGED,
      userId: mochaUser.id,
      userEmail: (userProfile as any).email,
      details: { 
        targetUserId,
        permissionsCount: permissions.length,
        action: 'update_permissions'
      }
    });

    // Update user permissions
    await c.env.DB.prepare(`
      UPDATE users 
      SET hr_permissions = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND role = 'HR'
    `).bind(JSON.stringify(permissions), targetUserId).run();

    // Get updated user
    const updatedUser = await c.env.DB.prepare(
      "SELECT id, mocha_user_id, first_name, last_name, email, hr_permissions, created_at, updated_at FROM users WHERE id = ?"
    ).bind(targetUserId).first();

    if (!updatedUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      ...updatedUser,
      permissions: updatedUser.hr_permissions ? JSON.parse(updatedUser.hr_permissions as string) : []
    });
  } catch (error) {
    console.error('Error updating HR user permissions:', error);
    return c.json({ error: 'Failed to update permissions' }, 500);
  }
});

// Get available permissions and role presets
app.get("/api/admin/permissions-config", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user");
    if (!mochaUser) {
      return c.json({ error: 'User not found' }, 401);
    }
    
    // Get current user's profile to check if they're admin
    const userProfile = await c.env.DB.prepare(
      "SELECT * FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    return c.json({
      permissions: PERMISSIONS,
      rolePresets: ROLE_PRESETS
    });
  } catch (error) {
    console.error('Error getting permissions config:', error);
    return c.json({ error: 'Failed to get permissions config' }, 500);
  }
});

// Apply role preset to user
app.post("/api/admin/hr-users/:id/apply-preset", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user");
    if (!mochaUser) {
      return c.json({ error: 'User not found' }, 401);
    }
    const targetUserId = parseInt(c.req.param('id'));
    const { preset } = await c.req.json();

    // Get current user's profile to check if they're admin
    const userProfile = await c.env.DB.prepare(
      "SELECT * FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    // Validate preset exists
    const presetPermissions = (ROLE_PRESETS as any)[preset];
    if (!presetPermissions) {
      return c.json({ error: 'Invalid preset' }, 400);
    }

    // Update user permissions with preset
    await c.env.DB.prepare(`
      UPDATE users 
      SET hr_permissions = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ? AND role = 'HR'
    `).bind(JSON.stringify(presetPermissions), targetUserId).run();

    // Get updated user
    const updatedUser = await c.env.DB.prepare(
      "SELECT id, mocha_user_id, first_name, last_name, email, hr_permissions, created_at, updated_at FROM users WHERE id = ?"
    ).bind(targetUserId).first();

    if (!updatedUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    return c.json({
      ...updatedUser,
      permissions: updatedUser.hr_permissions ? JSON.parse(updatedUser.hr_permissions as string) : []
    });
  } catch (error) {
    console.error('Error applying preset to HR user:', error);
    return c.json({ error: 'Failed to apply preset' }, 500);
  }
});

// Get all active employees (non-HR users)
app.get("/api/admin/employees-list", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user");
    if (!mochaUser) {
      return c.json({ error: 'User not found' }, 401);
    }
    
    // Get current user's profile to check if they're admin
    const userProfile = await c.env.DB.prepare(
      "SELECT * FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    // Get all active employees who are not HR
    const employees = await c.env.DB.prepare(`
      SELECT id, mocha_user_id, first_name, last_name, email, department, position, created_at
      FROM users 
      WHERE role = 'EMPLOYEE' AND status = 'ACTIVE'
      ORDER BY first_name, last_name
    `).all();

    return c.json(employees.results || []);
  } catch (error) {
    console.error('Error getting employees list:', error);
    return c.json({ error: 'Failed to get employees list' }, 500);
  }
});

// Promote employee to HR
app.post("/api/admin/promote-to-hr/:id", authMiddleware, rateLimiter(RateLimits.SENSITIVE), async (c) => {
  try {
    const mochaUser = c.get("user");
    if (!mochaUser) {
      return c.json({ error: 'User not found' }, 401);
    }
    const employeeId = validator.validateInteger(c.req.param('id'), 1);
    const { preset } = await c.req.json();

    if (!employeeId) {
      return c.json({ error: 'Invalid employee ID' }, 400);
    }

    // Get current user's profile to check if they're admin
    const userProfile = await c.env.DB.prepare(
      "SELECT * FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    // Validate employee exists and is not already HR
    const employee = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(employeeId).first();

    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404);
    }

    if ((employee as any).role === 'HR') {
      return c.json({ error: 'User is already HR' }, 400);
    }

    // Get permissions from preset if provided
    let permissions: string[] = [];
    if (preset && (ROLE_PRESETS as any)[preset]) {
      permissions = (ROLE_PRESETS as any)[preset];
    }

    // Log role change
    logSecurityEvent({
      ...createSecurityContext(c),
      type: SecurityEventType.USER_ROLE_CHANGED,
      userId: mochaUser.id,
      userEmail: (userProfile as any).email,
      details: { 
        targetUserId: employeeId,
        targetEmail: (employee as any).email,
        oldRole: 'EMPLOYEE',
        newRole: 'HR',
        preset: preset || 'none'
      }
    });

    // Promote employee to HR
    await c.env.DB.prepare(`
      UPDATE users 
      SET role = 'HR', hr_permissions = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(JSON.stringify(permissions), employeeId).run();

    // Get the updated user
    const updatedUser = await c.env.DB.prepare(
      "SELECT id, mocha_user_id, first_name, last_name, email, hr_permissions, created_at, updated_at FROM users WHERE id = ?"
    ).bind(employeeId).first();

    return c.json({
      ...updatedUser,
      permissions: updatedUser!.hr_permissions ? JSON.parse((updatedUser as any).hr_permissions) : []
    });
  } catch (error) {
    console.error('Error promoting employee to HR:', error);
    return c.json({ error: 'Failed to promote employee to HR' }, 500);
  }
});

// Demote HR user to employee
app.post("/api/admin/demote-from-hr/:id", authMiddleware, rateLimiter(RateLimits.SENSITIVE), async (c) => {
  try {
    const mochaUser = c.get("user");
    if (!mochaUser) {
      return c.json({ error: 'User not found' }, 401);
    }
    const hrUserId = validator.validateInteger(c.req.param('id'), 1);

    if (!hrUserId) {
      return c.json({ error: 'Invalid user ID' }, 400);
    }

    // Get current user's profile to check if they're admin
    const userProfile = await c.env.DB.prepare(
      "SELECT * FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    // Prevent demoting yourself
    if ((userProfile as any).id === hrUserId) {
      return c.json({ error: 'Cannot demote yourself' }, 400);
    }

    // Validate user exists and is HR
    const hrUser = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ?"
    ).bind(hrUserId).first();

    if (!hrUser) {
      return c.json({ error: 'User not found' }, 404);
    }

    if ((hrUser as any).role !== 'HR') {
      return c.json({ error: 'User is not HR' }, 400);
    }

    // Log role change
    logSecurityEvent({
      ...createSecurityContext(c),
      type: SecurityEventType.USER_ROLE_CHANGED,
      userId: mochaUser.id,
      userEmail: (userProfile as any).email,
      details: { 
        targetUserId: hrUserId,
        targetEmail: (hrUser as any).email,
        oldRole: 'HR',
        newRole: 'EMPLOYEE'
      }
    });

    // Demote HR user to employee
    await c.env.DB.prepare(`
      UPDATE users 
      SET role = 'EMPLOYEE', hr_permissions = NULL, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).bind(hrUserId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error demoting HR user:', error);
    return c.json({ error: 'Failed to demote HR user' }, 500);
  }
});

export default app;
