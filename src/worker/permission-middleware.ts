import type { Context } from "hono";
import { hasPermission } from "./permissions";

type Bindings = {
  DB: D1Database;
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
};

/**
 * Middleware helper para validar permisos en rutas
 */
export function requirePermission(permission: string) {
  return async (c: Context<{ Bindings: Bindings }>, next: () => Promise<void>) => {
    try {
      const mochaUser = c.get("user");
      if (!mochaUser) {
        return c.json({ error: 'User not authenticated' }, 401);
      }
      
      // Obtener perfil del usuario
      const userProfile = await c.env.DB.prepare(
        "SELECT * FROM users WHERE mocha_user_id = ?"
      ).bind(mochaUser.id).first();

      if (!userProfile) {
        return c.json({ error: 'User profile not found' }, 404);
      }

      if (!hasPermission(userProfile as any, permission)) {
        return c.json({ 
          error: `Unauthorized: Missing ${permission} permission`,
          required_permission: permission
        }, 403);
      }

      await next();
    } catch (error) {
      console.error('Error in requirePermission middleware:', error);
      return c.json({ error: 'Permission validation failed' }, 500);
    }
  };
}
