import { Hono } from "hono";
import { cors } from "hono/cors";
import {
  authMiddleware,
  exchangeCodeForSessionToken,
  getOAuthRedirectUrl,
  deleteSession,
  MOCHA_SESSION_TOKEN_COOKIE_NAME,
} from "@getmocha/users-service/backend";
import { getCookie, setCookie } from "hono/cookie";
import type { MochaUser } from "@getmocha/users-service/shared";
import { createOpenAIService } from "../shared/openai";
import aiRoutes from "./ai-endpoints";
import adminRoutes from "./admin-endpoints";
import whatsappRoutes from "./whatsapp-endpoints";
import { hasPermission, PERMISSIONS } from "./permissions";
import { requirePermission } from "./permission-middleware";
import { securityHeaders } from "./security-headers";
import { rateLimiter, RateLimits } from "./rate-limiter";
import { logSecurityEvent, SecurityEventType, createSecurityContext } from "./security-logger";
import { auditLog, AuditAction, AuditModule } from "./audit-logger";
import { createDatabaseBackup } from "./backup-service";
import * as validator from "./validation";
import { db, dbHelpers } from "./db";

type Bindings = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  MOCHA_USERS_SERVICE_API_URL: string;
  MOCHA_USERS_SERVICE_API_KEY: string;
  OPENAI_API_KEY: string;
  R2_BUCKET?: R2Bucket;
};



const app = new Hono<{ Bindings: Bindings }>();

// Security headers middleware - applied first
app.use('*', securityHeaders());

// CORS middleware
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Mount AI routes
app.route('/', aiRoutes);

// Mount admin routes
app.route('/', adminRoutes);

// Mount WhatsApp routes
app.route('/', whatsappRoutes);

// OAuth redirect URL endpoint
app.get('/api/oauth/google/redirect_url', async (c) => {
  try {
    const redirectUrl = await getOAuthRedirectUrl('google', {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });

    return c.json({ redirectUrl }, 200);
  } catch (error) {
    console.error('Error getting OAuth redirect URL:', error);
    return c.json({ error: 'Failed to get redirect URL' }, 500);
  }
});

// Exchange code for session token
app.post("/api/sessions", rateLimiter(RateLimits.AUTH), async (c) => {
  try {
    console.log('[AUTH] Session token exchange initiated');
    const body = await c.req.json();

    if (!body.code) {
      console.error('[AUTH] No authorization code provided');
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        details: { reason: 'Missing authorization code' }
      });
      return c.json({ error: "No authorization code provided" }, 400);
    }

    console.log('[AUTH] Calling exchangeCodeForSessionToken with code');
    const sessionToken = await exchangeCodeForSessionToken(body.code, {
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
    });

    console.log('[AUTH] Session token received successfully');

    setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: "none",
      secure: true,
      maxAge: 60 * 24 * 60 * 60, // 60 days
    });

    console.log('[AUTH] Cookie set');

    logSecurityEvent({
      ...createSecurityContext(c),
      type: SecurityEventType.LOGIN_SUCCESS
    });

    console.log('[AUTH] Security event logged');
    console.log('[AUTH] Session exchange completed successfully');

    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('[AUTH] Error exchanging code for session token:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
      apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL ? 'configured' : 'missing',
      apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY ? 'configured' : 'missing'
    };
    
    console.error('[AUTH] Error details:', errorDetails);
    
    // Provide user-friendly error message based on error type
    let userMessage = 'Error de autenticación. Por favor, intenta nuevamente.';
    
    if (errorMessage.includes('fetch')) {
      userMessage = 'Error de conexión con el servicio de autenticación.';
    } else if (errorMessage.includes('timeout')) {
      userMessage = 'El servicio de autenticación tardó demasiado en responder.';
    } else if (errorMessage.includes('API responded with HTTP status 500')) {
      userMessage = 'Error interno del servidor de autenticación. Por favor, contacta al administrador.';
    }
    
    return c.json({ 
      error: userMessage,
      technical_details: errorMessage
    }, 500);
  }
});

// Get current user with enhanced profile
app.get("/api/users/me", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Try to find user in our database
    const { data: userResult, error } = await db
      .from('users')
      .select('*')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (userResult) {
      return c.json({
        ...mochaUser,
        profile: userResult
      });
    } else if (error?.code === 'PGRST116') {
      // Row not found - return just the Mocha user if no profile exists yet
      return c.json({
        ...mochaUser,
        profile: null
      });
    } else if (error) {
      throw error;
    }

    return c.json({
      ...mochaUser,
      profile: null
    });
  } catch (error) {
    console.error('Error getting user profile:', error);
    return c.json(c.get("user"));
  }
});

// Create or update user profile
app.post("/api/users/profile", authMiddleware, rateLimiter(RateLimits.MUTATION), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    console.log('[PROFILE UPDATE] Request for user:', mochaUser.id, mochaUser.email);
    
    const body = await c.req.json();
    console.log('[PROFILE UPDATE] Data received:', JSON.stringify(body, null, 2));
    
    const {
      first_name,
      last_name,
      ci,
      phone,
      role,
      birth_date,
      department,
      position,
      payroll_type,
      base_salary,
      manager_id,
      sede,
      company_name,
      shirt_size,
      pants_size,
      boots_size
    } = body;

    // Validate and sanitize inputs
    const cleanFirstName = validator.sanitizeString(first_name, 100);
    const cleanLastName = validator.sanitizeString(last_name, 100);
    const cleanCI = validator.validateCI(ci);
    const cleanPhone = validator.validatePhone(phone);
    const cleanBirthDate = validator.validateDate(birth_date);
    const cleanDepartment = validator.sanitizeString(department, 100);
    const cleanPosition = validator.sanitizeString(position, 100);
    const cleanPayrollType = validator.validateEnum(payroll_type, ['OPERARIO', 'EMPLEADO', 'CONFIDENCIAL']);
    const cleanBaseSalary = validator.validateMoneyAmount(base_salary);
    const cleanManagerId = validator.validateInteger(manager_id);
    const cleanSede = validator.validateEnum(sede, ['El Pilar', 'Caracas', 'Sur del Lago', 'Miranda', 'Apure']);
    const cleanCompanyName = validator.sanitizeString(company_name, 200);
    const cleanShirtSize = validator.sanitizeString(shirt_size, 20);
    const cleanPantsSize = validator.sanitizeString(pants_size, 20);
    const cleanBootsSize = validator.sanitizeString(boots_size, 20);

    // Validate required fields
    if (!cleanFirstName) {
      console.error('[PROFILE UPDATE] Validation error: first_name is required');
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser.id,
        details: { field: 'first_name' }
      });
      return c.json({ error: 'El nombre es requerido' }, 400);
    }
    
    if (!cleanLastName) {
      console.error('[PROFILE UPDATE] Validation error: last_name is required');
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser.id,
        details: { field: 'last_name' }
      });
      return c.json({ error: 'El apellido es requerido' }, 400);
    }
    
    if (!cleanCI) {
      console.error('[PROFILE UPDATE] Validation error: ci is required or invalid');
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser.id,
        details: { field: 'ci' }
      });
      return c.json({ error: 'La cédula de identidad es requerida y debe ser válida' }, 400);
    }

    // Prepare clean data
    const cleanData = {
      first_name: cleanFirstName,
      last_name: cleanLastName,
      ci: cleanCI,
      phone: cleanPhone,
      role: role || 'EMPLOYEE',
      birth_date: cleanBirthDate,
      department: cleanDepartment,
      position: cleanPosition,
      payroll_type: cleanPayrollType,
      base_salary: cleanBaseSalary,
      manager_id: cleanManagerId,
      sede: cleanSede,
      company_name: cleanCompanyName || 'Cacao San Jose, C.A.',
      shirt_size: cleanShirtSize,
      pants_size: cleanPantsSize,
      boots_size: cleanBootsSize
    };

    console.log('[PROFILE UPDATE] Cleaned data ready');

    // STEP 1: Check if user exists by mocha_user_id (most reliable identifier)
    const { data: existingUserByMochaId, error: err1 } = await db
      .from('users')
      .select('id, ci, email')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (existingUserByMochaId) {
      // User already exists with this mocha_user_id - this is an UPDATE
      const userId = existingUserByMochaId.id;
      console.log(`[PROFILE UPDATE] Found existing user by mocha_user_id: ${userId}. Updating profile.`);

      // Check if CI is being changed to one that belongs to another user
      if (cleanData.ci && cleanData.ci !== existingUserByMochaId.ci) {
        const { data: ciConflict } = await db
          .from('users')
          .select('id')
          .eq('ci', cleanData.ci)
          .neq('mocha_user_id', mochaUser.id)
          .single();

        if (ciConflict) {
          console.error(`[PROFILE UPDATE] CI conflict: ${cleanData.ci} already used by another user`);
          return c.json({ error: `La cédula ${cleanData.ci} ya está registrada para otro empleado.` }, 400);
        }
      }

      // Update the profile
      const { error: updateErr } = await db
        .from('users')
        .update({
          email: mochaUser.email,
          ...cleanData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (updateErr) throw updateErr;

      console.log('[PROFILE UPDATE] Profile updated successfully');
      return c.json({ success: true });
    }

    // STEP 2: User doesn't have mocha_user_id linked yet - check by email or CI
    console.log('[PROFILE UPDATE] No user found by mocha_user_id. Checking by email/CI...');

    const { data: existingUserByEmail } = await db
      .from('users')
      .select('id, mocha_user_id, ci')
      .eq('email', mochaUser.email)
      .single();

    const { data: existingUserByCI } = cleanData.ci
      ? await db
          .from('users')
          .select('id, mocha_user_id, email')
          .eq('ci', cleanData.ci)
          .single()
      : { data: null };

    // Determine which existing user to link to
    let userToLink = null;

    if (existingUserByEmail && !existingUserByEmail.mocha_user_id) {
      userToLink = existingUserByEmail;
      console.log('[PROFILE UPDATE] Found unlinked user by email');
    } else if (existingUserByCI && !existingUserByCI.mocha_user_id) {
      userToLink = existingUserByCI;
      console.log('[PROFILE UPDATE] Found unlinked user by CI');
    }

    if (userToLink) {
      // Link and update existing user
      const userId = userToLink.id;
      console.log(`[PROFILE UPDATE] Linking mocha_user_id to existing user ${userId} and updating`);

      const { error: linkErr } = await db
        .from('users')
        .update({
          mocha_user_id: mochaUser.id,
          email: mochaUser.email,
          ...cleanData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);

      if (linkErr) throw linkErr;

      console.log('[PROFILE UPDATE] User linked and updated successfully');
      return c.json({ success: true });
    }

    // STEP 3: No existing user found - user must be created by HR
    console.log('[PROFILE UPDATE] No existing user found to link or update.');
    console.log('[PROFILE UPDATE] User must be created by HR administrator first.');

    return c.json({
      error: 'Tu perfil de empleado no se encuentra en el sistema. Para completar tu registro, debes contactar al departamento de Talento Humano para que creen tu perfil de empleado. Una vez creado, podrás completar esta configuración e iniciar sesión en la aplicación.'
    }, 404);
  } catch (error) {
    console.error('[PROFILE UPDATE] Error:', error);
    console.error('[PROFILE UPDATE] Stack:', error instanceof Error ? error.stack : 'No stack trace');
    return c.json({ 
      error: 'Error al actualizar el perfil. Por favor, intenta nuevamente o contacta al administrador.' 
    }, 500);
  }
});

// Get dashboard statistics
app.get("/api/dashboard/stats", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role, hr_permissions')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const stats: any = {};

    if (userProfile.role === 'HR') {
      // Stats for HR users

      // Active employees count
      const { count: activeEmployeesCount } = await db
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('role', 'EMPLOYEE')
        .eq('status', 'ACTIVE');
      stats.activeEmployees = activeEmployeesCount || 0;

      // Candidates in process count
      const { count: candidatesCount } = await db
        .from('candidates')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PHONE_SCREEN', 'INTERVIEW', 'OFFER']);
      stats.candidatesInProcess = candidatesCount || 0;

      // Pending requests count (if has permission)
      if (hasPermission(userProfile as any, PERMISSIONS.REQUEST_VIEW_ALL)) {
        const { count: requestsCount } = await db
          .from('requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING');
        stats.pendingRequests = requestsCount || 0;
      }

      // Active loans count (if has permission)
      if (hasPermission(userProfile as any, PERMISSIONS.LOAN_VIEW_ALL)) {
        const { count: loansCount } = await db
          .from('loans')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ACTIVE');
        stats.activeLoans = loansCount || 0;
      }

      // Pending evaluations count (if has permission)
      if (hasPermission(userProfile as any, PERMISSIONS.EVALUATION_VIEW_ALL)) {
        const { count: evaluationsCount } = await db
          .from('evaluations')
          .select('*', { count: 'exact', head: true })
          .in('status', ['PENDING', 'SELF_COMPLETED', 'MANAGER_COMPLETED']);
        stats.pendingEvaluations = evaluationsCount || 0;
      }

      // Upcoming events count
      const today = new Date().toISOString().split('T')[0];
      const { count: eventsCount } = await db
        .from('corporate_events')
        .select('*', { count: 'exact', head: true })
        .gte('start_date', today);
      stats.upcomingEvents = eventsCount || 0;

      // Pending complaints count (if has permission)
      if (hasPermission(userProfile as any, PERMISSIONS.COMPLAINT_VIEW_ALL)) {
        const { count: complaintsCount } = await db
          .from('complaints')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING');
        stats.pendingComplaints = complaintsCount || 0;
      }

      // Assigned assets count (if has permission)
      if (hasPermission(userProfile as any, PERMISSIONS.ASSET_VIEW_ALL)) {
        const { count: assetsCount } = await db
          .from('assets')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ASSIGNED');
        stats.assignedAssets = assetsCount || 0;
      }
    } else {
      // Stats for regular employees

      // My pending requests
      const { count: requestsCount } = await db
        .from('requests')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userProfile.id)
        .eq('status', 'PENDING');
      stats.myPendingRequests = requestsCount || 0;

      // My active loans
      const { count: loansCount } = await db
        .from('loans')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userProfile.id)
        .eq('status', 'ACTIVE');
      stats.myActiveLoans = loansCount || 0;

      // My pending evaluations
      const { count: evaluationsCount } = await db
        .from('evaluations')
        .select('*', { count: 'exact', head: true })
        .eq('employee_id', userProfile.id)
        .in('status', ['PENDING', 'MANAGER_COMPLETED']);
      stats.myPendingEvaluations = evaluationsCount || 0;

      // Upcoming events
      const today = new Date().toISOString().split('T')[0];
      const { count: eventsCount } = await db
        .from('corporate_events')
        .select('*', { count: 'exact', head: true })
        .gte('start_date', today);
      stats.upcomingEvents = eventsCount || 0;

      // My assigned assets
      const { count: assetsCount } = await db
        .from('assets')
        .select('*', { count: 'exact', head: true })
        .eq('assigned_to_id', userProfile.id);
      stats.myAssignedAssets = assetsCount || 0;

      // My pending complaints
      const { count: complaintsCount } = await db
        .from('complaints')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userProfile.id)
        .eq('status', 'PENDING');
      stats.myPendingComplaints = complaintsCount || 0;

      // My payslips this year
      const currentYear = new Date().getFullYear();
      stats.myPayslipsThisYear = 0; // Will implement when payslips table is added
    }

    return c.json(stats);
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return c.json({ error: 'Failed to get dashboard stats' }, 500);
  }
});

// Get birthdays (all authenticated users)
app.get("/api/birthdays", authMiddleware, async (c) => {
  try {
    const includeInactive = c.req.query('include_inactive') === 'true';

    let query = db
      .from('users')
      .select('id, first_name, last_name, birth_date, department, position, photo_url, status, role')
      .not('birth_date', 'is', null);

    if (!includeInactive) {
      query = query.eq('status', 'ACTIVE');
    }

    const { data: birthdays, error: err } = await query.order('first_name').order('last_name');

    if (err) throw err;
    return c.json(birthdays || []);
  } catch (error) {
    console.error('Error getting birthdays:', error);
    return c.json({ error: 'Failed to get birthdays' }, 500);
  }
});

// Get all employees (HR only)
app.get("/api/employees", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Get user profile to check role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      console.error('User profile not found for mocha_user_id:', mochaUser.id);
      return c.json({ error: 'User profile not found' }, 404);
    }

    console.log('User profile found:', { id: userProfile.id, role: userProfile.role });

    // Simple HR check - any HR user can view employees
    if (userProfile.role !== 'HR') {
      console.error('User is not HR. Role:', userProfile.role);
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    const includeInactive = c.req.query('include_inactive') === 'true';

    let query = db
      .from('users')
      .select(
        'id, first_name, last_name, email, ci, phone, department, position, payroll_type, base_salary, birth_date, sede, company_name, status, created_at, updated_at'
      )
      .eq('role', 'EMPLOYEE')
      .order('status', { ascending: false })
      .order('first_name', { ascending: true })
      .order('last_name', { ascending: true });

    if (!includeInactive) {
      query = query.eq('status', 'ACTIVE');
    }

    const { data: employees, error: err } = await query;

    if (err) throw err;

    console.log('Found employees:', employees?.length || 0);
    if (employees && employees.length > 0) {
      console.log('First employee:', employees[0]);
    }

    return c.json(employees || []);
  } catch (error) {
    console.error('Error getting employees:', error);
    return c.json({ error: 'Failed to get employees: ' + (error as Error).message }, 500);
  }
});

// Get requests (user's own or all for HR)
app.get("/api/requests", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Get user profile to check role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role, hr_permissions')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    let requests;
    if (userProfile.role === 'HR' && hasPermission(userProfile as any, PERMISSIONS.REQUEST_VIEW_ALL)) {
      // HR can see all requests if they have the permission
      const { data: allRequests, error: err } = await db
        .from('requests')
        .select(`
          *,
          user:users(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (err) throw err;
      requests = allRequests || [];
    } else {
      // Regular employees can only see their own requests
      const { data: userRequests, error: err } = await db
        .from('requests')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (err) throw err;
      requests = userRequests || [];
    }

    return c.json(requests);
  } catch (error) {
    console.error('Error getting requests:', error);
    return c.json({ error: 'Failed to get requests' }, 500);
  }
});

// Get documents
app.get("/api/documents", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Get user profile to check role and department
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('role, department')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    let query = db
      .from('documents')
      .select(`
        *,
        uploader:users(first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (userProfile.role !== 'HR') {
      // Regular employees can only see public documents or those for their department
      query = query.or(
        `is_public.eq.true,department.eq.${userProfile.department},department.is.null`
      );
    }

    const { data: documents, error: err } = await query;

    if (err) throw err;
    return c.json(documents || []);
  } catch (error) {
    console.error('Error getting documents:', error);
    return c.json({ error: 'Failed to get documents' }, 500);
  }
});

// Get loans (user's own or all for HR)
app.get("/api/loans", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Get user profile to check role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    let loans;
    if (userProfile.role === 'HR') {
      // HR can see all loans
      const { data: allLoans, error: err } = await db
        .from('loans')
        .select(`
          *,
          user:users(first_name, last_name)
        `)
        .order('created_at', { ascending: false });

      if (err) throw err;
      loans = allLoans || [];
    } else {
      // Regular employees can only see their own loans
      const { data: userLoans, error: err } = await db
        .from('loans')
        .select('*')
        .eq('user_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (err) throw err;
      loans = userLoans || [];
    }

    return c.json(loans);
  } catch (error) {
    console.error('Error getting loans:', error);
    return c.json({ error: 'Failed to get loans' }, 500);
  }
});

// Get detailed loans with additional info
app.get("/api/loans/detailed", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    
    // Get user profile to check role
    const userProfile = await c.env.DB.prepare(
      "SELECT id, role, hr_permissions FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    let loans;
    if (userProfile.role === 'HR' && hasPermission(userProfile as any, PERMISSIONS.LOAN_VIEW_ALL)) {
      // HR can see all loans with detailed info
      loans = await c.env.DB.prepare(`
        SELECT l.*, 
               u.first_name || ' ' || u.last_name as employee_name,
               u.email as employee_email,
               (SELECT SUM(amount_paid) FROM loan_payments WHERE loan_id = l.id) as total_paid,
               (l.principal_amount - COALESCE((SELECT SUM(amount_paid) FROM loan_payments WHERE loan_id = l.id), 0)) as pending_amount
        FROM loans l
        JOIN users u ON l.user_id = u.id
        ORDER BY l.created_at DESC
      `).all();
    } else {
      // Regular employees can only see their own loans
      loans = await c.env.DB.prepare(`
        SELECT l.*,
               (SELECT SUM(amount_paid) FROM loan_payments WHERE loan_id = l.id) as total_paid,
               (l.principal_amount - COALESCE((SELECT SUM(amount_paid) FROM loan_payments WHERE loan_id = l.id), 0)) as pending_amount
        FROM loans l
        WHERE l.user_id = ?
        ORDER BY l.created_at DESC
      `).bind(userProfile.id).all();
    }

    return c.json(loans.results || []);
  } catch (error) {
    console.error('Error getting detailed loans:', error);
    return c.json({ error: 'Failed to get detailed loans' }, 500);
  }
});

// Create loan with repayment plan and installments
app.post("/api/loans", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user");
    
    const userProfile = await c.env.DB.prepare(
      "SELECT id, role FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser!.id).first();
    
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Check if user is HR
    if (userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    const { 
      user_id, 
      principal_amount, 
      category, 
      issue_date, 
      repayment_plan,
      employee_base_salary 
    } = await c.req.json();

    // Calculate installment details
    let installmentAmount = 0;
    let totalInstallments = 0;
    const { method, value, frequency, start_date } = repayment_plan;

    switch (method) {
      case 'FIXED_INSTALLMENTS':
        totalInstallments = value;
        installmentAmount = principal_amount / totalInstallments;
        break;
      case 'FIXED_AMOUNT':
        installmentAmount = value;
        totalInstallments = Math.ceil(principal_amount / installmentAmount);
        break;
      case 'SALARY_PERCENTAGE':
        if (employee_base_salary) {
          installmentAmount = (employee_base_salary * value) / 100;
          totalInstallments = Math.ceil(principal_amount / installmentAmount);
        } else {
          return c.json({ error: 'Employee salary information required for percentage method' }, 400);
        }
        break;
    }

    // Create loan
    const loanResult = await c.env.DB.prepare(`
      INSERT INTO loans (
        user_id, principal_amount, interest_rate, status, issue_date, category,
        monthly_installment, total_installments, remaining_installments
      ) VALUES (?, ?, 0, 'ACTIVE', ?, ?, ?, ?, ?)
    `).bind(
      user_id, principal_amount, issue_date, category,
      installmentAmount, totalInstallments, totalInstallments
    ).run();

    const loanId = loanResult.meta.last_row_id;

    // Create repayment plan
    await c.env.DB.prepare(`
      INSERT INTO loan_repayment_plans (loan_id, method, value, frequency, start_date)
      VALUES (?, ?, ?, ?, ?)
    `).bind(loanId, method, value, frequency, start_date).run();

    // Generate installments
    const startDate = new Date(start_date);
    let balance = principal_amount;

    for (let i = 1; i <= totalInstallments; i++) {
      const dueDate = new Date(startDate);
      
      // Calculate due date based on frequency
      switch (frequency) {
        case 'WEEKLY':
          dueDate.setDate(startDate.getDate() + (i - 1) * 7);
          break;
        case 'BIWEEKLY':
          dueDate.setDate(startDate.getDate() + (i - 1) * 14);
          break;
        case 'MONTHLY':
          dueDate.setMonth(startDate.getMonth() + (i - 1));
          break;
      }

      // For the last installment, adjust amount to cover any rounding differences
      const currentAmount = (i === totalInstallments) ? balance : installmentAmount;
      balance -= currentAmount;

      await c.env.DB.prepare(`
        INSERT INTO loan_installments (
          loan_id, installment_number, due_date, amount_due, balance
        ) VALUES (?, ?, ?, ?, ?)
      `).bind(loanId, i, dueDate.toISOString().split('T')[0], currentAmount, Math.max(0, balance)).run();
    }

    // Get the created loan with employee info
    const createdLoan = await c.env.DB.prepare(`
      SELECT l.*, 
             u.first_name || ' ' || u.last_name as employee_name,
             u.email as employee_email
      FROM loans l
      JOIN users u ON l.user_id = u.id
      WHERE l.id = ?
    `).bind(loanId).first();

    return c.json(createdLoan);
  } catch (error) {
    console.error('Error creating loan:', error);
    return c.json({ error: 'Failed to create loan' }, 500);
  }
});

// Get loan installments
app.get("/api/loans/:id/installments", authMiddleware, async (c) => {
  try {
    const loanId = parseInt(c.req.param('id'));
    const statusFilter = c.req.query('status');

    let query = db
      .from('loan_installments')
      .select('*')
      .eq('loan_id', loanId);

    if (statusFilter === 'pending') {
      query = query.in('status', ['PENDING', 'PARTIALLY_PAID']);
    }

    const { data: installments, error: err } = await query.order('installment_number', { ascending: true });

    if (err) throw err;
    return c.json(installments || []);
  } catch (error) {
    console.error('Error getting loan installments:', error);
    return c.json({ error: 'Failed to get loan installments' }, 500);
  }
});

// Get loan payments
app.get("/api/loans/:id/payments", authMiddleware, async (c) => {
  try {
    const loanId = parseInt(c.req.param('id'));

    const { data: payments, error: err } = await db
      .from('loan_payments')
      .select(`
        *,
        recorded_by:users(first_name, last_name)
      `)
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (err) throw err;
    return c.json(payments || []);
  } catch (error) {
    console.error('Error getting loan payments:', error);
    return c.json({ error: 'Failed to get loan payments' }, 500);
  }
});

// Register loan payment
app.post("/api/loans/:id/payments", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user");
    const loanId = parseInt(c.req.param('id'));
    
    const userProfile = await c.env.DB.prepare(
      "SELECT id, role FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser!.id).first();
    
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Check if user is HR for payment registration
    if (userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    const { installment_id, amount_paid, payment_date, payment_method, reference } = await c.req.json();

    // Get installment details
    const installment = await c.env.DB.prepare(
      "SELECT * FROM loan_installments WHERE id = ? AND loan_id = ?"
    ).bind(installment_id, loanId).first();

    if (!installment) {
      return c.json({ error: 'Installment not found' }, 404);
    }

    const remainingAmount = (installment as any).amount_due - (installment as any).amount_paid;
    
    if (amount_paid > remainingAmount) {
      return c.json({ error: 'Payment amount exceeds remaining installment balance' }, 400);
    }

    // Create payment record
    await c.env.DB.prepare(`
      INSERT INTO loan_payments (
        loan_id, installment_id, amount_paid, payment_date, payment_method, reference, recorded_by_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
    `).bind(
      loanId, installment_id, amount_paid, payment_date, payment_method, reference, userProfile.id
    ).run();

    // Update installment
    const newAmountPaid = (installment as any).amount_paid + amount_paid;
    const newStatus = newAmountPaid >= (installment as any).amount_due ? 'PAID' : 'PARTIALLY_PAID';

    await c.env.DB.prepare(`
      UPDATE loan_installments 
      SET amount_paid = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(newAmountPaid, newStatus, installment_id).run();

    // Check if all installments are paid
    const unpaidInstallments = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM loan_installments WHERE loan_id = ? AND status != 'PAID'"
    ).bind(loanId).first();

    if ((unpaidInstallments as any)?.count === 0) {
      // Mark loan as paid off
      await c.env.DB.prepare(
        "UPDATE loans SET status = 'PAID_OFF', updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(loanId).run();
    }

    // Update remaining installments count
    const remainingCount = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM loan_installments WHERE loan_id = ? AND status IN ('PENDING', 'PARTIALLY_PAID')"
    ).bind(loanId).first();

    await c.env.DB.prepare(
      "UPDATE loans SET remaining_installments = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind((remainingCount as any)?.count || 0, loanId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error registering loan payment:', error);
    return c.json({ error: 'Failed to register payment' }, 500);
  }
});

// Delete loan (HR only)
app.delete("/api/loans/:id", authMiddleware, requirePermission(PERMISSIONS.LOAN_DELETE), async (c) => {
  try {
    const loanId = parseInt(c.req.param('id'));

    // Delete in correct order due to foreign key relationships
    await c.env.DB.prepare("DELETE FROM loan_payments WHERE loan_id = ?").bind(loanId).run();
    await c.env.DB.prepare("DELETE FROM loan_installments WHERE loan_id = ?").bind(loanId).run();
    await c.env.DB.prepare("DELETE FROM loan_repayment_plans WHERE loan_id = ?").bind(loanId).run();
    await c.env.DB.prepare("DELETE FROM loans WHERE id = ?").bind(loanId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting loan:', error);
    return c.json({ error: 'Failed to delete loan' }, 500);
  }
});

// Get evaluations (user's own or all for HR)
app.get("/api/evaluations", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Get user profile to check role and permissions
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role, hr_permissions')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const userId = userProfile.id;
    const isHR = userProfile.role === 'HR';

    let evaluations;
    if (isHR && hasPermission(userProfile as any, PERMISSIONS.EVALUATION_VIEW_ALL)) {
      // HR with permission can see all evaluations
      const { data: allEvals, error: err } = await db
        .from('evaluations')
        .select(`
          *,
          employee:users!evaluations_employee_id_fkey(first_name, last_name, department),
          evaluator:users!evaluations_evaluator_id_fkey(first_name, last_name),
          cycle:evaluation_cycles(title)
        `)
        .order('created_at', { ascending: false });

      if (err) throw err;
      evaluations = allEvals || [];
    } else {
      // Employees see:
      // 1. Their own evaluations (where they are the employee)
      // 2. Evaluations where they are the evaluator (manager evaluating their reports)
      const { data: userEvals, error: err } = await db
        .from('evaluations')
        .select(`
          *,
          employee:users!evaluations_employee_id_fkey(first_name, last_name, department),
          evaluator:users!evaluations_evaluator_id_fkey(first_name, last_name),
          cycle:evaluation_cycles(title)
        `)
        .or(`employee_id.eq.${userId},evaluator_id.eq.${userId}`)
        .order('created_at', { ascending: false });

      if (err) throw err;
      evaluations = userEvals || [];
    }

    return c.json(evaluations);
  } catch (error) {
    console.error('Error getting evaluations:', error);
    return c.json({ error: 'Failed to get evaluations' }, 500);
  }
});

// Get evaluation cycles (HR only)
app.get("/api/evaluation-cycles", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    
    // Check if user has HR role and permission
    const userProfile = await c.env.DB.prepare(
      "SELECT role, hr_permissions FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    if (!hasPermission(userProfile as any, PERMISSIONS.EVALUATION_VIEW_ALL)) {
      return c.json({ error: 'Unauthorized: Missing permission to view evaluation cycles' }, 403);
    }

    const cycles = await c.env.DB.prepare(
      "SELECT * FROM evaluation_cycles ORDER BY created_at DESC"
    ).all();

    return c.json(cycles.results || []);
  } catch (error) {
    console.error('Error getting evaluation cycles:', error);
    return c.json({ error: 'Failed to get evaluation cycles' }, 500);
  }
});

// Submit self-evaluation
app.put("/api/evaluations/:id/self-evaluation", authMiddleware, rateLimiter(RateLimits.MUTATION), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const evaluationId = validator.validateInteger(c.req.param('id'), 1);
    const { self_score, self_comments } = await c.req.json();

    if (!evaluationId) {
      return c.json({ error: 'Invalid evaluation ID' }, 400);
    }

    // Validate and sanitize input
    const cleanScore = validator.validateScore(self_score);
    const cleanComments = validator.validateText(self_comments, 10, 2000);

    if (!cleanScore) {
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser.id,
        details: { field: 'self_score', value: self_score }
      });
      return c.json({ error: 'Invalid score. Must be between 1 and 5' }, 400);
    }

    if (!cleanComments) {
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser.id,
        details: { field: 'self_comments' }
      });
      return c.json({ error: 'Comments are required (10-2000 characters)' }, 400);
    }

    const userProfile = await c.env.DB.prepare(
      "SELECT id FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const userId = (userProfile as any).id;

    // Verify it's the user's self-evaluation
    const existingEvaluation = await c.env.DB.prepare(
      "SELECT employee_id, evaluator_id, status, cycle_id FROM evaluations WHERE id = ?"
    ).bind(evaluationId).first();

    if (!existingEvaluation) {
      return c.json({ error: 'Evaluation not found' }, 404);
    }

    // Must be a self-evaluation (employee_id == evaluator_id == current user)
    if ((existingEvaluation as any).employee_id !== userId || (existingEvaluation as any).evaluator_id !== userId) {
      return c.json({ error: 'Unauthorized: This is not your self-evaluation' }, 403);
    }

    if ((existingEvaluation as any).status !== 'PENDING') {
      return c.json({ error: 'Self-evaluation can only be submitted when status is PENDING' }, 400);
    }

    // Update self-evaluation
    await c.env.DB.prepare(`
      UPDATE evaluations SET
        self_score = ?,
        self_comments = ?,
        status = 'SELF_COMPLETED',
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(cleanScore, cleanComments, evaluationId).run();

    // Find corresponding manager evaluation and update its status to MANAGER_COMPLETED (pending manager input)
    await c.env.DB.prepare(`
      UPDATE evaluations SET
        status = 'MANAGER_COMPLETED',
        updated_at = CURRENT_TIMESTAMP
      WHERE cycle_id = ? AND employee_id = ? AND evaluator_id != ? AND status = 'PENDING'
    `).bind((existingEvaluation as any).cycle_id, (existingEvaluation as any).employee_id, userId).run();

    // Get updated evaluation
    const updatedEvaluation = await c.env.DB.prepare(`
      SELECT e.*, 
             emp.first_name || ' ' || emp.last_name as employee_name,
             emp.department as employee_department,
             eval.first_name || ' ' || eval.last_name as evaluator_name,
             ec.title as cycle_title
      FROM evaluations e
      JOIN users emp ON e.employee_id = emp.id
      JOIN users eval ON e.evaluator_id = eval.id
      JOIN evaluation_cycles ec ON e.cycle_id = ec.id
      WHERE e.id = ?
    `).bind(evaluationId).first();

    return c.json(updatedEvaluation);
  } catch (error) {
    console.error('Error submitting self-evaluation:', error);
    return c.json({ error: 'Failed to submit self-evaluation' }, 500);
  }
});

// Submit manager evaluation
app.put("/api/evaluations/:id/manager-evaluation", authMiddleware, rateLimiter(RateLimits.MUTATION), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const evaluationId = validator.validateInteger(c.req.param('id'), 1);
    const { manager_score, manager_comments } = await c.req.json();

    if (!evaluationId) {
      return c.json({ error: 'Invalid evaluation ID' }, 400);
    }

    // Validate and sanitize input
    const cleanScore = validator.validateScore(manager_score);
    const cleanComments = validator.validateText(manager_comments, 10, 2000);

    if (!cleanScore) {
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser.id,
        details: { field: 'manager_score', value: manager_score }
      });
      return c.json({ error: 'Invalid score. Must be between 1 and 5' }, 400);
    }

    if (!cleanComments) {
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser.id,
        details: { field: 'manager_comments' }
      });
      return c.json({ error: 'Comments are required (10-2000 characters)' }, 400);
    }

    const userProfile = await c.env.DB.prepare(
      "SELECT id, role, hr_permissions FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const userId = (userProfile as any).id;
    const isHR = (userProfile as any).role === 'HR';

    // Get the evaluation to verify its status and evaluator
    const evaluation = await c.env.DB.prepare(
      "SELECT * FROM evaluations WHERE id = ?"
    ).bind(evaluationId).first();

    if (!evaluation) {
      return c.json({ error: 'Evaluation not found' }, 404);
    }

    // Verify user is authorized to evaluate
    const canManageEvaluations = isHR && hasPermission(userProfile as any, PERMISSIONS.EVALUATION_MANAGE_EMPLOYEE_EVALUATION);
    const isAssignedEvaluator = (evaluation as any).evaluator_id === userId;

    if (!canManageEvaluations && !isAssignedEvaluator) {
      return c.json({ error: 'Unauthorized: You are not authorized to complete this evaluation' }, 403);
    }

    // Must not be a self-evaluation
    if ((evaluation as any).employee_id === (evaluation as any).evaluator_id) {
      return c.json({ error: 'Cannot submit manager evaluation for a self-evaluation' }, 400);
    }

    // Check valid status (MANAGER_COMPLETED means waiting for manager input)
    if ((evaluation as any).status !== 'MANAGER_COMPLETED') {
      return c.json({ error: 'Manager evaluation can only be submitted when status is MANAGER_COMPLETED (waiting for manager input)' }, 400);
    }

    // Update evaluation with manager input
    await c.env.DB.prepare(`
      UPDATE evaluations SET
        manager_score = ?,
        manager_comments = ?,
        final_score = ?,
        status = 'COMPLETED',
        completed_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(cleanScore, cleanComments, cleanScore, evaluationId).run();

    // Get the updated evaluation with employee and evaluator names
    const updatedEvaluation = await c.env.DB.prepare(`
      SELECT e.*, 
             emp.first_name || ' ' || emp.last_name as employee_name,
             emp.department as employee_department,
             eval.first_name || ' ' || eval.last_name as evaluator_name,
             ec.title as cycle_title
      FROM evaluations e
      JOIN users emp ON e.employee_id = emp.id
      JOIN users eval ON e.evaluator_id = eval.id
      JOIN evaluation_cycles ec ON e.cycle_id = ec.id
      WHERE e.id = ?
    `).bind(evaluationId).first();

    return c.json(updatedEvaluation);
  } catch (error) {
    console.error('Error submitting manager evaluation:', error);
    return c.json({ error: 'Failed to submit manager evaluation' }, 500);
  }
});

// Create evaluation cycle (HR only)
app.post("/api/evaluation-cycles", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    
    // Check if user has HR role and permission
    const userProfile = await c.env.DB.prepare(
      "SELECT id, role, hr_permissions FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    if (!hasPermission(userProfile as any, PERMISSIONS.EVALUATION_MANAGE_CYCLES)) {
      return c.json({ error: 'Unauthorized: Missing permission to manage evaluation cycles' }, 403);
    }

    const { title, description, start_date, end_date, department } = await c.req.json();

    // Validate input
    if (!title || !title.trim()) {
      return c.json({ error: 'Title is required' }, 400);
    }

    if (!start_date || !end_date) {
      return c.json({ error: 'Start date and end date are required' }, 400);
    }

    if (new Date(start_date) >= new Date(end_date)) {
      return c.json({ error: 'Start date must be before end date' }, 400);
    }

    // Create evaluation cycle
    const result = await c.env.DB.prepare(`
      INSERT INTO evaluation_cycles (
        title, description, start_date, end_date, department, status, created_by_id
      ) VALUES (?, ?, ?, ?, ?, 'DRAFT', ?)
    `).bind(title.trim(), description?.trim() || null, start_date, end_date, department?.trim() || null, userProfile.id).run();

    // Get the created cycle
    const cycle = await c.env.DB.prepare(
      "SELECT * FROM evaluation_cycles WHERE id = ?"
    ).bind(result.meta.last_row_id).first();

    return c.json(cycle);
  } catch (error) {
    console.error('Error creating evaluation cycle:', error);
    return c.json({ error: 'Failed to create evaluation cycle' }, 500);
  }
});

// Activate evaluation cycle (HR only)
app.put("/api/evaluation-cycles/:id/activate", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const cycleId = parseInt(c.req.param('id'));
    
    // Check if user has HR role and permission
    const userProfile = await c.env.DB.prepare(
      "SELECT id, role, hr_permissions FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    if (!hasPermission(userProfile as any, PERMISSIONS.EVALUATION_MANAGE_CYCLES)) {
      return c.json({ error: 'Unauthorized: Missing permission to manage evaluation cycles' }, 403);
    }

    // Get the cycle to check its current status and department
    const cycle = await c.env.DB.prepare(
      "SELECT status, department FROM evaluation_cycles WHERE id = ?"
    ).bind(cycleId).first();

    if (!cycle) {
      return c.json({ error: 'Cycle not found' }, 404);
    }

    if ((cycle as any).status !== 'DRAFT') {
      return c.json({ error: 'Only DRAFT cycles can be activated' }, 400);
    }

    // Get active employees for the cycle (filtered by department if specified)
    let employeeQuery = "SELECT id, first_name, last_name, manager_id, position, department FROM users WHERE role = 'EMPLOYEE' AND status = 'ACTIVE'";
    const cycleDepartment = (cycle as any).department;
    
    const allActiveEmployees = cycleDepartment
      ? await c.env.DB.prepare(employeeQuery + " AND department = ?").bind(cycleDepartment).all()
      : await c.env.DB.prepare(employeeQuery).all();

    if (!allActiveEmployees.results || allActiveEmployees.results.length === 0) {
      const errorMsg = cycleDepartment 
        ? `No se encontraron empleados activos en el departamento ${cycleDepartment}`
        : 'No se encontraron empleados activos para generar evaluaciones';
      return c.json({ error: errorMsg }, 400);
    }

    const employeesToEvaluate = allActiveEmployees.results as any[];

    // Check if all employees have a manager assigned
    const employeesWithoutManager = employeesToEvaluate.filter(emp => !emp.manager_id);
    if (employeesWithoutManager.length > 0) {
      const employeeNames = employeesWithoutManager
        .map(emp => `${emp.first_name} ${emp.last_name}`)
        .join(', ');
      return c.json({ 
        error: `No se puede activar el ciclo. Los siguientes empleados no tienen manager asignado: ${employeeNames}. Por favor, asigna un manager a cada empleado antes de activar el ciclo.` 
      }, 400);
    }

    // Delete existing evaluations for this cycle to avoid duplicates
    await c.env.DB.prepare("DELETE FROM evaluations WHERE cycle_id = ?").bind(cycleId).run();

    // Create evaluation statements
    const statements = [];
    
    for (const employee of employeesToEvaluate) {
      // 1. Self-evaluation for everyone
      statements.push(c.env.DB.prepare(`
        INSERT INTO evaluations (cycle_id, employee_id, evaluator_id, status, created_at, updated_at)
        VALUES (?, ?, ?, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(cycleId, employee.id, employee.id));

      // 2. Manager evaluation: create evaluation where manager evaluates employee
      // Initial status is PENDING - it will change to MANAGER_EVALUATION_PENDING after employee completes self-evaluation
      statements.push(c.env.DB.prepare(`
        INSERT INTO evaluations (cycle_id, employee_id, evaluator_id, status, created_at, updated_at)
        VALUES (?, ?, ?, 'PENDING', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(cycleId, employee.id, employee.manager_id));
    }

    // Execute all evaluation insertions in batch
    if (statements.length > 0) {
      await c.env.DB.batch(statements);
    }

    // Update cycle status to ACTIVE
    await c.env.DB.prepare(`
      UPDATE evaluation_cycles SET status = 'ACTIVE', updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(cycleId).run();

    // Get the updated cycle
    const updatedCycle = await c.env.DB.prepare(
      "SELECT * FROM evaluation_cycles WHERE id = ?"
    ).bind(cycleId).first();

    return c.json(updatedCycle);
  } catch (error) {
    console.error('Error activating evaluation cycle:', error);
    return c.json({ error: 'Failed to activate evaluation cycle' }, 500);
  }
});

// Get events
app.get("/api/events", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Get user profile with both department, sede, and role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, department, sede, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // HR users see all events regardless of target_audience
    let query;
    if (userProfile.role === 'HR') {
      query = db
        .from('corporate_events')
        .select(`
          *,
          rsvp:event_rsvp(status, user_id)
        `)
        .order('start_date', { ascending: true });
    } else {
      // Regular employees see events targeted to them
      query = db
        .from('corporate_events')
        .select(`
          *,
          rsvp:event_rsvp(status, user_id)
        `)
        .or(
          `target_audience.is.null,target_audience.eq.ALL,target_audience.eq.${userProfile.department},target_audience.eq.${userProfile.sede}`
        )
        .order('start_date', { ascending: true });
    }

    const { data: events, error: err } = await query;

    if (err) throw err;

    // Transform the results to include proper RSVP info
    const transformedEvents = (events || []).map((event: any) => {
      const userRsvp = event.rsvp?.find((r: any) => r.user_id === userProfile.id);
      return {
        ...event,
        rsvp_count: event.rsvp?.filter((r: any) => r.status === 'ATTENDING').length || 0,
        user_rsvp: userRsvp || null
      };
    });

    return c.json(transformedEvents);
  } catch (error) {
    console.error('Error getting events:', error);
    return c.json({ error: 'Failed to get events' }, 500);
  }
});

// Create event (HR only)
app.post("/api/events", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    
    // Check if user has HR role
    const userProfile = await c.env.DB.prepare(
      "SELECT id, role FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { 
      title, 
      description, 
      category, 
      start_date, 
      end_date, 
      start_time, 
      location, 
      target_audience 
    } = await c.req.json();

    // Create event
    const result = await c.env.DB.prepare(`
      INSERT INTO corporate_events (
        title, description, category, start_date, end_date, start_time, 
        location, target_audience, created_by_id
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      title, description, category, start_date, end_date, start_time, 
      location, target_audience, userProfile.id
    ).run();

    // Get the created event
    const event = await c.env.DB.prepare(
      "SELECT * FROM corporate_events WHERE id = ?"
    ).bind(result.meta.last_row_id).first();

    return c.json(event);
  } catch (error) {
    console.error('Error creating event:', error);
    return c.json({ error: 'Failed to create event' }, 500);
  }
});

// RSVP to event
app.post("/api/events/:id/rsvp", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const eventId = parseInt(c.req.param('id'));
    const { status } = await c.req.json();

    // Get user profile
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Insert or update RSVP using upsert
    const { error: upsertErr } = await db
      .from('event_rsvp')
      .upsert(
        {
          event_id: eventId,
          user_id: userProfile.id,
          status: status,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'event_id,user_id' }
      );

    if (upsertErr) throw upsertErr;

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating RSVP:', error);
    return c.json({ error: 'Failed to update RSVP' }, 500);
  }
});

// Get complaints (user's own or all for HR)
app.get("/api/complaints", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Get user profile to check role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role, hr_permissions')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    let complaints;
    if (userProfile.role === 'HR' && hasPermission(userProfile as any, PERMISSIONS.COMPLAINT_VIEW_ALL)) {
      // HR can see all complaints including anonymous ones
      const { data: allComplaints, error: err } = await db
        .from('complaints')
        .select(`
          *,
          user:users(first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (err) throw err;

      // Transform to include employee_name and email
      complaints = (allComplaints || []).map((complaint: any) => ({
        ...complaint,
        employee_name: complaint.is_anonymous ? 'Anónimo' : `${complaint.user?.first_name} ${complaint.user?.last_name}`,
        employee_email: complaint.is_anonymous ? null : complaint.user?.email,
      }));
    } else {
      // Regular employees can only see their own non-anonymous complaints
      const { data: userComplaints, error: err } = await db
        .from('complaints')
        .select('*')
        .eq('user_id', userProfile.id)
        .eq('is_anonymous', false)
        .order('created_at', { ascending: false });

      if (err) throw err;
      complaints = userComplaints || [];
    }

    return c.json(complaints);
  } catch (error) {
    console.error('Error getting complaints:', error);
    return c.json({ error: 'Failed to get complaints' }, 500);
  }
});

// Update complaint status (HR only)
app.put("/api/complaints/:id/status", authMiddleware, requirePermission(PERMISSIONS.COMPLAINT_MANAGE_STATUS), async (c) => {
  try {
    const complaintId = parseInt(c.req.param('id'));
    const { status } = await c.req.json();

    // Update complaint status
    await c.env.DB.prepare(`
      UPDATE complaints SET status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).bind(status, complaintId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating complaint status:', error);
    return c.json({ error: 'Failed to update complaint status' }, 500);
  }
});

// Create request
app.post("/api/requests", authMiddleware, rateLimiter(RateLimits.MUTATION), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const { type, category, details } = await c.req.json();
    
    console.log('[CREATE REQUEST] Raw input:', { type, category, details: details?.substring(0, 50) });
    
    // Validate and sanitize inputs
    const cleanType = validator.sanitizeString(type, 100);
    const cleanDetails = validator.validateText(details, 10, 5000);

    console.log('[CREATE REQUEST] After validation:', { cleanType, cleanDetails: cleanDetails ? 'valid' : 'invalid', category });

    if (!cleanType || !cleanDetails) {
      console.error('[CREATE REQUEST] Validation failed - missing type or details');
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser.id,
        details: { type: cleanType ? 'valid' : 'invalid', details: cleanDetails ? 'valid' : 'invalid' }
      });
      return c.json({ error: 'Type and details are required' }, 400);
    }

    // Validate category - must be one of the allowed values
    const validatedCategory = validator.validateEnum(category, ['Gestión Laboral', 'Bienestar', 'Desarrollo']);
    
    console.log('[CREATE REQUEST] Category validation result:', { input: category, validated: validatedCategory });
    
    if (!validatedCategory) {
      console.error('[CREATE REQUEST] Invalid category:', category);
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser.id,
        details: { field: 'category', value: category }
      });
      return c.json({ error: 'Category is required and must be one of: Gestión Laboral, Bienestar, Desarrollo' }, 400);
    }
    
    // Get user profile
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      console.error('[CREATE REQUEST] User profile not found for mocha_user_id:', mochaUser.id);
      return c.json({ error: 'User profile not found' }, 404);
    }

    console.log('[CREATE REQUEST] Creating request with:', {
      userId: userProfile.id,
      type: cleanType,
      category: validatedCategory,
      detailsLength: cleanDetails.length
    });

    // Create request
    const { data: newRequest, error: insertErr } = await db
      .from('requests')
      .insert({
        user_id: userProfile.id,
        type: cleanType,
        category: validatedCategory,
        details: cleanDetails,
        status: 'PENDING',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    console.log('[CREATE REQUEST] Created request:', newRequest);

    return c.json(newRequest);
  } catch (error) {
    console.error('[CREATE REQUEST] Error creating request:', error);
    console.error('[CREATE REQUEST] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return c.json({ error: `Failed to create request: ${error instanceof Error ? error.message : 'Unknown error'}` }, 500);
  }
});

// Update request status (HR only)
app.put("/api/requests/:id/status", authMiddleware, requirePermission(PERMISSIONS.REQUEST_MANAGE_STATUS), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const requestId = parseInt(c.req.param('id'));
    const { status, rejection_reason } = await c.req.json();

    // Get user profile to set resolved_by_id
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Validate rejection_reason if status is REJECTED
    if (status === 'REJECTED' && (!rejection_reason || rejection_reason.trim().length < 10)) {
      return c.json({ error: 'Se requiere un motivo de rechazo (mínimo 10 caracteres)' }, 400);
    }

    // Update request status and set resolved_by_id if status is APPROVED or REJECTED
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'APPROVED' || status === 'REJECTED') {
      updateData.resolved_by_id = userProfile.id;
      if (status === 'REJECTED') {
        updateData.details = validator.sanitizeString(rejection_reason, 1000);
      }
    }

    const { error: updateErr } = await db
      .from('requests')
      .update(updateData)
      .eq('id', requestId);

    if (updateErr) throw updateErr;

    return c.json({ success: true });
  } catch (error) {
    console.error('Error updating request status:', error);
    return c.json({ error: 'Failed to update request status' }, 500);
  }
});

// Get managers list (HR only)
app.get("/api/employees/managers", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    
    // Get user profile to check role
    const userProfile = await c.env.DB.prepare(
      "SELECT role FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    // Get all active users who can be managers (HR or employees with leadership roles)
    const managers = await c.env.DB.prepare(`
      SELECT id, first_name, last_name, email, department, position
      FROM users
      WHERE status = 'ACTIVE'
      ORDER BY first_name, last_name
    `).all();

    return c.json(managers.results || []);
  } catch (error) {
    console.error('Error getting managers:', error);
    return c.json({ error: 'Failed to get managers' }, 500);
  }
});

// Update employee (HR only)
app.put("/api/employees/:id", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Get user profile to check role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    const employeeId = parseInt(c.req.param('id'));

    const {
      first_name, last_name, email, ci, phone, department,
      position, payroll_type, base_salary, birth_date, sede, company_name, manager_id,
      shirt_size, pants_size, boots_size
    } = await c.req.json();

    // Update employee
    const { error: updateErr } = await db
      .from('users')
      .update({
        first_name, last_name, email, ci, phone, department,
        position, payroll_type, base_salary, birth_date, sede, company_name, manager_id,
        shirt_size, pants_size, boots_size,
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId);

    if (updateErr) throw updateErr;

    // Get the updated employee
    const { data: employee, error: getErr } = await db
      .from('users')
      .select('*')
      .eq('id', employeeId)
      .single();

    if (getErr) throw getErr;

    return c.json(employee);
  } catch (error) {
    console.error('Error updating employee:', error);
    return c.json({ error: 'Failed to update employee' }, 500);
  }
});

// Import employees from CSV (HR only)
app.post("/api/employees/import-csv", authMiddleware, rateLimiter(RateLimits.UPLOAD), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    
    // Get user profile to check role
    const userProfile = await c.env.DB.prepare(
      "SELECT role FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.PERMISSION_DENIED,
        userId: mochaUser.id,
        details: { action: 'import_csv' }
      });
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    const { csv_content, company_name } = await c.req.json();

    const cleanCSV = validator.validateText(csv_content, 50, 1000000); // Max 1MB CSV
    const cleanCompanyName = validator.sanitizeString(company_name, 200);

    if (!cleanCSV || !cleanCompanyName) {
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser.id,
        details: { csv: cleanCSV ? 'valid' : 'invalid', company: cleanCompanyName ? 'valid' : 'invalid' }
      });
      return c.json({ error: 'CSV content and company name are required' }, 400);
    }

    logSecurityEvent({
      ...createSecurityContext(c),
      type: SecurityEventType.BULK_OPERATION,
      userId: mochaUser.id,
      userEmail: mochaUser.email,
      details: { action: 'csv_import', company: cleanCompanyName }
    });

    // Parse CSV
    const lines = csv_content.trim().split('\n');
    
    if (lines.length < 2) {
      return c.json({ error: 'CSV file is empty or invalid' }, 400);
    }

    // Skip header row
    const dataLines = lines.slice(1);
    
    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const line of dataLines) {
      if (!line.trim()) continue;

      try {
        // Parse CSV line (handling quoted fields)
        const fields: string[] = [];
        let currentField = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i];
          
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            fields.push(currentField.trim());
            currentField = '';
          } else {
            currentField += char;
          }
        }
        fields.push(currentField.trim());

        if (fields.length < 6) {
          errors.push(`Línea inválida (campos insuficientes): ${line.substring(0, 50)}...`);
          continue;
        }

        const [ci, last_name, first_name, position, department, payroll_type] = fields;

        // Clean CI (remove quotes and whitespace)
        const cleanCi = ci.replace(/"/g, '').trim();
        
        if (!cleanCi || !last_name || !first_name) {
          errors.push(`Datos incompletos en línea: CI=${cleanCi}, Nombre=${first_name}, Apellido=${last_name}`);
          continue;
        }

        // Check if employee already exists by CI
        const existingEmployee = await c.env.DB.prepare(
          "SELECT id FROM users WHERE ci = ?"
        ).bind(cleanCi).first();

        if (existingEmployee) {
          skipped++;
          continue;
        }

        // Generate email from name (simplified)
        const emailName = `${first_name.toLowerCase().replace(/\s+/g, '.')}.${last_name.toLowerCase().replace(/\s+/g, '.')}`;
        const email = `${emailName}@${company_name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`;

        // Generate temporary mocha_user_id
        const tempMochaId = `csv_import_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // Validate and clean payroll_type
        let cleanPayrollType = payroll_type.trim().toUpperCase();
        if (!['OPERARIO', 'EMPLEADO', 'CONFIDENCIAL'].includes(cleanPayrollType)) {
          cleanPayrollType = 'EMPLEADO'; // Default fallback
        }

        // Insert employee
        await c.env.DB.prepare(`
          INSERT INTO users (
            mocha_user_id, email, first_name, last_name, ci, department,
            position, payroll_type, company_name, role, status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'EMPLOYEE', 'ACTIVE')
        `).bind(
          tempMochaId,
          email,
          first_name.trim(),
          last_name.trim(),
          cleanCi,
          department.trim() || null,
          position.trim() || null,
          cleanPayrollType,
          company_name
        ).run();

        imported++;
      } catch (lineError) {
        console.error('Error processing line:', line, lineError);
        errors.push(`Error en línea: ${line.substring(0, 50)}... - ${lineError instanceof Error ? lineError.message : 'Unknown error'}`);
      }
    }

    return c.json({
      success: imported > 0,
      imported,
      skipped,
      errors: errors.slice(0, 10), // Limit errors shown
    });
  } catch (error) {
    console.error('Error importing CSV:', error);
    return c.json({ error: 'Failed to import CSV' }, 500);
  }
});

// Create employee (HR only)
app.post("/api/employees", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Get user profile to check role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    const {
      first_name, last_name, email, ci, phone, department,
      position, payroll_type, base_salary, birth_date, sede, company_name
    } = await c.req.json();

    // Generate a temporary mocha_user_id for employees created by HR
    const tempMochaId = `hr_created_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    // Create new user/employee with temporary mocha_user_id
    const { data: employee, error: insertErr } = await db
      .from('users')
      .insert({
        mocha_user_id: tempMochaId,
        email,
        first_name,
        last_name,
        ci,
        phone,
        department,
        position,
        payroll_type,
        base_salary,
        birth_date,
        sede,
        company_name: company_name || 'Cacao San Jose, C.A.',
        role: 'EMPLOYEE',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    return c.json(employee);
  } catch (error) {
    console.error('Error creating employee:', error);
    return c.json({ error: 'Failed to create employee' }, 500);
  }
});

// Inactivate employee (HR only)
app.put("/api/employees/:id/inactivate", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user");
    const employeeId = parseInt(c.req.param('id'));
    const { reason } = await c.req.json();

    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, first_name, last_name, role')
      .eq('mocha_user_id', mochaUser!.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    // Get employee data before inactivation
    const { data: employee, error: getErr } = await db
      .from('users')
      .select('*')
      .eq('id', employeeId)
      .eq('role', 'EMPLOYEE')
      .single();

    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404);
    }

    if (employee.status === 'INACTIVE') {
      return c.json({ error: 'Employee is already inactive' }, 400);
    }

    // Update employee status
    const { error: updateErr } = await db
      .from('users')
      .update({
        status: 'INACTIVE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId);

    if (updateErr) throw updateErr;

    // Create audit log
    const { error: auditErr } = await db
      .from('employee_audit_log')
      .insert({
        employee_id: employeeId,
        employee_ci: employee.ci,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        employee_email: employee.email,
        action_type: 'INACTIVATED',
        reason: reason,
        performed_by_id: userProfile.id,
        performed_by_name: `${userProfile.first_name} ${userProfile.last_name}`,
        employee_data_snapshot: employee,
        created_at: new Date().toISOString(),
      });

    if (auditErr) throw auditErr;

    return c.json({ success: true });
  } catch (error) {
    console.error('Error inactivating employee:', error);
    return c.json({ error: 'Failed to inactivate employee' }, 500);
  }
});

// Activate employee (HR only)
app.put("/api/employees/:id/activate", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user");
    const employeeId = parseInt(c.req.param('id'));
    const { reason } = await c.req.json();

    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, first_name, last_name, role')
      .eq('mocha_user_id', mochaUser!.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }

    // Get employee data before activation
    const { data: employee, error: getErr } = await db
      .from('users')
      .select('*')
      .eq('id', employeeId)
      .eq('role', 'EMPLOYEE')
      .single();

    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404);
    }

    if (employee.status === 'ACTIVE') {
      return c.json({ error: 'Employee is already active' }, 400);
    }

    // Update employee status
    const { error: updateErr } = await db
      .from('users')
      .update({
        status: 'ACTIVE',
        updated_at: new Date().toISOString(),
      })
      .eq('id', employeeId);

    if (updateErr) throw updateErr;

    // Create audit log
    const { error: auditErr } = await db
      .from('employee_audit_log')
      .insert({
        employee_id: employeeId,
        employee_ci: employee.ci,
        employee_name: `${employee.first_name} ${employee.last_name}`,
        employee_email: employee.email,
        action_type: 'ACTIVATED',
        reason: reason,
        performed_by_id: userProfile.id,
        performed_by_name: `${userProfile.first_name} ${userProfile.last_name}`,
        employee_data_snapshot: employee,
        created_at: new Date().toISOString(),
      });

    if (auditErr) throw auditErr;

    return c.json({ success: true });
  } catch (error) {
    console.error('Error activating employee:', error);
    return c.json({ error: 'Failed to activate employee' }, 500);
  }
});

// Delete employee (HR only)
app.delete("/api/employees/:id", authMiddleware, rateLimiter(RateLimits.SENSITIVE), async (c) => {
  try {
    const mochaUser = c.get("user");
    const employeeId = parseInt(c.req.param('id'));
    const reason = c.req.query('reason') || 'No reason provided';
    
    logSecurityEvent({
      ...createSecurityContext(c),
      type: SecurityEventType.SENSITIVE_OPERATION,
      userId: mochaUser!.id,
      details: { action: 'delete_employee', employeeId, reason }
    });
    
    const userProfile = await c.env.DB.prepare(
      "SELECT id, first_name, last_name, role FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser!.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized: HR access required' }, 403);
    }
    
    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Get employee data before deletion
    const employee = await c.env.DB.prepare(
      "SELECT * FROM users WHERE id = ? AND role = 'EMPLOYEE'"
    ).bind(employeeId).first();

    if (!employee) {
      return c.json({ error: 'Employee not found' }, 404);
    }

    // Check if employee has related records that prevent deletion
    const hasLoans = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM loans WHERE user_id = ?"
    ).bind(employeeId).first();

    const hasRequests = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM requests WHERE user_id = ?"
    ).bind(employeeId).first();

    const hasComplaints = await c.env.DB.prepare(
      "SELECT COUNT(*) as count FROM complaints WHERE user_id = ?"
    ).bind(employeeId).first();

    if ((hasLoans as any)?.count > 0 || (hasRequests as any)?.count > 0 || (hasComplaints as any)?.count > 0) {
      return c.json({ 
        error: 'Cannot delete employee with existing records. Please inactivate instead.',
        hasLoans: (hasLoans as any)?.count > 0,
        hasRequests: (hasRequests as any)?.count > 0,
        hasComplaints: (hasComplaints as any)?.count > 0
      }, 400);
    }

    // Create audit log before deletion
    await c.env.DB.prepare(`
      INSERT INTO employee_audit_log (
        employee_id, employee_ci, employee_name, employee_email,
        action_type, reason, performed_by_id, performed_by_name,
        employee_data_snapshot
      ) VALUES (?, ?, ?, ?, 'DELETED', ?, ?, ?, ?)
    `).bind(
      employeeId,
      employee.ci,
      `${employee.first_name} ${employee.last_name}`,
      employee.email,
      reason,
      userProfile.id,
      `${userProfile.first_name} ${userProfile.last_name}`,
      JSON.stringify(employee)
    ).run();

    // Delete related records first
    await c.env.DB.prepare("DELETE FROM family_dependents WHERE user_id = ?").bind(employeeId).run();
    await c.env.DB.prepare("DELETE FROM asset_assignments WHERE user_id = ?").bind(employeeId).run();
    await c.env.DB.prepare("DELETE FROM evaluations WHERE employee_id = ?").bind(employeeId).run();
    await c.env.DB.prepare("DELETE FROM event_rsvps WHERE user_id = ?").bind(employeeId).run();
    await c.env.DB.prepare("DELETE FROM conversation_participants WHERE user_id = ?").bind(employeeId).run();

    // Update assets assigned to this employee
    await c.env.DB.prepare(
      "UPDATE assets SET assigned_to_id = NULL, status = 'AVAILABLE' WHERE assigned_to_id = ?"
    ).bind(employeeId).run();

    // Delete the employee
    await c.env.DB.prepare("DELETE FROM users WHERE id = ?").bind(employeeId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting employee:', error);
    return c.json({ error: 'Failed to delete employee' }, 500);
  }
});

// Get candidates with interviews (HR only)
app.get("/api/candidates", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Get all candidates ordered by creation date
    const { data: candidates, error: candidatesErr } = await db
      .from('candidates')
      .select('*')
      .order('created_at', { ascending: false });

    if (candidatesErr) throw candidatesErr;

    // Get interviews for each candidate
    const candidatesWithInterviews = await Promise.all(
      (candidates || []).map(async (candidate) => {
        const { data: interviews, error: interviewErr } = await db
          .from('interviews')
          .select('*')
          .eq('candidate_id', candidate.id)
          .order('date', { ascending: false })
          .order('time', { ascending: false });

        if (interviewErr) throw interviewErr;

        return {
          ...candidate,
          interview_count: interviews?.length || 0,
          interviews: interviews || []
        };
      })
    );

    return c.json(candidatesWithInterviews);
  } catch (error) {
    console.error('Error getting candidates:', error);
    return c.json({ error: 'Failed to get candidates' }, 500);
  }
});

// Test Gemini API connection with rate limit awareness (HR only)
app.get("/api/ai/test", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    
    // Check if user has HR role
    const userProfile = await c.env.DB.prepare(
      "SELECT role FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    if (!c.env.OPENAI_API_KEY) {
      return c.json({ 
        connected: false,
        error: 'OPENAI_API_KEY not configured',
        advice: 'Contacta al administrador para configurar la clave de API de OpenAI'
      }, 200);
    }

    console.log('Testing OpenAI API...');
    const openaiService = createOpenAIService(c.env.OPENAI_API_KEY, 'gpt-4o-mini');
    
    try {
      const testResponse = await openaiService.generateText({
        prompt: "Say OK",
        temperature: 0.1,
        maxTokens: 5
      });
      
      console.log('OpenAI test response:', testResponse);
      
      return c.json({ 
        connected: true,
        response: testResponse.trim(),
        timestamp: new Date().toISOString(),
        advice: 'La conexión con OpenAI está funcionando correctamente'
      });
    } catch (testError) {
      console.error('OpenAI API test error:', testError);
      
      let advice = 'Error general de conexión con OpenAI';
      const errorMessage = testError instanceof Error ? testError.message : 'Test failed';
      
      if (errorMessage.includes('rate limit')) {
        advice = 'Límite de velocidad alcanzado. Espera unos minutos entre solicitudes de IA.';
      } else if (errorMessage.includes('quota')) {
        advice = 'Cuota de API excedida. Verifica tu facturación de OpenAI.';
      } else if (errorMessage.includes('API key') || errorMessage.includes('unauthorized')) {
        advice = 'Clave de API inválida. Verifica la configuración en OpenAI.';
      } else if (errorMessage.includes('permission')) {
        advice = 'Sin permisos para usar OpenAI. Verifica que la API esté habilitada.';
      }
      
      return c.json({ 
        connected: false,
        error: errorMessage,
        advice: advice
      });
    }
  } catch (error) {
    console.error('Error testing Gemini API:', error);
    return c.json({ 
      connected: false,
      error: 'Server error during test',
      advice: 'Error interno del servidor'
    }, 500);
  }
});

// Create candidate without AI analysis (HR only)
app.post("/api/candidates", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { resume_url, resume_text, application_date } = await c.req.json();

    // Validate resume text
    if (!resume_text || resume_text.trim().length < 50) {
      console.error('Resume text too short or empty:', resume_text?.length || 0);
      return c.json({ error: 'El texto del CV es demasiado corto o está vacío' }, 400);
    }

    console.log('Creating candidate with resume text length:', resume_text.length);

    // Create candidate in database
    const { data: newCandidate, error: insertErr } = await db
      .from('candidates')
      .insert({
        first_name: 'Pendiente',
        last_name: 'Análisis',
        email: null,
        phone: null,
        position: 'Pendiente análisis',
        department: null,
        status: 'APPLIED',
        resume_url,
        resume_text,
        ai_profile: 'Análisis de IA pendiente',
        application_date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (insertErr) throw insertErr;

    console.log('Candidate created with ID:', newCandidate.id);

    return c.json({
      ...newCandidate,
      interviews: []
    });
  } catch (error) {
    console.error('Error creating candidate:', error);
    return c.json({ error: 'Failed to create candidate' }, 500);
  }
});

// Process candidate with AI analysis (HR only)
app.post("/api/candidates/:id/process-ai", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const candidateId = parseInt(c.req.param('id'));

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    if (!c.env.OPENAI_API_KEY) {
      return c.json({ error: 'AI service not configured' }, 503);
    }

    // Get candidate
    const { data: candidate, error: candidateErr } = await db
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (!candidate || candidateErr) {
      return c.json({ error: 'Candidate not found' }, 404);
    }

    const resume_text = candidate.resume_text;

    if (!resume_text || resume_text.trim().length < 50) {
      return c.json({ error: 'El texto del CV es demasiado corto para análisis de IA' }, 400);
    }

    console.log('Processing candidate AI analysis with text length:', resume_text.length);

    // Update candidate status to show processing
    await db
      .from('candidates')
      .update({
        first_name: 'Procesando',
        last_name: 'con IA...',
        updated_at: new Date().toISOString()
      })
      .eq('id', candidateId);

    try {
      console.log('Creating OpenAI service...');
      const openaiService = createOpenAIService(c.env.OPENAI_API_KEY, 'gpt-4o-mini');
      
      // Test API key first with a simple request
      console.log('Testing OpenAI API connection...');
      try {
        await openaiService.generateText({
          prompt: "Hello, respond with just 'OK'",
          temperature: 0.1,
          maxTokens: 10
        });
        console.log('OpenAI API connection successful');
      } catch (testError) {
        console.error('OpenAI API test failed:', testError);
        throw new Error(`API connection test failed: ${testError instanceof Error ? testError.message : 'Unknown error'}`);
      }
      
      // Clean the resume text to avoid problematic characters
      const cleanResumeText = resume_text
        .replace(/[^\x20-\x7E\n\r\t]/g, ' ') // Remove non-printable characters
        .replace(/\s+/g, ' ') // Normalize whitespace
        .trim()
        .substring(0, 2000); // Reduced to 2000 chars to avoid rate limits
      
      console.log('Cleaned resume text length:', cleanResumeText.length);
      
      // More concise AI prompt to reduce token usage
      const aiPrompt = `Extract candidate info from this resume as JSON:

${cleanResumeText}

JSON format:
{"firstName":"name","lastName":"surname","email":"email or null","phone":"phone or null","position":"job title","department":"dept or null","profile":"summary"}`;

      console.log('Calling OpenAI API for candidate', candidateId);
      console.log('Prompt length:', aiPrompt.length);
      
      // Add a small delay before API call to help with rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const aiResponse = await openaiService.generateText({
        prompt: aiPrompt,
        temperature: 0.1,
        maxTokens: 300 // Reduced token limit
      });

      console.log('OpenAI response:', aiResponse);

      // Parse AI response with better error handling
      let candidateData;
      try {
        // Clean markdown and extra text
        let cleanedResponse = aiResponse
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .replace(/^[^{]*/, '')  // Remove text before first {
          .replace(/[^}]*$/, '')  // Remove text after last }
          .trim();
        
        console.log('Cleaned JSON response:', cleanedResponse);
        
        candidateData = JSON.parse(cleanedResponse);
        console.log('Parsed candidate data:', candidateData);
        
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Failed to parse AI response:', aiResponse);
        throw new Error('Failed to parse AI response as JSON');
      }

      // Clean and validate the data
      const firstName = (candidateData.firstName || 'Pendiente').toString().trim();
      const lastName = (candidateData.lastName || 'Análisis').toString().trim();
      const email = candidateData.email && candidateData.email.toString().trim() !== 'null' ? candidateData.email.toString().trim() : null;
      const phone = candidateData.phone && candidateData.phone.toString().trim() !== 'null' ? candidateData.phone.toString().trim() : null;
      const position = (candidateData.position || 'Posición por determinar').toString().trim();
      const department = candidateData.department && candidateData.department.toString().trim() !== 'null' ? candidateData.department.toString().trim() : null;
      const profile = (candidateData.profile || 'Perfil por completar').toString().trim();

      console.log('Final extracted data:', {
        firstName,
        lastName,
        email,
        phone,
        position,
        department,
        profile: profile.substring(0, 100)
      });

      // Update candidate in database
      const { error: updateErr } = await db
        .from('candidates')
        .update({
          first_name: firstName,
          last_name: lastName,
          email,
          phone,
          position,
          department,
          ai_profile: profile,
          updated_at: new Date().toISOString()
        })
        .eq('id', candidateId);

      if (updateErr) throw updateErr;

      console.log('Candidate updated with AI data');

      // Get the updated candidate
      const { data: updatedCandidate, error: selectErr } = await db
        .from('candidates')
        .select('*')
        .eq('id', candidateId)
        .single();

      if (selectErr) throw selectErr;

      return c.json({
        ...updatedCandidate,
        interviews: []
      });
    } catch (aiError) {
      console.error('AI analysis error details:', {
        candidateId,
        error: aiError,
        message: aiError instanceof Error ? aiError.message : 'Unknown error',
        stack: aiError instanceof Error ? aiError.stack : null
      });
      
      const errorMessage = aiError instanceof Error ? aiError.message : 'Unknown error';
      
      // Provide specific guidance based on error type
      let userFriendlyMessage = errorMessage;
      if (errorMessage.includes('rate limit')) {
        userFriendlyMessage = 'Límite de velocidad de API alcanzado. Por favor espera unos minutos antes de intentar nuevamente.';
      } else if (errorMessage.includes('quota')) {
        userFriendlyMessage = 'Cuota de API excedida. Verifica tu facturación de OpenAI o espera a que se restablezca.';
      } else if (errorMessage.includes('API key')) {
        userFriendlyMessage = 'Clave de API de OpenAI inválida o faltante. Contacta al administrador.';
      }
      
      // Update candidate with error status and detailed error info
      await db
        .from('candidates')
        .update({
          first_name: 'Error',
          last_name: 'de IA',
          ai_profile: `Error: ${userFriendlyMessage}`,
          notes: `Error técnico: ${errorMessage}. Timestamp: ${new Date().toISOString()}`,
          updated_at: new Date().toISOString()
        })
        .eq('id', candidateId);

      return c.json({
        error: userFriendlyMessage
      }, 500);
    }
  } catch (error) {
    console.error('Error processing candidate with AI:', error);
    return c.json({ error: 'Failed to process candidate with AI' }, 500);
  }
});

// Update candidate manually (HR only)
app.put("/api/candidates/:id", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const candidateId = parseInt(c.req.param('id'));

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const {
      first_name, last_name, email, phone, position,
      department, ai_profile, notes, status
    } = await c.req.json();

    // Update candidate
    const { error: updateErr } = await db
      .from('candidates')
      .update({
        first_name,
        last_name,
        email,
        phone,
        position,
        department,
        ai_profile,
        notes,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', candidateId);

    if (updateErr) throw updateErr;

    // Get the updated candidate with interviews
    const { data: updatedCandidate, error: selectErr } = await db
      .from('candidates')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (selectErr) throw selectErr;

    const { data: interviews, error: interviewErr } = await db
      .from('interviews')
      .select('*')
      .eq('candidate_id', candidateId)
      .order('date', { ascending: false })
      .order('time', { ascending: false });

    if (interviewErr) throw interviewErr;

    return c.json({
      ...updatedCandidate,
      interviews: interviews || []
    });
  } catch (error) {
    console.error('Error updating candidate:', error);
    return c.json({ error: 'Failed to update candidate' }, 500);
  }
});

// Delete candidate (HR only)
app.delete("/api/candidates/:id", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const candidateId = parseInt(c.req.param('id'));

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Delete related interviews first (cascade delete)
    const { error: interviewErr } = await db
      .from('interviews')
      .delete()
      .eq('candidate_id', candidateId);

    if (interviewErr) throw interviewErr;

    // Delete candidate
    const { error: deleteErr } = await db
      .from('candidates')
      .delete()
      .eq('id', candidateId);

    if (deleteErr) throw deleteErr;

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting candidate:', error);
    return c.json({ error: 'Failed to delete candidate' }, 500);
  }
});

// AI-powered candidate search (HR only)
app.post("/api/ai/search-candidates", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    
    // Check if user has HR role
    const userProfile = await c.env.DB.prepare(
      "SELECT role FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { query, candidates } = await c.req.json();

    if (!c.env.OPENAI_API_KEY) {
      return c.json({ error: 'AI service not configured' }, 503);
    }

    const openaiService = createOpenAIService(c.env.OPENAI_API_KEY, 'gpt-4o-mini');
    
    const aiPrompt = `As an expert HR recruiter, find the top 5 candidates from the provided list that best match the following search query: "${query}".

For each candidate, provide a brief justification explaining why they are a good match.

Candidates data:
${JSON.stringify(candidates, null, 2)}

Please provide a JSON response with this structure:
{
  "topCandidates": [
    {
      "id": candidate_id,
      "reason": "brief explanation of why this candidate matches the query"
    }
  ]
}

Return up to 5 candidates ordered by relevance. If no candidates match well, return an empty array.`;

    const aiResponse = await openaiService.generateText({
      prompt: aiPrompt,
      temperature: 0.4,
      maxTokens: 800
    });

    try {
      const searchResults = JSON.parse(aiResponse);
      return c.json(searchResults);
    } catch (parseError) {
      console.error('Error parsing AI search response:', parseError);
      return c.json({ topCandidates: [] });
    }
  } catch (error) {
    console.error('Error in AI candidate search:', error);
    return c.json({ error: 'Failed to search candidates' }, 500);
  }
});

// Create interview (HR only)
app.post("/api/interviews", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const {
      candidate_id, type, date, time, duration_minutes, interviewer,
      location, meeting_link, notes, feedback, rating, status
    } = await c.req.json();

    // Create interview
    const { data: newInterview, error: insertErr } = await db
      .from('interviews')
      .insert({
        candidate_id,
        type,
        date,
        time,
        duration_minutes,
        interviewer,
        location,
        meeting_link,
        notes,
        feedback,
        rating,
        status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (insertErr) throw insertErr;

    return c.json(newInterview);
  } catch (error) {
    console.error('Error creating interview:', error);
    return c.json({ error: 'Failed to create interview' }, 500);
  }
});

// Update interview (HR only)
app.put("/api/interviews/:id", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const interviewId = parseInt(c.req.param('id'));

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const {
      type, date, time, duration_minutes, interviewer,
      location, meeting_link, notes, feedback, rating, status
    } = await c.req.json();

    // Update interview
    const { error: updateErr } = await db
      .from('interviews')
      .update({
        type,
        date,
        time,
        duration_minutes,
        interviewer,
        location,
        meeting_link,
        notes,
        feedback,
        rating,
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', interviewId);

    if (updateErr) throw updateErr;

    // Get the updated interview
    const { data: updatedInterview, error: selectErr } = await db
      .from('interviews')
      .select('*')
      .eq('id', interviewId)
      .single();

    if (selectErr) throw selectErr;

    return c.json(updatedInterview);
  } catch (error) {
    console.error('Error updating interview:', error);
    return c.json({ error: 'Failed to update interview' }, 500);
  }
});

// Get employee audit log (HR only)
app.get("/api/employee-audit-log", authMiddleware, requirePermission(PERMISSIONS.EMPLOYEE_AUDIT_LOG), async (c) => {
  try {
    const employeeId = c.req.query('employee_id');
    const actionType = c.req.query('action_type');

    let query = db.from('employee_audit_log').select('*');

    if (employeeId) {
      query = query.eq('employee_id', parseInt(employeeId));
    }

    if (actionType) {
      query = query.eq('action_type', actionType);
    }

    const { data: auditLogs, error: auditErr } = await query.order('performed_at', { ascending: false });

    if (auditErr) throw auditErr;

    return c.json(auditLogs || []);
  } catch (error) {
    console.error('Error getting audit log:', error);
    return c.json({ error: 'Failed to get audit log' }, 500);
  }
});

// Create document (HR only)
app.post("/api/documents", authMiddleware, requirePermission(PERMISSIONS.DOCUMENT_UPLOAD), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const { title, description, category, department, is_public, file_url } = await c.req.json();

    // Create document
    const { data: document, error: insertErr } = await db
      .from('documents')
      .insert({
        title,
        description,
        category,
        department,
        is_public,
        file_url,
        uploaded_by_id: userProfile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        uploader:users!documents_uploaded_by_id_fkey (first_name, last_name)
      `)
      .single();

    if (insertErr) throw insertErr;

    // Format response with uploader name
    const response = {
      ...document,
      uploader_name: `${document.uploader?.first_name || ''} ${document.uploader?.last_name || ''}`.trim()
    };

    return c.json(response);
  } catch (error) {
    console.error('Error creating document:', error);
    return c.json({ error: 'Failed to create document' }, 500);
  }
});

// Create complaint
app.post("/api/complaints", authMiddleware, rateLimiter(RateLimits.MUTATION), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const requestBody = await c.req.json();
    const { category, details, is_anonymous } = requestBody;
    
    console.log('[CREATE COMPLAINT] Request received:', {
      category,
      detailsLength: details?.length,
      is_anonymous,
      mochaUserId: mochaUser.id
    });
    
    // Validate and sanitize inputs
    const cleanDetails = validator.validateText(details, 20, 5000);

    if (!cleanDetails) {
      console.log('[CREATE COMPLAINT] Validation failed - details too short or invalid');
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser.id,
        details: { field: 'details', reason: 'required or too short' }
      });
      return c.json({ error: 'Complaint details are required (min 20 characters)' }, 400);
    }
    
    // Get user profile
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      console.log('[CREATE COMPLAINT] User profile not found for mocha_user_id:', mochaUser.id);
      return c.json({ error: 'User profile not found' }, 404);
    }

    console.log('[CREATE COMPLAINT] User profile found:', { userId: userProfile.id });

    // Use AI to analyze sentiment and suggest category if not provided
    let finalCategory = validator.sanitizeString(category, 100);
    if (c.env.OPENAI_API_KEY) {
      try {
        const openaiService = createOpenAIService(c.env.OPENAI_API_KEY, 'gpt-4o-mini');

        // Analyze sentiment to prioritize urgent complaints
        const sentiment = await openaiService.analyzeText(details, 'sentiment');

        if (!category) {
          // Auto-suggest category based on content
          const prompt = `Analyze this employee complaint and categorize it into one of these categories:
          - Acoso laboral
          - Condiciones de trabajo
          - Discriminación
          - Salario y beneficios
          - Ambiente laboral
          - Seguridad
          - Otro

          Complaint: ${details}

          Respond with only the category name.`;

          finalCategory = await openaiService.generateText({
            prompt,
            temperature: 0.3,
            maxTokens: 50
          });

          finalCategory = finalCategory.trim();
        }

        console.log(`[CREATE COMPLAINT] AI analysis - sentiment: ${sentiment}, category: ${finalCategory}`);
      } catch (aiError) {
        console.error('[CREATE COMPLAINT] Error analyzing complaint with AI:', aiError);
        finalCategory = category || 'Otro';
      }
    }

    // Determine if complaint should be anonymous
    const isAnonymous = is_anonymous === true;

    // If anonymous, set user_id to NULL, otherwise use the actual user ID
    const complaintUserId = isAnonymous ? null : userProfile.id;

    console.log('[CREATE COMPLAINT] Preparing to insert complaint:', {
      complaintUserId,
      isAnonymous,
      finalCategory,
      cleanDetailsLength: cleanDetails.length
    });

    // Create complaint
    console.log('[CREATE COMPLAINT] Executing INSERT query...');
    const { data: complaint, error: insertErr } = await db
      .from('complaints')
      .insert({
        user_id: complaintUserId,
        category: finalCategory,
        details: cleanDetails,
        status: 'PENDING',
        is_anonymous: isAnonymous,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (insertErr) throw insertErr;

    console.log('[CREATE COMPLAINT] Created complaint:', {
      id: complaint?.id,
      user_id: complaint?.user_id,
      is_anonymous: complaint?.is_anonymous,
      category: complaint?.category
    });

    console.log('[CREATE COMPLAINT] Success - returning complaint');
    return c.json(complaint);
  } catch (error) {
    console.error('[CREATE COMPLAINT] Error creating complaint:', error);
    console.error('[CREATE COMPLAINT] Error details:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    });
    return c.json({ error: 'Failed to create complaint' }, 500);
  }
});

// Get asset categories
app.get("/api/asset-categories", authMiddleware, async (c) => {
  try {
    const { data: categories, error: categoriesErr } = await db
      .from('asset_categories')
      .select('*')
      .order('name', { ascending: true });

    if (categoriesErr) throw categoriesErr;

    return c.json(categories || []);
  } catch (error) {
    console.error('Error getting asset categories:', error);
    return c.json({ error: 'Failed to get asset categories' }, 500);
  }
});

// Get assets (user's assigned assets or all for HR)
app.get("/api/assets", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Get user profile to check role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    let assets;
    if (userProfile.role === 'HR') {
      // HR can see all assets with relationships
      const { data: allAssets, error: assetsErr } = await db
        .from('assets')
        .select(`
          *,
          asset_categories (name as category_name),
          assigned_user:users!assets_assigned_to_id_fkey (first_name, last_name, email)
        `)
        .order('created_at', { ascending: false });

      if (assetsErr) throw assetsErr;

      // Add counts for each asset
      assets = await Promise.all(
        (allAssets || []).map(async (asset) => {
          const { count: assignmentCount } = await db
            .from('asset_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('asset_id', asset.id);

          const { count: maintenanceCount } = await db
            .from('asset_maintenance')
            .select('*', { count: 'exact', head: true })
            .eq('asset_id', asset.id);

          return {
            ...asset,
            assignment_count: assignmentCount || 0,
            maintenance_count: maintenanceCount || 0
          };
        })
      );
    } else {
      // Regular employees can only see their assigned assets
      const { data: userAssets, error: assetsErr } = await db
        .from('assets')
        .select(`
          *,
          asset_categories (name as category_name)
        `)
        .eq('assigned_to_id', userProfile.id)
        .order('created_at', { ascending: false });

      if (assetsErr) throw assetsErr;

      // Add counts for each asset
      assets = await Promise.all(
        (userAssets || []).map(async (asset) => {
          const { count: assignmentCount } = await db
            .from('asset_assignments')
            .select('*', { count: 'exact', head: true })
            .eq('asset_id', asset.id)
            .eq('user_id', userProfile.id);

          const { count: maintenanceCount } = await db
            .from('asset_maintenance')
            .select('*', { count: 'exact', head: true })
            .eq('asset_id', asset.id);

          return {
            ...asset,
            assignment_count: assignmentCount || 0,
            maintenance_count: maintenanceCount || 0
          };
        })
      );
    }

    return c.json(assets || []);
  } catch (error) {
    console.error('Error getting assets:', error);
    return c.json({ error: 'Failed to get assets' }, 500);
  }
});

// Create asset (HR only)
app.post("/api/assets", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const {
      asset_code,
      name,
      description,
      category_id,
      brand,
      model,
      serial_number,
      purchase_date,
      purchase_cost,
      location,
      warranty_expiry_date,
      notes,
      invoice_url
    } = await c.req.json();

    // Create asset
    const { data: asset, error: insertErr } = await db
      .from('assets')
      .insert({
        asset_code,
        name,
        description,
        category_id,
        brand,
        model,
        serial_number,
        purchase_date,
        purchase_cost,
        location,
        warranty_expiry_date,
        notes,
        invoice_url,
        status: 'AVAILABLE',
        condition_status: 'GOOD',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        asset_categories (name as category_name)
      `)
      .single();

    if (insertErr) throw insertErr;

    return c.json(asset);
  } catch (error) {
    console.error('Error creating asset:', error);
    return c.json({ error: 'Failed to create asset' }, 500);
  }
});

// Update asset (HR only)
app.put("/api/assets/:id", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const assetId = parseInt(c.req.param('id'));

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const {
      asset_code,
      name,
      description,
      category_id,
      brand,
      model,
      serial_number,
      purchase_date,
      purchase_cost,
      location,
      warranty_expiry_date,
      notes,
      condition_status,
      status,
      invoice_url
    } = await c.req.json();

    // Update asset
    const { error: updateErr } = await db
      .from('assets')
      .update({
        asset_code,
        name,
        description,
        category_id,
        brand,
        model,
        serial_number,
        purchase_date,
        purchase_cost,
        location,
        warranty_expiry_date,
        notes,
        condition_status,
        status,
        invoice_url,
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId);

    if (updateErr) throw updateErr;

    // Get the updated asset with category and assignment info
    const { data: asset, error: selectErr } = await db
      .from('assets')
      .select(`
        *,
        asset_categories (name as category_name),
        assigned_user:users!assets_assigned_to_id_fkey (first_name, last_name, email)
      `)
      .eq('id', assetId)
      .single();

    if (selectErr) throw selectErr;

    // Get counts
    const { count: assignmentCount } = await db
      .from('asset_assignments')
      .select('*', { count: 'exact', head: true })
      .eq('asset_id', assetId);

    const { count: maintenanceCount } = await db
      .from('asset_maintenance')
      .select('*', { count: 'exact', head: true })
      .eq('asset_id', assetId);

    return c.json({
      ...asset,
      assignment_count: assignmentCount || 0,
      maintenance_count: maintenanceCount || 0
    });
  } catch (error) {
    console.error('Error updating asset:', error);
    return c.json({ error: 'Failed to update asset' }, 500);
  }
});

// Create asset assignment (HR only)
app.post("/api/asset-assignments", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { asset_id, user_id, assigned_date, assignment_notes } = await c.req.json();

    // Create assignment
    const { data: assignment, error: insertErr } = await db
      .from('asset_assignments')
      .insert({
        asset_id,
        user_id,
        assigned_by_id: userProfile.id,
        assigned_date,
        assignment_notes,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (insertErr) throw insertErr;

    // Update asset status and assigned_to_id
    await db
      .from('assets')
      .update({
        status: 'ASSIGNED',
        assigned_to_id: user_id,
        assigned_date,
        updated_at: new Date().toISOString()
      })
      .eq('id', asset_id);

    return c.json({ success: true, assignment_id: assignment.id });
  } catch (error) {
    console.error('Error creating asset assignment:', error);
    return c.json({ error: 'Failed to create asset assignment' }, 500);
  }
});

// Return asset (HR only)
app.put("/api/assets/:id/return", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const assetId = parseInt(c.req.param('id'));

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { return_date, return_notes } = await c.req.json();

    // Update active assignment
    const { error: assignmentErr } = await db
      .from('asset_assignments')
      .update({
        status: 'RETURNED',
        return_date,
        return_notes,
        updated_at: new Date().toISOString()
      })
      .eq('asset_id', assetId)
      .eq('status', 'ACTIVE');

    if (assignmentErr) throw assignmentErr;

    // Update asset status
    const { error: assetErr } = await db
      .from('assets')
      .update({
        status: 'AVAILABLE',
        assigned_to_id: null,
        assigned_date: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', assetId);

    if (assetErr) throw assetErr;

    return c.json({ success: true });
  } catch (error) {
    console.error('Error returning asset:', error);
    return c.json({ error: 'Failed to return asset' }, 500);
  }
});

// Create asset maintenance record (HR only)
app.post("/api/asset-maintenance", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const {
      asset_id,
      maintenance_type,
      description,
      maintenance_date,
      cost,
      performed_by,
      next_maintenance_date,
      notes
    } = await c.req.json();

    // Create maintenance record
    const { data: maintenance, error: insertErr } = await db
      .from('asset_maintenance')
      .insert({
        asset_id,
        maintenance_type,
        description,
        maintenance_date,
        cost,
        performed_by,
        next_maintenance_date,
        notes,
        created_by_id: userProfile.id,
        status: 'SCHEDULED',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (insertErr) throw insertErr;

    // Update asset status if maintenance is scheduled for today or past
    const today = new Date().toISOString().split('T')[0];
    if (maintenance_date <= today) {
      await db
        .from('assets')
        .update({
          status: 'MAINTENANCE',
          updated_at: new Date().toISOString()
        })
        .eq('id', asset_id);
    }

    return c.json({ success: true, maintenance_id: maintenance.id });
  } catch (error) {
    console.error('Error creating maintenance record:', error);
    return c.json({ error: 'Failed to create maintenance record' }, 500);
  }
});

// Get asset assignments (HR only)
app.get("/api/asset-assignments", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { data: assignments, error: assignmentsErr } = await db
      .from('asset_assignments')
      .select(`
        *,
        asset:assets (name, asset_code),
        user:users!asset_assignments_user_id_fkey (first_name, last_name),
        assigned_by_user:users!asset_assignments_assigned_by_id_fkey (first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (assignmentsErr) throw assignmentsErr;

    // Format response with flattened employee and assigned_by names
    const formattedAssignments = (assignments || []).map((aa) => ({
      ...aa,
      asset_name: aa.asset?.name,
      asset_code: aa.asset?.asset_code,
      employee_name: `${aa.user?.first_name || ''} ${aa.user?.last_name || ''}`.trim(),
      assigned_by_name: `${aa.assigned_by_user?.first_name || ''} ${aa.assigned_by_user?.last_name || ''}`.trim()
    }));

    return c.json(formattedAssignments);
  } catch (error) {
    console.error('Error getting asset assignments:', error);
    return c.json({ error: 'Failed to get asset assignments' }, 500);
  }
});

// Get asset maintenance records (HR only)
app.get("/api/asset-maintenance", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { data: maintenance, error: maintenanceErr } = await db
      .from('asset_maintenance')
      .select(`
        *,
        asset:assets (name, asset_code),
        created_by_user:users!asset_maintenance_created_by_id_fkey (first_name, last_name)
      `)
      .order('created_at', { ascending: false });

    if (maintenanceErr) throw maintenanceErr;

    // Format response with flattened asset and created_by names
    const formattedMaintenance = (maintenance || []).map((am) => ({
      ...am,
      asset_name: am.asset?.name,
      asset_code: am.asset?.asset_code,
      created_by_name: `${am.created_by_user?.first_name || ''} ${am.created_by_user?.last_name || ''}`.trim()
    }));

    return c.json(formattedMaintenance);
  } catch (error) {
    console.error('Error getting asset maintenance:', error);
    return c.json({ error: 'Failed to get asset maintenance' }, 500);
  }
});

// Get asset history (assignments, maintenance, incidents) (HR only)
app.get("/api/assets/:id/history", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const assetId = parseInt(c.req.param('id'));

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Get assignments history
    const { data: assignments, error: assignErr } = await db
      .from('asset_assignments')
      .select(`
        *,
        user:users!asset_assignments_user_id_fkey (first_name, last_name),
        assigned_by_user:users!asset_assignments_assigned_by_id_fkey (first_name, last_name)
      `)
      .eq('asset_id', assetId)
      .order('assigned_date', { ascending: false });

    if (assignErr) throw assignErr;

    // Get maintenance history
    const { data: maintenance, error: maintErr } = await db
      .from('asset_maintenance')
      .select(`
        *,
        created_by_user:users!asset_maintenance_created_by_id_fkey (first_name, last_name)
      `)
      .eq('asset_id', assetId)
      .order('maintenance_date', { ascending: false });

    if (maintErr) throw maintErr;

    // Get incidents history
    const { data: incidents, error: incidErr } = await db
      .from('asset_incidents')
      .select(`
        *,
        reported_by_user:users!asset_incidents_reported_by_id_fkey (first_name, last_name),
        resolved_by_user:users!asset_incidents_resolved_by_id_fkey (first_name, last_name)
      `)
      .eq('asset_id', assetId)
      .order('incident_date', { ascending: false });

    if (incidErr) throw incidErr;

    // Combine all events with event type
    const allEvents = [
      ...(assignments || []).map(a => ({
        ...a,
        event_type: 'ASSIGNMENT',
        employee_name: `${a.user?.first_name || ''} ${a.user?.last_name || ''}`.trim(),
        assigned_by_name: `${a.assigned_by_user?.first_name || ''} ${a.assigned_by_user?.last_name || ''}`.trim(),
        event_date: a.assigned_date
      })),
      ...(maintenance || []).map(m => ({
        ...m,
        event_type: 'MAINTENANCE',
        created_by_name: `${m.created_by_user?.first_name || ''} ${m.created_by_user?.last_name || ''}`.trim(),
        event_date: m.maintenance_date
      })),
      ...(incidents || []).map(i => ({
        ...i,
        event_type: 'INCIDENT',
        reported_by_name: `${i.reported_by_user?.first_name || ''} ${i.reported_by_user?.last_name || ''}`.trim(),
        resolved_by_name: `${i.resolved_by_user?.first_name || ''} ${i.resolved_by_user?.last_name || ''}`.trim(),
        event_date: i.incident_date
      }))
    ];

    // Sort by date (most recent first)
    allEvents.sort((a, b) => {
      const dateA = new Date(a.event_date);
      const dateB = new Date(b.event_date);
      return dateB.getTime() - dateA.getTime();
    });

    return c.json(allEvents);
  } catch (error) {
    console.error('Error getting asset history:', error);
    return c.json({ error: 'Failed to get asset history' }, 500);
  }
});

// Create asset incident (HR only)
app.post("/api/asset-incidents", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const {
      asset_id,
      assignment_id,
      incident_type,
      description,
      incident_date,
      severity,
      notes
    } = await c.req.json();

    // Create incident record
    const { data: incident, error: insertErr } = await db
      .from('asset_incidents')
      .insert({
        asset_id,
        assignment_id,
        incident_type,
        description,
        incident_date,
        reported_by_id: userProfile.id,
        severity: severity || 'MEDIUM',
        notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (insertErr) throw insertErr;

    return c.json({ success: true, incident_id: incident.id });
  } catch (error) {
    console.error('Error creating incident record:', error);
    return c.json({ error: 'Failed to create incident record' }, 500);
  }
});

// Update incident resolution (HR only)
app.put("/api/asset-incidents/:id/resolve", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const incidentId = parseInt(c.req.param('id'));

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { resolution, resolved_date } = await c.req.json();

    // Update incident with resolution
    const { error: updateErr } = await db
      .from('asset_incidents')
      .update({
        resolution,
        resolved_date,
        resolved_by_id: userProfile.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', incidentId);

    if (updateErr) throw updateErr;

    return c.json({ success: true });
  } catch (error) {
    console.error('Error resolving incident:', error);
    return c.json({ error: 'Failed to resolve incident' }, 500);
  }
});

// Get asset reports with filters (HR only)
app.get("/api/reports/assets", authMiddleware, requirePermission(PERMISSIONS.ASSET_VIEW_ALL), async (c) => {
  try {
    const categoryId = c.req.query('category_id');
    const conditionStatus = c.req.query('condition_status');
    const operationalStatus = c.req.query('operational_status');
    const department = c.req.query('department');

    let query = db
      .from('assets')
      .select(`
        *,
        category:asset_categories (name),
        assigned_user:users!assets_assigned_to_id_fkey (first_name, last_name, department)
      `);

    if (categoryId) {
      query = query.eq('category_id', parseInt(categoryId));
    }
    if (conditionStatus) {
      query = query.eq('condition_status', conditionStatus);
    }
    if (operationalStatus) {
      query = query.eq('status', operationalStatus);
    }
    if (department) {
      query = query.eq('assigned_user.department', department);
    }

    const { data: assets, error: assetsErr } = await query.order('name', { ascending: true });

    if (assetsErr) throw assetsErr;

    // Format response with flattened data
    const formattedAssets = (assets || []).map(a => ({
      ...a,
      category_name: a.category?.name,
      assigned_to_name: `${a.assigned_user?.first_name || ''} ${a.assigned_user?.last_name || ''}`.trim(),
      employee_department: a.assigned_user?.department
    }));

    return c.json(formattedAssets);
  } catch (error) {
    console.error('Error generating assets report:', error);
    return c.json({ error: 'Failed to generate assets report' }, 500);
  }
});

// Get assets by employee (HR only)
app.get("/api/reports/assets/by-employee/:employeeId", authMiddleware, requirePermission(PERMISSIONS.ASSET_VIEW_ALL), async (c) => {
  try {
    const employeeId = parseInt(c.req.param('employeeId'));

    const { data: assets, error: assetsErr } = await db
      .from('assets')
      .select(`
        *,
        category:asset_categories (name)
      `)
      .eq('assigned_to_id', employeeId)
      .order('name', { ascending: true });

    if (assetsErr) throw assetsErr;

    // Format response with flattened data
    const formattedAssets = (assets || []).map(a => ({
      ...a,
      category_name: a.category?.name
    }));

    return c.json(formattedAssets);
  } catch (error) {
    console.error('Error getting assets by employee:', error);
    return c.json({ error: 'Failed to get assets by employee' }, 500);
  }
});

// Export asset report to PDF (HR only)
app.get("/api/reports/assets/export-pdf", authMiddleware, requirePermission(PERMISSIONS.ASSET_VIEW_ALL), async (c) => {
  try {
    const categoryId = c.req.query('category_id');
    const conditionStatus = c.req.query('condition_status');
    const operationalStatus = c.req.query('operational_status');
    const department = c.req.query('department');
    const employeeId = c.req.query('employee_id');

    let query: string;
    const params: (string | number)[] = [];

    if (employeeId) {
      // Report by employee
      query = `
        SELECT a.*, ac.name as category_name, u.department as employee_department,
               u.first_name || ' ' || u.last_name as assigned_to_name
        FROM assets a
        JOIN asset_categories ac ON a.category_id = ac.id
        LEFT JOIN users u ON a.assigned_to_id = u.id
        WHERE a.assigned_to_id = ?
        ORDER BY a.name ASC
      `;
      params.push(parseInt(employeeId));
    } else {
      // General report with filters
      query = `
        SELECT a.*, ac.name as category_name, u.first_name || ' ' || u.last_name as assigned_to_name, u.department as employee_department
        FROM assets a
        JOIN asset_categories ac ON a.category_id = ac.id
        LEFT JOIN users u ON a.assigned_to_id = u.id
        WHERE 1=1
      `;

      if (categoryId) {
        query += " AND a.category_id = ?";
        params.push(parseInt(categoryId));
      }
      if (conditionStatus) {
        query += " AND a.condition_status = ?";
        params.push(conditionStatus);
      }
      if (operationalStatus) {
        query += " AND a.status = ?";
        params.push(operationalStatus);
      }
      if (department) {
        query += " AND u.department = ?";
        params.push(department);
      }

      query += " ORDER BY a.name ASC";
    }

    const assets = await c.env.DB.prepare(query).bind(...params).all();

    if (!assets.results || assets.results.length === 0) {
      return c.json({ error: 'No se encontraron activos para exportar' }, 404);
    }

    // Helper function to get readable status text
    const getConditionText = (condition: string) => {
      switch (condition) {
        case 'EXCELLENT': return 'Excelente';
        case 'GOOD': return 'Bueno';
        case 'FAIR': return 'Regular';
        case 'POOR': return 'Malo';
        default: return condition;
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'AVAILABLE': return 'Disponible';
        case 'ASSIGNED': return 'Asignado';
        case 'MAINTENANCE': return 'En Mantenimiento';
        case 'RETIRED': return 'Retirado';
        default: return status;
      }
    };

    // Import jsPDF dynamically
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Title
    doc.setFontSize(16);
    doc.text('Reporte de Activos', 14, 15);

    // Report details
    doc.setFontSize(10);
    let yPos = 25;
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, 14, yPos);
    yPos += 6;
    doc.text(`Total de activos: ${assets.results.length}`, 14, yPos);
    yPos += 10;

    // Table data
    const tableData = assets.results.map((asset: any) => [
      asset.asset_code || '',
      asset.name || '',
      asset.category_name || '',
      asset.brand || '',
      asset.model || '',
      getConditionText(asset.condition_status),
      getStatusText(asset.status),
      asset.assigned_to_name || '-',
      asset.location || '-'
    ]);

    // Generate table using autoTable plugin
    (doc as any).autoTable({
      startY: yPos,
      head: [['Código', 'Nombre', 'Categoría', 'Marca', 'Modelo', 'Condición', 'Estado', 'Asignado a', 'Ubicación']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [41, 128, 185], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 10 },
      theme: 'striped'
    });

    // Generate PDF as ArrayBuffer
    const pdfBuffer = doc.output('arraybuffer');

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte_activos_${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error exporting assets to PDF:', error);
    return c.json({ error: 'Failed to export assets report to PDF' }, 500);
  }
});

// Export asset report to CSV (HR only)
app.get("/api/reports/assets/export-csv", authMiddleware, requirePermission(PERMISSIONS.ASSET_VIEW_ALL), async (c) => {
  try {
    const categoryId = c.req.query('category_id');
    const conditionStatus = c.req.query('condition_status');
    const operationalStatus = c.req.query('operational_status');
    const department = c.req.query('department');
    const employeeId = c.req.query('employee_id');

    let query: string;
    const params: (string | number)[] = [];

    if (employeeId) {
      // Report by employee
      query = `
        SELECT a.*, ac.name as category_name, u.department as employee_department
        FROM assets a
        JOIN asset_categories ac ON a.category_id = ac.id
        LEFT JOIN users u ON a.assigned_to_id = u.id
        WHERE a.assigned_to_id = ?
        ORDER BY a.name ASC
      `;
      params.push(parseInt(employeeId));
    } else {
      // General report with filters
      query = `
        SELECT a.*, ac.name as category_name, u.first_name || ' ' || u.last_name as assigned_to_name, u.department as employee_department
        FROM assets a
        JOIN asset_categories ac ON a.category_id = ac.id
        LEFT JOIN users u ON a.assigned_to_id = u.id
        WHERE 1=1
      `;

      if (categoryId) {
        query += " AND a.category_id = ?";
        params.push(parseInt(categoryId));
      }
      if (conditionStatus) {
        query += " AND a.condition_status = ?";
        params.push(conditionStatus);
      }
      if (operationalStatus) {
        query += " AND a.status = ?";
        params.push(operationalStatus);
      }
      if (department) {
        query += " AND u.department = ?";
        params.push(department);
      }

      query += " ORDER BY a.name ASC";
    }

    const assets = await c.env.DB.prepare(query).bind(...params).all();

    if (!assets.results || assets.results.length === 0) {
      return c.json({ error: 'No se encontraron activos para exportar' }, 404);
    }

    // CSV Headers
    const headers = [
      "Código de Activo", "Nombre", "Descripción", "Categoría", "Marca", "Modelo", 
      "Número de Serie", "Fecha de Compra", "Costo de Compra", "Estado Operacional", 
      "Estado de Condición", "Ubicación", "Asignado a", "Departamento", "Fecha de Asignación", 
      "Vencimiento de Garantía", "Notas"
    ].join(',');

    // Helper function to get readable status text
    const getConditionText = (condition: string) => {
      switch (condition) {
        case 'EXCELLENT': return 'Excelente';
        case 'GOOD': return 'Bueno';
        case 'FAIR': return 'Regular';
        case 'POOR': return 'Malo';
        default: return condition;
      }
    };

    const getStatusText = (status: string) => {
      switch (status) {
        case 'AVAILABLE': return 'Disponible';
        case 'ASSIGNED': return 'Asignado';
        case 'MAINTENANCE': return 'En Mantenimiento';
        case 'RETIRED': return 'Retirado';
        default: return status;
      }
    };

    // CSV Rows
    const csvRows = assets.results.map((asset: any) => {
      const row = [
        asset.asset_code,
        asset.name,
        asset.description?.replace(/"/g, '""'), // Escape double quotes
        asset.category_name,
        asset.brand,
        asset.model,
        asset.serial_number,
        asset.purchase_date,
        asset.purchase_cost,
        getStatusText(asset.status),
        getConditionText(asset.condition_status),
        asset.location,
        asset.assigned_to_name,
        asset.employee_department,
        asset.assigned_date,
        asset.warranty_expiry_date,
        asset.notes?.replace(/"/g, '""') // Escape double quotes
      ];
      return row.map(field => `"${field || ''}"`).join(','); // Wrap fields in quotes
    }).join('\n');

    const csvContent = `${headers}\n${csvRows}`;

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reporte_activos_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting assets to CSV:', error);
    return c.json({ error: 'Failed to export assets report to CSV' }, 500);
  }
});

// Get employee reports with filters (HR only)
app.get("/api/reports/employees", authMiddleware, requirePermission(PERMISSIONS.EMPLOYEE_VIEW), async (c) => {
  try {
    const status = c.req.query('status');
    const department = c.req.query('department');
    const payrollType = c.req.query('payroll_type');
    const companyName = c.req.query('company_name');
    const sede = c.req.query('sede');

    let query = db
      .from('users')
      .select(`
        id, first_name, last_name, email, ci, phone, department,
        position, payroll_type, base_salary, birth_date, sede,
        company_name, status, created_at, updated_at
      `)
      .eq('role', 'EMPLOYEE');

    if (status) {
      query = query.eq('status', status);
    }
    if (department) {
      query = query.eq('department', department);
    }
    if (payrollType) {
      query = query.eq('payroll_type', payrollType);
    }
    if (companyName) {
      query = query.eq('company_name', companyName);
    }
    if (sede) {
      query = query.eq('sede', sede);
    }

    const { data: employees, error: empErr } = await query.order('first_name', { ascending: true }).order('last_name', { ascending: true });

    if (empErr) throw empErr;

    return c.json(employees || []);
  } catch (error) {
    console.error('Error generating employees report:', error);
    return c.json({ error: 'Failed to generate employees report' }, 500);
  }
});

// Export employee report to CSV (HR only)
app.get("/api/reports/employees/export-csv", authMiddleware, requirePermission(PERMISSIONS.EMPLOYEE_VIEW), async (c) => {
  try {
    const status = c.req.query('status');
    const department = c.req.query('department');
    const payrollType = c.req.query('payroll_type');
    const companyName = c.req.query('company_name');
    const sede = c.req.query('sede');

    let query = `
      SELECT id, first_name, last_name, email, ci, phone, department,
             position, payroll_type, base_salary, birth_date, sede,
             company_name, status, created_at
      FROM users
      WHERE role = 'EMPLOYEE'
    `;
    const params: (string | number)[] = [];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    if (department) {
      query += " AND department = ?";
      params.push(department);
    }
    if (payrollType) {
      query += " AND payroll_type = ?";
      params.push(payrollType);
    }
    if (companyName) {
      query += " AND company_name = ?";
      params.push(companyName);
    }
    if (sede) {
      query += " AND sede = ?";
      params.push(sede);
    }

    query += " ORDER BY first_name, last_name ASC";

    const employees = await c.env.DB.prepare(query).bind(...params).all();

    if (!employees.results || employees.results.length === 0) {
      return c.json({ error: 'No se encontraron empleados para exportar' }, 404);
    }

    // CSV Headers
    const headers = [
      "CI", "Nombre", "Apellido", "Email", "Teléfono", "Departamento",
      "Posición", "Tipo de Nómina", "Salario Base", "Fecha de Nacimiento",
      "Empresa", "Sede", "Estado", "Fecha de Registro"
    ].join(',');

    // CSV Rows
    const csvRows = employees.results.map((employee: any) => {
      const row = [
        employee.ci,
        employee.first_name,
        employee.last_name,
        employee.email,
        employee.phone,
        employee.department,
        employee.position,
        employee.payroll_type,
        employee.base_salary,
        employee.birth_date,
        employee.company_name,
        employee.sede,
        employee.status === 'ACTIVE' ? 'Activo' : 'Inactivo',
        employee.created_at
      ];
      return row.map(field => `"${field || ''}"`).join(',');
    }).join('\n');

    const csvContent = `${headers}\n${csvRows}`;

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reporte_empleados_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting employees to CSV:', error);
    return c.json({ error: 'Failed to export employees report to CSV' }, 500);
  }
});

// Export employee report to PDF (HR only)
app.get("/api/reports/employees/export-pdf", authMiddleware, requirePermission(PERMISSIONS.EMPLOYEE_VIEW), async (c) => {
  try {
    const status = c.req.query('status');
    const department = c.req.query('department');
    const payrollType = c.req.query('payroll_type');
    const companyName = c.req.query('company_name');
    const sede = c.req.query('sede');

    let query = `
      SELECT id, first_name, last_name, email, ci, phone, department,
             position, payroll_type, base_salary, birth_date, sede,
             company_name, status
      FROM users
      WHERE role = 'EMPLOYEE'
    `;
    const params: (string | number)[] = [];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    if (department) {
      query += " AND department = ?";
      params.push(department);
    }
    if (payrollType) {
      query += " AND payroll_type = ?";
      params.push(payrollType);
    }
    if (companyName) {
      query += " AND company_name = ?";
      params.push(companyName);
    }
    if (sede) {
      query += " AND sede = ?";
      params.push(sede);
    }

    query += " ORDER BY first_name, last_name ASC";

    const employees = await c.env.DB.prepare(query).bind(...params).all();

    if (!employees.results || employees.results.length === 0) {
      return c.json({ error: 'No se encontraron empleados para exportar' }, 404);
    }

    // Import jsPDF dynamically
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Title
    doc.setFontSize(16);
    doc.text('Reporte de Empleados', 14, 15);

    // Report details
    doc.setFontSize(10);
    let yPos = 25;
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, 14, yPos);
    yPos += 6;
    doc.text(`Total de empleados: ${employees.results.length}`, 14, yPos);
    yPos += 10;

    // Table data
    const tableData = employees.results.map((employee: any) => [
      employee.ci || '',
      `${employee.first_name} ${employee.last_name}`,
      employee.email || '',
      employee.phone || '',
      employee.department || '',
      employee.position || '',
      employee.payroll_type || '',
      employee.company_name || '',
      employee.sede || '',
      employee.status === 'ACTIVE' ? 'Activo' : 'Inactivo'
    ]);

    // Generate table using autoTable plugin
    (doc as any).autoTable({
      startY: yPos,
      head: [['CI', 'Nombre Completo', 'Email', 'Teléfono', 'Departamento', 'Posición', 'Tipo Nómina', 'Empresa', 'Sede', 'Estado']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 10 },
      theme: 'striped'
    });

    // Generate PDF as ArrayBuffer
    const pdfBuffer = doc.output('arraybuffer');

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte_empleados_${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error exporting employees to PDF:', error);
    return c.json({ error: 'Failed to export employees report to PDF' }, 500);
  }
});

// Get employee asset assignment history (HR only)
app.get("/api/employees/:id/asset-history", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const employeeId = parseInt(c.req.param('id'));

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Get asset assignment history
    const { data: assetHistory, error: histErr } = await db
      .from('asset_assignments')
      .select(`
        *,
        asset:assets (asset_code, name, brand, model, serial_number, condition_status, category_id),
        assigned_by_user:users!asset_assignments_assigned_by_id_fkey (first_name, last_name)
      `)
      .eq('user_id', employeeId)
      .order('assigned_date', { ascending: false });

    if (histErr) throw histErr;

    // Format response with calculated fields
    const formattedHistory = (assetHistory || []).map(aa => {
      const assignedDate = new Date(aa.assigned_date);
      const returnDate = aa.return_date ? new Date(aa.return_date) : new Date();
      const durationDays = Math.floor((returnDate.getTime() - assignedDate.getTime()) / (1000 * 60 * 60 * 24));

      return {
        ...aa,
        asset_code: aa.asset?.asset_code,
        asset_name: aa.asset?.name,
        brand: aa.asset?.brand,
        model: aa.asset?.model,
        serial_number: aa.asset?.serial_number,
        condition_status: aa.asset?.condition_status,
        assigned_by_name: `${aa.assigned_by_user?.first_name || ''} ${aa.assigned_by_user?.last_name || ''}`.trim(),
        duration_days: durationDays
      };
    });

    return c.json(formattedHistory);
  } catch (error) {
    console.error('Error getting employee asset history:', error);
    return c.json({ error: 'Failed to get employee asset history' }, 500);
  }
});

// Get asset incidents (HR only)
app.get("/api/asset-incidents", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    // Check if user has HR role
    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile || userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const assetId = c.req.query('asset_id');

    let query = db
      .from('asset_incidents')
      .select(`
        *,
        asset:assets (name, asset_code),
        reported_by_user:users!asset_incidents_reported_by_id_fkey (first_name, last_name),
        resolved_by_user:users!asset_incidents_resolved_by_id_fkey (first_name, last_name),
        assignment:asset_assignments (user_id, user:users!asset_assignments_user_id_fkey (first_name, last_name))
      `);

    if (assetId) {
      query = query.eq('asset_id', parseInt(assetId));
    }

    const { data: incidents, error: incidErr } = await query.order('created_at', { ascending: false });

    if (incidErr) throw incidErr;

    // Format response with flattened data
    const formattedIncidents = (incidents || []).map(ai => ({
      ...ai,
      asset_name: ai.asset?.name,
      asset_code: ai.asset?.asset_code,
      reported_by_name: `${ai.reported_by_user?.first_name || ''} ${ai.reported_by_user?.last_name || ''}`.trim(),
      resolved_by_name: ai.resolved_by_user ? `${ai.resolved_by_user.first_name || ''} ${ai.resolved_by_user.last_name || ''}`.trim() : null,
      assigned_user_id: ai.assignment?.user_id,
      assigned_user_name: ai.assignment?.user ? `${ai.assignment.user.first_name || ''} ${ai.assignment.user.last_name || ''}`.trim() : null
    }));

    return c.json(formattedIncidents);
  } catch (error) {
    console.error('Error getting asset incidents:', error);
    return c.json({ error: 'Failed to get asset incidents' }, 500);
  }
});

// Get conversations for current user
app.get("/api/chat/conversations", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    
    const userProfile = await c.env.DB.prepare(
      "SELECT id, role, hr_permissions FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const userId = userProfile!.id as number;

    if ((userProfile as any).role === 'HR' && hasPermission(userProfile as any, PERMISSIONS.CHAT_VIEW_ALL_CONVERSATIONS)) {
      // HR sees all conversations
      const conversations = await c.env.DB.prepare(`
        SELECT DISTINCT c.id, c.created_at, c.updated_at,
               u.id as other_user_id, u.first_name, u.last_name, u.department, u.position,
               m.text as last_message_text, m.created_at as last_message_time, m.sender_id as last_message_sender
        FROM conversations c
        JOIN conversation_participants cp1 ON c.id = cp1.conversation_id
        JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id != cp1.user_id
        JOIN users u ON cp2.user_id = u.id
        LEFT JOIN messages m ON c.id = m.conversation_id
        WHERE cp1.user_id = ?
          AND m.id = (
            SELECT MAX(id) FROM messages WHERE conversation_id = c.id
          )
        ORDER BY m.created_at DESC
      `).bind(userId).all();

      const conversationData = await Promise.all((conversations.results || []).map(async (conv: any) => {
        const messages = await c.env.DB.prepare(
          "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
        ).bind(conv.id).all();

        return {
          id: conv.id,
          participants: [userId, conv.other_user_id],
          messages: messages.results || [],
          last_message: conv.last_message_text ? {
            id: 0,
            conversation_id: conv.id,
            sender_id: conv.last_message_sender,
            text: conv.last_message_text,
            is_broadcast: false,
            poll_id: null,
            created_at: conv.last_message_time,
            updated_at: conv.last_message_time,
          } : null,
          other_participant: {
            id: conv.other_user_id,
            first_name: conv.first_name,
            last_name: conv.last_name,
            department: conv.department,
            position: conv.position,
          },
          created_at: conv.created_at,
          updated_at: conv.updated_at,
        };
      }));

      return c.json(conversationData);
    } else {
      // Employees only see their conversation with HR
      // First find or create a conversation with HR
      const hrUsers = await c.env.DB.prepare(
        "SELECT id FROM users WHERE role = 'HR' ORDER BY id LIMIT 1"
      ).all();

      if (!hrUsers.results || hrUsers.results.length === 0) {
        return c.json([]);
      }

      const hrUserId = (hrUsers.results[0] as any).id;

      // Find existing conversation
      let conversation = await c.env.DB.prepare(`
        SELECT c.id FROM conversations c
        JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ?
        JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = ?
      `).bind(userId, hrUserId).first();

      if (!conversation) {
        // Create new conversation
        const newConv = await c.env.DB.prepare(
          "INSERT INTO conversations (created_at, updated_at) VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        ).run();

        const conversationId = newConv.meta.last_row_id;

        await c.env.DB.prepare(
          "INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)"
        ).bind(conversationId, userId, conversationId, hrUserId).run();

        conversation = { id: conversationId };
      }

      // Get messages
      const messages = await c.env.DB.prepare(
        "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC"
      ).bind(conversation.id).all();

      return c.json([{
        id: conversation.id,
        participants: [userId, hrUserId],
        messages: messages.results || [],
        last_message: null,
        other_participant: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }]);
    }
  } catch (error) {
    console.error('Error getting conversations:', error);
    return c.json({ error: 'Failed to get conversations' }, 500);
  }
});

// Send message
app.post("/api/chat/messages", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    if (!mochaUser) {
      return c.json({ error: 'User not authenticated' }, 401);
    }
    const { conversation_id, text, is_auto_response, employee_id } = await c.req.json();
    
    const userProfile = await c.env.DB.prepare(
      "SELECT id, role, first_name, last_name FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const userId = (userProfile as any).id as number;
    let actualConversationId = conversation_id;

    // If no conversation_id but employee_id is provided, find or create conversation
    if (!conversation_id && employee_id) {
      // Find existing conversation between HR user and employee
      let conversation = await c.env.DB.prepare(`
        SELECT c.id FROM conversations c
        JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ?
        JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = ?
      `).bind(userId, employee_id).first();

      if (!conversation) {
        // Create new conversation
        const newConv = await c.env.DB.prepare(
          "INSERT INTO conversations (created_at, updated_at) VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        ).run();

        actualConversationId = newConv.meta.last_row_id;

        // Add participants
        await c.env.DB.prepare(
          "INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)"
        ).bind(actualConversationId, userId, actualConversationId, employee_id).run();
      } else {
        actualConversationId = conversation.id;
      }
    }

    // For auto-responses, use the first HR user as sender
    let senderId = userId;
    if (is_auto_response && (userProfile as any).role === 'EMPLOYEE') {
      const hrUser = await c.env.DB.prepare(
        "SELECT id FROM users WHERE role = 'HR' ORDER BY id LIMIT 1"
      ).first();
      if (hrUser) {
        senderId = (hrUser as any).id;
      }
    }

    // Insert message (ensure no undefined values are passed to D1)
    const result = await c.env.DB.prepare(`
      INSERT INTO messages (conversation_id, sender_id, text, is_broadcast, poll_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `).bind(actualConversationId, senderId, text, false, null).run();

    // Update conversation timestamp
    await c.env.DB.prepare(
      "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(actualConversationId).run();

    // Generate AI auto-response if it's an employee message and HR is available
    if ((userProfile as any).role === 'EMPLOYEE' && c.env.OPENAI_API_KEY) {
      try {
        const openaiService = createOpenAIService(c.env.OPENAI_API_KEY, 'gpt-4o-mini');
        
        const autoResponse = await openaiService.generateAutoResponse({
          messageText: text,
          employeeName: `${(userProfile as any).first_name} ${(userProfile as any).last_name}`
        });

        // Find HR user to send auto-response
        const hrUser = await c.env.DB.prepare(
          "SELECT id FROM users WHERE role = 'HR' ORDER BY id LIMIT 1"
        ).first();

        if (hrUser && autoResponse) {
          // Insert auto-response message (ensure no undefined values)
          await c.env.DB.prepare(`
            INSERT INTO messages (conversation_id, sender_id, text, is_broadcast, poll_id, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `).bind(actualConversationId, (hrUser as any).id, `[Auto-response] ${autoResponse}`, false, null).run();
        }
      } catch (aiError) {
        console.error('Error generating AI response:', aiError);
        // Continue without auto-response if AI fails
      }
    }

    return c.json({ success: true, message_id: result.meta.last_row_id, conversation_id: actualConversationId });
  } catch (error) {
    console.error('Error sending message:', error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// Send broadcast
app.post("/api/chat/broadcast", authMiddleware, requirePermission(PERMISSIONS.CHAT_SEND_BROADCAST), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    if (!mochaUser) {
      return c.json({ error: 'User not authenticated' }, 401);
    }
    const { target, message, poll } = await c.req.json();
    
    const userProfile = await c.env.DB.prepare(
      "SELECT id FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const userId = (userProfile as any).id as number;

    // Get target users
    let targetUsers;
    if (target === 'ALL') {
      targetUsers = await c.env.DB.prepare(
        "SELECT id FROM users WHERE role = 'EMPLOYEE' AND status = 'ACTIVE'"
      ).all();
    } else {
      targetUsers = await c.env.DB.prepare(
        "SELECT id FROM users WHERE role = 'EMPLOYEE' AND status = 'ACTIVE' AND department = ?"
      ).bind(target).all();
    }

    let pollId = null;
    if (poll) {
      // Create poll
      const pollResult = await c.env.DB.prepare(`
        INSERT INTO polls (question, options, votes, voters)
        VALUES (?, ?, '{}', '{}')
      `).bind(poll.question, JSON.stringify(poll.options)).run();
      pollId = pollResult.meta.last_row_id;

      // Initialize votes for each option
      const votes: Record<string, number> = {};
      poll.options.forEach((_: string, index: number) => {
        votes[index.toString()] = 0;
      });

      await c.env.DB.prepare(
        "UPDATE polls SET votes = ? WHERE id = ?"
      ).bind(JSON.stringify(votes), pollId).run();
    }

    // Send message to each target user
    for (const targetUser of (targetUsers.results || [])) {
      const targetUserId = (targetUser as any).id;

      // Find or create conversation
      let conversation = await c.env.DB.prepare(`
        SELECT c.id FROM conversations c
        JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ?
        JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = ?
      `).bind(userId, targetUserId).first();

      if (!conversation) {
        // Create new conversation
        const newConv = await c.env.DB.prepare(
          "INSERT INTO conversations (created_at, updated_at) VALUES (CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)"
        ).run();

        const conversationId = newConv.meta.last_row_id;

        await c.env.DB.prepare(
          "INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)"
        ).bind(conversationId, userId, conversationId, targetUserId).run();

        conversation = { id: conversationId };
      }

      // Send broadcast message (ensure pollId is null if not provided)
      await c.env.DB.prepare(`
        INSERT INTO messages (conversation_id, sender_id, text, is_broadcast, poll_id, created_at, updated_at)
        VALUES (?, ?, ?, TRUE, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      `).bind(conversation.id, userId, message, pollId ?? null).run();

      // Update conversation timestamp
      await c.env.DB.prepare(
        "UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      ).bind(conversation.id).run();
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Error sending broadcast:', error);
    return c.json({ error: 'Failed to send broadcast' }, 500);
  }
});

// Get departments for broadcast targeting
app.get("/api/chat/departments", authMiddleware, async (c) => {
  try {
    const departments = await c.env.DB.prepare(
      "SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department != '' ORDER BY department"
    ).all();

    return c.json((departments.results || []).map((d: any) => d.department));
  } catch (error) {
    console.error('Error getting departments:', error);
    return c.json({ error: 'Failed to get departments' }, 500);
  }
});

// Get polls
app.get("/api/chat/polls", authMiddleware, async (c) => {
  try {
    const polls = await c.env.DB.prepare("SELECT * FROM polls").all();

    const pollsWithParsedData = (polls.results || []).map((poll: any) => ({
      ...poll,
      options: JSON.parse(poll.options || '[]'),
      votes: JSON.parse(poll.votes || '{}'),
      voters: JSON.parse(poll.voters || '{}'),
    }));

    return c.json(pollsWithParsedData);
  } catch (error) {
    console.error('Error getting polls:', error);
    return c.json({ error: 'Failed to get polls' }, 500);
  }
});

// Vote on poll
app.post("/api/chat/polls/:id/vote", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const pollId = parseInt(c.req.param('id'));
    const { option_index } = await c.req.json();
    
    const userProfile = await c.env.DB.prepare(
      "SELECT id FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser!.id).first();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const userId = (userProfile as any).id as number;

    // Get poll
    const poll = await c.env.DB.prepare("SELECT * FROM polls WHERE id = ?").bind(pollId).first();
    if (!poll) {
      return c.json({ error: 'Poll not found' }, 404);
    }

    const votes = JSON.parse((poll as any).votes || '{}');
    const voters = JSON.parse((poll as any).voters || '{}');

    // Check if user already voted
    if (voters[userId.toString()]) {
      return c.json({ error: 'Already voted' }, 400);
    }

    // Add vote
    votes[option_index.toString()] = (votes[option_index.toString()] || 0) + 1;
    voters[userId.toString()] = option_index;

    // Update poll
    await c.env.DB.prepare(
      "UPDATE polls SET votes = ?, voters = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    ).bind(JSON.stringify(votes), JSON.stringify(voters), pollId).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Error voting on poll:', error);
    return c.json({ error: 'Failed to vote on poll' }, 500);
  }
});

// File upload endpoint
app.post('/api/upload', authMiddleware, rateLimiter(RateLimits.UPLOAD), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    if (!mochaUser) {
      return c.json({ error: 'User not authenticated' }, 401);
    }
    
    // Check if user has profile
    const userProfile = await c.env.DB.prepare(
      "SELECT id, role FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Parse form data
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'uploads';

    if (!file) {
      return c.json({ error: 'No file provided' }, 400);
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser.id,
        details: { reason: 'File too large', size: file.size }
      });
      return c.json({ error: 'File size exceeds 10MB limit' }, 400);
    }

    // Validate file extension
    const allowedExtensions = ['pdf', 'doc', 'docx', 'jpg', 'jpeg', 'png', 'gif', 'xlsx', 'xls', 'txt'];
    const fileExtension = file.name.split('.').pop()?.toLowerCase();
    
    if (!fileExtension || !allowedExtensions.includes(fileExtension)) {
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser.id,
        details: { reason: 'Invalid file type', extension: fileExtension }
      });
      return c.json({ error: 'File type not allowed' }, 400);
    }

    // Sanitize folder name
    const cleanFolder = validator.sanitizeString(folder, 50) || 'uploads';

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 15);
    const filename = `${cleanFolder}/${timestamp}_${randomString}.${fileExtension}`;

    // Upload to R2 bucket
    const arrayBuffer = await file.arrayBuffer();
    await c.env.R2_BUCKET.put(filename, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        contentDisposition: `attachment; filename="${file.name}"`,
      },
    });

    // Generate internal URL that points to our file serving endpoint
    const publicUrl = `/api/files/${filename}`;

    return c.json({ 
      success: true, 
      url: publicUrl,
      filename: filename,
      originalName: file.name,
      size: file.size,
      type: file.type
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return c.json({ error: 'Failed to upload file' }, 500);
  }
});

// File serving endpoint - Public access for resume files, authenticated for others
app.get('/api/files/*', async (c) => {
  try {
    const filepath = c.req.path.replace('/api/files/', '');
    
    if (!filepath) {
      return c.json({ error: 'File path required' }, 400);
    }

    // For non-resume files, require authentication
    if (!filepath.startsWith('resumes/')) {
      // Apply auth middleware manually for non-resume files
      try {
        await authMiddleware(c, async () => {});
      } catch (authError) {
        return c.json({ error: 'Unauthorized' }, 401);
      }
    }

    // Get file from R2 bucket
    const object = await c.env.R2_BUCKET.get(filepath);
    
    if (!object) {
      return c.json({ error: 'File not found' }, 404);
    }

    // Get file data
    const arrayBuffer = await object.arrayBuffer();
    
    // Set appropriate headers
    const headers = new Headers();
    
    if (object.httpMetadata?.contentType) {
      headers.set('Content-Type', object.httpMetadata.contentType);
    }
    
    if (object.httpMetadata?.contentDisposition) {
      headers.set('Content-Disposition', object.httpMetadata.contentDisposition);
    }

    // Set cache headers for better performance
    headers.set('Cache-Control', 'public, max-age=3600');
    
    return new Response(arrayBuffer, {
      headers
    });
  } catch (error) {
    console.error('Error serving file:', error);
    return c.json({ error: 'Failed to serve file' }, 500);
  }
});

// Get payslips (user's own or all for HR)
app.get("/api/payslips", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role, hr_permissions')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    let payslipsData;
    if (userProfile.role === 'HR' && hasPermission(userProfile as any, PERMISSIONS.PAYSLIP_VIEW_ALL)) {
      // HR can see all payslips
      const { data: allPayslips, error: payErr } = await db
        .from('payslips')
        .select(`
          *,
          user:users (first_name, last_name),
          uploaded_by:users!payslips_uploaded_by_id_fkey (first_name, last_name)
        `)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .order('created_at', { ascending: false });

      if (payErr) throw payErr;
      payslipsData = allPayslips;
    } else {
      // Regular employees can only see their own payslips
      const { data: ownPayslips, error: payErr } = await db
        .from('payslips')
        .select(`
          *,
          uploaded_by:users!payslips_uploaded_by_id_fkey (first_name, last_name)
        `)
        .eq('user_id', userProfile.id)
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .order('created_at', { ascending: false });

      if (payErr) throw payErr;
      payslipsData = ownPayslips;
    }

    // Format response with flattened employee names
    const formattedPayslips = (payslipsData || []).map(p => ({
      ...p,
      employee_name: p.user ? `${p.user.first_name || ''} ${p.user.last_name || ''}`.trim() : null,
      uploaded_by_name: p.uploaded_by ? `${p.uploaded_by.first_name || ''} ${p.uploaded_by.last_name || ''}`.trim() : null
    }));

    return c.json(formattedPayslips);
  } catch (error) {
    console.error('Error getting payslips:', error);
    return c.json({ error: 'Failed to get payslips' }, 500);
  }
});

// Batch upload payslips (HR only)
app.post("/api/payslips/batch-upload", authMiddleware, requirePermission(PERMISSIONS.PAYSLIP_UPLOAD), rateLimiter(RateLimits.UPLOAD), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const uploadedById = userProfile.id;

    const formData = await c.req.formData();
    const rawMonth = formData.get('month') as string;
    const rawYear = formData.get('year') as string;
    const files = formData.getAll('file') as File[];

    // Validate inputs
    const month = validator.validateMonth(rawMonth);
    const year = validator.validateYear(rawYear);

    if (!month || !year || !files || files.length === 0) {
      logSecurityEvent({
        ...createSecurityContext(c),
        type: SecurityEventType.INVALID_INPUT,
        userId: mochaUser!.id,
        details: { month: rawMonth, year: rawYear, fileCount: files?.length }
      });
      return c.json({ error: 'Month, year, and at least one file are required' }, 400);
    }

    logSecurityEvent({
      ...createSecurityContext(c),
      type: SecurityEventType.BULK_OPERATION,
      userId: mochaUser!.id,
      details: { action: 'batch_payslip_upload', fileCount: files.length, month, year }
    });

    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];

    let importedCount = 0;
    let skippedCount = 0;
    const errors: { filename: string; reason: string }[] = [];

    for (const file of files) {
      const originalFilename = file.name;
      try {
        // 1. Extraer cédula del nombre del archivo (asumiendo CEDULA.pdf o CEDULA_*.pdf)
        const ciMatch = originalFilename.match(/^(\d+)/);
        if (!ciMatch || !ciMatch[1]) {
          errors.push({ 
            filename: originalFilename, 
            reason: 'Cédula no encontrada en el nombre del archivo. Formato esperado: CEDULA.pdf' 
          });
          continue;
        }
        const employeeCi = ciMatch[1];

        // 2. Buscar empleado por cédula
        const { data: employee, error: empErr } = await db
          .from('users')
          .select('id, first_name, last_name')
          .eq('ci', employeeCi)
          .eq('status', 'ACTIVE')
          .single();

        if (!employee || empErr) {
          errors.push({
            filename: originalFilename,
            reason: `Empleado con cédula ${employeeCi} no encontrado o inactivo.`
          });
          continue;
        }

        const employeeId = employee.id;
        const employeeName = `${employee.first_name} ${employee.last_name}`;

        // 3. Verificar si ya existe un recibo para este empleado, mes y año
        const { data: existingPayslip, error: existErr } = await db
          .from('payslips')
          .select('id')
          .eq('user_id', employeeId)
          .eq('month', month)
          .eq('year', year)
          .single();

        if (existingPayslip && !existErr) {
          skippedCount++;
          errors.push({
            filename: originalFilename,
            reason: `Ya existe un recibo para ${employeeName} (${employeeCi}) para ${months[month - 1]} ${year}.`
          });
          continue;
        }

        // 4. Subir archivo a R2
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 15);
        const fileExtension = originalFilename.split('.').pop();
        const filenameInR2 = `payslips/${year}/${month}/${employeeId}_${employeeCi}_${timestamp}_${randomString}.${fileExtension}`;

        const arrayBuffer = await file.arrayBuffer();
        await c.env.R2_BUCKET.put(filenameInR2, arrayBuffer, {
          httpMetadata: {
            contentType: file.type,
            contentDisposition: `attachment; filename="${originalFilename}"`,
          },
        });
        const fileUrl = `/api/files/${filenameInR2}`;

        // 5. Crear registro en payslips
        const title = `Recibo de Pago ${months[month - 1]} ${year} - ${employeeName}`;
        const { error: insertErr } = await db
          .from('payslips')
          .insert({
            user_id: employeeId,
            month,
            year,
            title,
            file_url: fileUrl,
            uploaded_by_id: uploadedById,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertErr) throw insertErr;

        importedCount++;
      } catch (fileError) {
        console.error(`Error processing file ${originalFilename}:`, fileError);
        errors.push({ 
          filename: originalFilename, 
          reason: `Error interno: ${fileError instanceof Error ? fileError.message : String(fileError)}` 
        });
      }
    }

    return c.json({
      success: importedCount > 0,
      importedCount,
      skippedCount,
      errors
    });

  } catch (error) {
    console.error('Error during batch payslip upload:', error);
    return c.json({ 
      error: `Failed to process batch upload: ${error instanceof Error ? error.message : 'Unknown error'}` 
    }, 500);
  }
});

// Create payslip (HR only)
app.post("/api/payslips", authMiddleware, requirePermission(PERMISSIONS.PAYSLIP_UPLOAD), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;

    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const { user_id, month, year, title, file_url } = await c.req.json();

    // Validate required fields
    if (!user_id || !month || !year || !file_url) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Validate month and year
    if (month < 1 || month > 12) {
      return c.json({ error: 'Invalid month' }, 400);
    }

    // Check if payslip already exists
    const { data: existing, error: existErr } = await db
      .from('payslips')
      .select('id')
      .eq('user_id', user_id)
      .eq('month', month)
      .eq('year', year)
      .single();

    if (existing) {
      return c.json({ error: 'Ya existe un recibo para este empleado en este período' }, 400);
    }

    // Generate title if not provided
    const months = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    const finalTitle = title || `Recibo de Pago ${months[month - 1]} ${year}`;

    // Create payslip
    const { data: payslip, error: insertErr } = await db
      .from('payslips')
      .insert({
        user_id,
        month,
        year,
        title: finalTitle,
        file_url,
        uploaded_by_id: userProfile.id,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select(`
        *,
        user:users (first_name, last_name),
        uploaded_by:users!payslips_uploaded_by_id_fkey (first_name, last_name)
      `)
      .single();

    if (insertErr) throw insertErr;

    // Format response
    const response = {
      ...payslip,
      employee_name: payslip.user ? `${payslip.user.first_name || ''} ${payslip.user.last_name || ''}`.trim() : null,
      uploaded_by_name: payslip.uploaded_by ? `${payslip.uploaded_by.first_name || ''} ${payslip.uploaded_by.last_name || ''}`.trim() : null
    };

    return c.json(response);
  } catch (error) {
    console.error('Error creating payslip:', error);
    return c.json({ error: 'Failed to create payslip' }, 500);
  }
});

// Delete payslip (HR only)
app.delete("/api/payslips/:id", authMiddleware, requirePermission(PERMISSIONS.PAYSLIP_DELETE), async (c) => {
  try {
    const payslipId = parseInt(c.req.param('id'));

    // Get payslip to verify existence
    const { data: payslip, error: selectErr } = await db
      .from('payslips')
      .select('file_url')
      .eq('id', payslipId)
      .single();

    if (!payslip || selectErr) {
      return c.json({ error: 'Payslip not found' }, 404);
    }

    // Delete payslip record
    const { error: deleteErr } = await db
      .from('payslips')
      .delete()
      .eq('id', payslipId);

    if (deleteErr) throw deleteErr;

    // Optionally delete file from R2
    // const filename = payslip.file_url.replace('/api/files/', '');
    // await c.env.R2_BUCKET.delete(filename);

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting payslip:', error);
    return c.json({ error: 'Failed to delete payslip' }, 500);
  }
});

// Get request reports with filters (HR only)
app.get("/api/reports/requests", authMiddleware, requirePermission(PERMISSIONS.REQUEST_VIEW_ALL), async (c) => {
  try {
    const status = c.req.query('status');
    const category = c.req.query('category');
    const type = c.req.query('type');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    let query = db
      .from('requests')
      .select(`
        *,
        user:users (first_name, last_name, email, department)
      `);

    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (type) {
      query = query.ilike('type', `%${type}%`);
    }
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate + 'T23:59:59');
    }

    const { data: requests, error: reqErr } = await query.order('created_at', { ascending: false });

    if (reqErr) throw reqErr;

    // Format response with flattened user data
    const formattedRequests = (requests || []).map(r => ({
      ...r,
      first_name: r.user?.first_name,
      last_name: r.user?.last_name,
      email: r.user?.email,
      department: r.user?.department
    }));

    return c.json(formattedRequests);
  } catch (error) {
    console.error('Error generating requests report:', error);
    return c.json({ error: 'Failed to generate requests report' }, 500);
  }
});

// Export request report to CSV (HR only)
app.get("/api/reports/requests/export-csv", authMiddleware, requirePermission(PERMISSIONS.REQUEST_VIEW_ALL), async (c) => {
  try {
    const status = c.req.query('status');
    const category = c.req.query('category');
    const type = c.req.query('type');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    let query = `
      SELECT r.*, u.first_name, u.last_name, u.email, u.department
      FROM requests r
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (status) {
      query += " AND r.status = ?";
      params.push(status);
    }
    if (category) {
      query += " AND r.category = ?";
      params.push(category);
    }
    if (type) {
      query += " AND r.type LIKE ?";
      params.push(`%${type}%`);
    }
    if (startDate) {
      query += " AND r.created_at >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND r.created_at <= ?";
      params.push(endDate + ' 23:59:59');
    }

    query += " ORDER BY r.created_at DESC";

    const requests = await c.env.DB.prepare(query).bind(...params).all();

    if (!requests.results || requests.results.length === 0) {
      return c.json({ error: 'No se encontraron solicitudes para exportar' }, 404);
    }

    // Helper function to get readable status text
    const getStatusText = (status: string) => {
      switch (status) {
        case 'PENDING': return 'Pendiente';
        case 'APPROVED': return 'Aprobada';
        case 'REJECTED': return 'Rechazada';
        default: return status;
      }
    };

    // CSV Headers
    const headers = [
      "ID", "Solicitante", "Email", "Departamento", "Tipo", "Categoría", 
      "Detalles", "Estado", "Fecha Creación", "Fecha Actualización"
    ].join(',');

    // CSV Rows
    const csvRows = requests.results.map((request: any) => {
      const row = [
        request.id,
        `${request.first_name} ${request.last_name}`,
        request.email,
        request.department || '',
        request.type,
        request.category,
        request.details?.replace(/"/g, '""') || '', // Escape double quotes
        getStatusText(request.status),
        request.created_at,
        request.updated_at
      ];
      return row.map(field => `"${field || ''}"`).join(',');
    }).join('\n');

    const csvContent = `${headers}\n${csvRows}`;

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reporte_solicitudes_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting requests to CSV:', error);
    return c.json({ error: 'Failed to export requests report to CSV' }, 500);
  }
});

// Export request report to PDF (HR only)
app.get("/api/reports/requests/export-pdf", authMiddleware, requirePermission(PERMISSIONS.REQUEST_VIEW_ALL), async (c) => {
  try {
    const status = c.req.query('status');
    const category = c.req.query('category');
    const type = c.req.query('type');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    let query = `
      SELECT r.*, u.first_name, u.last_name, u.email, u.department
      FROM requests r
      JOIN users u ON r.user_id = u.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (status) {
      query += " AND r.status = ?";
      params.push(status);
    }
    if (category) {
      query += " AND r.category = ?";
      params.push(category);
    }
    if (type) {
      query += " AND r.type LIKE ?";
      params.push(`%${type}%`);
    }
    if (startDate) {
      query += " AND r.created_at >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND r.created_at <= ?";
      params.push(endDate + ' 23:59:59');
    }

    query += " ORDER BY r.created_at DESC";

    const requests = await c.env.DB.prepare(query).bind(...params).all();

    if (!requests.results || requests.results.length === 0) {
      return c.json({ error: 'No se encontraron solicitudes para exportar' }, 404);
    }

    // Helper function to get readable status text
    const getStatusText = (status: string) => {
      switch (status) {
        case 'PENDING': return 'Pendiente';
        case 'APPROVED': return 'Aprobada';
        case 'REJECTED': return 'Rechazada';
        default: return status;
      }
    };

    // Import jsPDF dynamically
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Title
    doc.setFontSize(16);
    doc.text('Reporte de Solicitudes', 14, 15);

    // Report details
    doc.setFontSize(10);
    let yPos = 25;
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, 14, yPos);
    yPos += 6;
    doc.text(`Total de solicitudes: ${requests.results.length}`, 14, yPos);
    yPos += 10;

    // Table data
    const tableData = requests.results.map((request: any) => [
      request.id.toString(),
      `${request.first_name} ${request.last_name}`,
      request.type,
      request.category,
      (request.details || '').substring(0, 50) + (request.details && request.details.length > 50 ? '...' : ''),
      getStatusText(request.status),
      new Date(request.created_at).toLocaleDateString('es-ES')
    ]);

    // Generate table using autoTable plugin
    (doc as any).autoTable({
      startY: yPos,
      head: [['ID', 'Solicitante', 'Tipo', 'Categoría', 'Detalles', 'Estado', 'Fecha']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 10 },
      theme: 'striped'
    });

    // Generate PDF as ArrayBuffer
    const pdfBuffer = doc.output('arraybuffer');

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte_solicitudes_${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error exporting requests to PDF:', error);
    return c.json({ error: 'Failed to export requests report to PDF' }, 500);
  }
});

// Get loan reports with filters (HR only)
app.get("/api/reports/loans", authMiddleware, requirePermission(PERMISSIONS.LOAN_VIEW_ALL), async (c) => {
  try {
    const status = c.req.query('status');
    const category = c.req.query('category');
    const employeeId = c.req.query('employee_id');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    let query = db
      .from('loans')
      .select(`
        *,
        user:users (first_name, last_name, email),
        payments:loan_payments (amount_paid)
      `);

    if (status) {
      query = query.eq('status', status);
    }
    if (category) {
      query = query.eq('category', category);
    }
    if (employeeId) {
      query = query.eq('user_id', parseInt(employeeId));
    }
    if (startDate) {
      query = query.gte('issue_date', startDate);
    }
    if (endDate) {
      query = query.lte('issue_date', endDate);
    }

    const { data: loans, error: loansErr } = await query.order('created_at', { ascending: false });

    if (loansErr) throw loansErr;

    // Format response with calculated fields
    const formattedLoans = (loans || []).map(l => {
      const totalPaid = (l.payments || []).reduce((sum, p) => sum + (p.amount_paid || 0), 0);
      return {
        ...l,
        employee_name: `${l.user?.first_name || ''} ${l.user?.last_name || ''}`.trim(),
        employee_email: l.user?.email,
        total_paid: totalPaid,
        pending_amount: l.principal_amount - totalPaid
      };
    });

    return c.json(formattedLoans);
  } catch (error) {
    console.error('Error generating loans report:', error);
    return c.json({ error: 'Failed to generate loans report' }, 500);
  }
});

// Export loan report to CSV (HR only)
app.get("/api/reports/loans/export-csv", authMiddleware, requirePermission(PERMISSIONS.LOAN_VIEW_ALL), async (c) => {
  try {
    const status = c.req.query('status');
    const category = c.req.query('category');
    const employeeId = c.req.query('employee_id');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    let query = `
      SELECT l.*, 
             u.first_name || ' ' || u.last_name as employee_name,
             u.email as employee_email,
             u.ci as employee_ci,
             (SELECT SUM(amount_paid) FROM loan_payments WHERE loan_id = l.id) as total_paid,
             (l.principal_amount - COALESCE((SELECT SUM(amount_paid) FROM loan_payments WHERE loan_id = l.id), 0)) as pending_amount
      FROM loans l
      JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (status) {
      query += " AND l.status = ?";
      params.push(status);
    }
    if (category) {
      query += " AND l.category = ?";
      params.push(category);
    }
    if (employeeId) {
      query += " AND l.user_id = ?";
      params.push(parseInt(employeeId));
    }
    if (startDate) {
      query += " AND l.issue_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND l.issue_date <= ?";
      params.push(endDate);
    }

    query += " ORDER BY l.created_at DESC";

    const loans = await c.env.DB.prepare(query).bind(...params).all();

    if (!loans.results || loans.results.length === 0) {
      return c.json({ error: 'No se encontraron préstamos para exportar' }, 404);
    }

    // Helper function to get readable status text
    const getStatusText = (status: string) => {
      switch (status) {
        case 'ACTIVE': return 'Activo';
        case 'PAID_OFF': return 'Pagado';
        case 'CANCELLED': return 'Cancelado';
        default: return status;
      }
    };

    // CSV Headers
    const headers = [
      "ID", "Empleado", "CI", "Email", "Categoría", "Monto Original", 
      "Saldo Pendiente", "Total Pagado", "Cuota Mensual", "Cuotas Totales", 
      "Cuotas Restantes", "Estado", "Fecha Emisión"
    ].join(',');

    // CSV Rows
    const csvRows = loans.results.map((loan: any) => {
      const row = [
        loan.id,
        loan.employee_name || '',
        loan.employee_ci || '',
        loan.employee_email || '',
        loan.category,
        loan.principal_amount,
        loan.pending_amount || 0,
        loan.total_paid || 0,
        loan.monthly_installment,
        loan.total_installments,
        loan.remaining_installments,
        getStatusText(loan.status),
        loan.issue_date
      ];
      return row.map(field => `"${field || ''}"`).join(',');
    }).join('\n');

    const csvContent = `${headers}\n${csvRows}`;

    return new Response(csvContent, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="reporte_prestamos_${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting loans to CSV:', error);
    return c.json({ error: 'Failed to export loans report to CSV' }, 500);
  }
});

// Export loan report to PDF (HR only)
app.get("/api/reports/loans/export-pdf", authMiddleware, requirePermission(PERMISSIONS.LOAN_VIEW_ALL), async (c) => {
  try {
    const status = c.req.query('status');
    const category = c.req.query('category');
    const employeeId = c.req.query('employee_id');
    const startDate = c.req.query('start_date');
    const endDate = c.req.query('end_date');

    let query = `
      SELECT l.*, 
             u.first_name || ' ' || u.last_name as employee_name,
             (SELECT SUM(amount_paid) FROM loan_payments WHERE loan_id = l.id) as total_paid,
             (l.principal_amount - COALESCE((SELECT SUM(amount_paid) FROM loan_payments WHERE loan_id = l.id), 0)) as pending_amount
      FROM loans l
      JOIN users u ON l.user_id = u.id
      WHERE 1=1
    `;
    const params: (string | number)[] = [];

    if (status) {
      query += " AND l.status = ?";
      params.push(status);
    }
    if (category) {
      query += " AND l.category = ?";
      params.push(category);
    }
    if (employeeId) {
      query += " AND l.user_id = ?";
      params.push(parseInt(employeeId));
    }
    if (startDate) {
      query += " AND l.issue_date >= ?";
      params.push(startDate);
    }
    if (endDate) {
      query += " AND l.issue_date <= ?";
      params.push(endDate);
    }

    query += " ORDER BY l.created_at DESC";

    const loans = await c.env.DB.prepare(query).bind(...params).all();

    if (!loans.results || loans.results.length === 0) {
      return c.json({ error: 'No se encontraron préstamos para exportar' }, 404);
    }

    // Helper function to get readable status text
    const getStatusText = (status: string) => {
      switch (status) {
        case 'ACTIVE': return 'Activo';
        case 'PAID_OFF': return 'Pagado';
        case 'CANCELLED': return 'Cancelado';
        default: return status;
      }
    };

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
      }).format(amount);
    };

    // Import jsPDF dynamically
    const { jsPDF } = await import('jspdf');
    await import('jspdf-autotable');

    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Title
    doc.setFontSize(16);
    doc.text('Reporte de Préstamos', 14, 15);

    // Report details
    doc.setFontSize(10);
    let yPos = 25;
    doc.text(`Fecha de generación: ${new Date().toLocaleDateString('es-ES')}`, 14, yPos);
    yPos += 6;
    doc.text(`Total de préstamos: ${loans.results.length}`, 14, yPos);
    yPos += 10;

    // Table data
    const tableData = loans.results.map((loan: any) => [
      loan.id.toString(),
      loan.employee_name || '',
      loan.category,
      formatCurrency(loan.principal_amount),
      formatCurrency(loan.pending_amount || 0),
      formatCurrency(loan.monthly_installment),
      `${loan.remaining_installments}/${loan.total_installments}`,
      getStatusText(loan.status),
      new Date(loan.issue_date).toLocaleDateString('es-ES')
    ]);

    // Generate table using autoTable plugin
    (doc as any).autoTable({
      startY: yPos,
      head: [['ID', 'Empleado', 'Categoría', 'Monto Original', 'Saldo Pendiente', 'Cuota Mensual', 'Cuotas', 'Estado', 'Fecha Emisión']],
      body: tableData,
      styles: { fontSize: 8, cellPadding: 2 },
      headStyles: { fillColor: [37, 99, 235], textColor: 255 },
      alternateRowStyles: { fillColor: [245, 245, 245] },
      margin: { top: 10 },
      theme: 'striped'
    });

    // Generate PDF as ArrayBuffer
    const pdfBuffer = doc.output('arraybuffer');

    return new Response(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="reporte_prestamos_${new Date().toISOString().split('T')[0]}.pdf"`
      }
    });
  } catch (error) {
    console.error('Error exporting loans to PDF:', error);
    return c.json({ error: 'Failed to export loans report to PDF' }, 500);
  }
});

// Get request response time reports (HR only)
app.get("/api/reports/request-response-times", authMiddleware, requirePermission(PERMISSIONS.REQUEST_VIEW_REPORTS), async (c) => {
  try {
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');
    const requestType = c.req.query('type');
    const requestCategory = c.req.query('category');
    const resolvedById = c.req.query('resolved_by_id');

    // Query for completed requests
    let query = db
      .from('requests')
      .select(`
        *,
        user:users (first_name, last_name, email),
        resolver:users!requests_resolved_by_id_fkey (first_name, last_name)
      `)
      .in('status', ['APPROVED', 'REJECTED']);

    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate + 'T23:59:59');
    }
    if (requestType) {
      query = query.eq('type', requestType);
    }
    if (requestCategory) {
      query = query.eq('category', requestCategory);
    }
    if (resolvedById) {
      query = query.eq('resolved_by_id', parseInt(resolvedById));
    }

    const { data: requests, error: reqErr } = await query.order('updated_at', { ascending: false });

    if (reqErr) throw reqErr;

    // Calculate metrics in application
    const requestData = (requests || []).map(r => ({
      ...r,
      employee_name: `${r.user?.first_name || ''} ${r.user?.last_name || ''}`.trim(),
      employee_email: r.user?.email,
      resolver_name: r.resolver ? `${r.resolver.first_name || ''} ${r.resolver.last_name || ''}`.trim() : null,
      response_time_minutes: r.updated_at && r.created_at
        ? Math.floor((new Date(r.updated_at).getTime() - new Date(r.created_at).getTime()) / (1000 * 60))
        : 0
    }));

    // Overall metrics
    const totalRequests = requestData.length;
    const avgResponseTime = totalRequests > 0
      ? requestData.reduce((sum: number, r: any) => sum + r.response_time_minutes, 0) / totalRequests
      : 0;

    const approvedCount = requestData.filter((r: any) => r.status === 'APPROVED').length;
    const rejectedCount = requestData.filter((r: any) => r.status === 'REJECTED').length;
    const approvalRate = totalRequests > 0 ? (approvedCount / totalRequests) * 100 : 0;

    // By resolver
    const byResolver: Record<string, any> = {};
    requestData.forEach((r: any) => {
      if (r.resolved_by_id) {
        if (!byResolver[r.resolved_by_id]) {
          byResolver[r.resolved_by_id] = {
            resolver_id: r.resolved_by_id,
            resolver_name: r.resolver_name,
            total_requests: 0,
            approved_count: 0,
            rejected_count: 0,
            total_response_time: 0,
            avg_response_time: 0,
            approval_rate: 0
          };
        }

        byResolver[r.resolved_by_id].total_requests++;
        byResolver[r.resolved_by_id].total_response_time += r.response_time_minutes;

        if (r.status === 'APPROVED') {
          byResolver[r.resolved_by_id].approved_count++;
        } else if (r.status === 'REJECTED') {
          byResolver[r.resolved_by_id].rejected_count++;
        }
      }
    });

    // Calculate averages
    Object.values(byResolver).forEach((resolver: any) => {
      resolver.avg_response_time = Math.round(resolver.total_response_time / resolver.total_requests);
      resolver.approval_rate = Math.round((resolver.approved_count / resolver.total_requests) * 100 * 10) / 10;
    });

    // By category
    const byCategory: Record<string, any> = {};
    requestData.forEach((r: any) => {
      if (!byCategory[r.category]) {
        byCategory[r.category] = {
          category: r.category,
          total_requests: 0,
          avg_response_time: 0,
          total_response_time: 0
        };
      }

      byCategory[r.category].total_requests++;
      byCategory[r.category].total_response_time += r.response_time_minutes;
    });

    Object.values(byCategory).forEach((cat: any) => {
      cat.avg_response_time = Math.round(cat.total_response_time / cat.total_requests);
    });

    // By type
    const byType: Record<string, any> = {};
    requestData.forEach((r: any) => {
      if (!byType[r.type]) {
        byType[r.type] = {
          type: r.type,
          total_requests: 0,
          avg_response_time: 0,
          total_response_time: 0
        };
      }

      byType[r.type].total_requests++;
      byType[r.type].total_response_time += r.response_time_minutes;
    });

    Object.values(byType).forEach((t: any) => {
      t.avg_response_time = Math.round(t.total_response_time / t.total_requests);
    });

    // Top 10 slowest and fastest
    const sortedByTime = [...requestData].sort((a: any, b: any) => b.response_time_minutes - a.response_time_minutes);
    const slowestRequests = sortedByTime.slice(0, 10);
    const fastestRequests = sortedByTime.slice(-10).reverse();

    return c.json({
      summary: {
        total_requests: totalRequests,
        avg_response_time_minutes: Math.round(avgResponseTime),
        approved_count: approvedCount,
        rejected_count: rejectedCount,
        approval_rate: Math.round(approvalRate * 10) / 10
      },
      by_resolver: Object.values(byResolver).sort((a: any, b: any) => b.total_requests - a.total_requests),
      by_category: Object.values(byCategory).sort((a: any, b: any) => b.total_requests - a.total_requests),
      by_type: Object.values(byType).sort((a: any, b: any) => b.total_requests - a.total_requests),
      slowest_requests: slowestRequests,
      fastest_requests: fastestRequests,
      all_requests: requestData
    });
  } catch (error) {
    console.error('Error getting request response time reports:', error);
    return c.json({ error: 'Failed to get reports' }, 500);
  }
});

// Get audit log (HR only)
app.get("/api/audit-log", authMiddleware, requirePermission(PERMISSIONS.EMPLOYEE_AUDIT_LOG), async (c) => {
  try {
    const page = parseInt(c.req.query('page') || '1');
    const limit = parseInt(c.req.query('limit') || '50');
    const offset = (page - 1) * limit;

    const module = c.req.query('module');
    const actionType = c.req.query('action_type');
    const userEmail = c.req.query('user_email');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    let query = "SELECT * FROM audit_log WHERE 1=1";
    const params: any[] = [];

    if (module) {
      query += " AND module = ?";
      params.push(module);
    }

    if (actionType) {
      query += " AND action_type = ?";
      params.push(actionType);
    }

    if (userEmail) {
      query += " AND user_email LIKE ?";
      params.push(`%${userEmail}%`);
    }

    if (startDate) {
      query += " AND created_at >= ?";
      params.push(startDate);
    }

    if (endDate) {
      query += " AND created_at <= ?";
      params.push(endDate + ' 23:59:59');
    }

    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);

    const logs = await c.env.DB.prepare(query).bind(...params).all();

    // Get total count for pagination
    let countQuery = "SELECT COUNT(*) as total FROM audit_log WHERE 1=1";
    const countParams: any[] = [];

    if (module) {
      countQuery += " AND module = ?";
      countParams.push(module);
    }

    if (actionType) {
      countQuery += " AND action_type = ?";
      countParams.push(actionType);
    }

    if (userEmail) {
      countQuery += " AND user_email LIKE ?";
      countParams.push(`%${userEmail}%`);
    }

    if (startDate) {
      countQuery += " AND created_at >= ?";
      countParams.push(startDate);
    }

    if (endDate) {
      countQuery += " AND created_at <= ?";
      countParams.push(endDate + ' 23:59:59');
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(...countParams).first();
    const total = (countResult as any)?.total || 0;
    const totalPages = Math.ceil(total / limit);

    return c.json({
      logs: logs.results || [],
      page,
      totalPages,
      total
    });
  } catch (error) {
    console.error('Error getting audit log:', error);
    return c.json({ error: 'Failed to get audit log' }, 500);
  }
});

// Export audit log (HR only)
app.get("/api/audit-log/export", authMiddleware, requirePermission(PERMISSIONS.EMPLOYEE_AUDIT_LOG), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    
    const userProfile = await c.env.DB.prepare(
      "SELECT id, email FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Log export action
    await auditLog(
      c.env.DB,
      c,
      (userProfile as any).id,
      (userProfile as any).email,
      AuditAction.EXPORT,
      AuditModule.SESSION,
      'audit_log',
      undefined,
      { exportType: 'csv' }
    );

    const module = c.req.query('module');
    const actionType = c.req.query('action_type');
    const userEmail = c.req.query('user_email');
    const startDate = c.req.query('startDate');
    const endDate = c.req.query('endDate');

    let query = "SELECT * FROM audit_log WHERE 1=1";
    const params: any[] = [];

    if (module) {
      query += " AND module = ?";
      params.push(module);
    }

    if (actionType) {
      query += " AND action_type = ?";
      params.push(actionType);
    }

    if (userEmail) {
      query += " AND user_email LIKE ?";
      params.push(`%${userEmail}%`);
    }

    if (startDate) {
      query += " AND created_at >= ?";
      params.push(startDate);
    }

    if (endDate) {
      query += " AND created_at <= ?";
      params.push(endDate + ' 23:59:59');
    }

    query += " ORDER BY created_at DESC LIMIT 10000";

    const logs = await c.env.DB.prepare(query).bind(...params).all();

    // Generate CSV
    const headers = ['Fecha/Hora', 'Usuario', 'Módulo', 'Acción', 'Tipo Recurso', 'ID Recurso', 'IP', 'Detalles'];
    const rows = (logs.results || []).map((log: any) => [
      log.created_at,
      log.user_email,
      log.module,
      log.action_type,
      log.resource_type || '',
      log.resource_id || '',
      log.ip_address || '',
      log.details || ''
    ]);

    const csv = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="audit-log-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });
  } catch (error) {
    console.error('Error exporting audit log:', error);
    return c.json({ error: 'Failed to export audit log' }, 500);
  }
});

// Get backup history (HR only)
app.get("/api/backups/history", authMiddleware, requirePermission(PERMISSIONS.HR_ADMIN), async (c) => {
  try {
    const backups = await c.env.DB.prepare(
      "SELECT * FROM backup_history ORDER BY created_at DESC LIMIT 100"
    ).all();

    return c.json(backups.results || []);
  } catch (error) {
    console.error('Error getting backup history:', error);
    return c.json({ error: 'Failed to get backup history' }, 500);
  }
});

// Create database backup (HR only)
app.post("/api/backups/create", authMiddleware, requirePermission(PERMISSIONS.HR_ADMIN), rateLimiter(RateLimits.SENSITIVE), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    
    const userProfile = await c.env.DB.prepare(
      "SELECT id, first_name, last_name, email FROM users WHERE mocha_user_id = ?"
    ).bind(mochaUser.id).first();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    const { includeAuditLogs = false, format = 'json' } = await c.req.json();

    // Create backup
    const { data, metadata } = await createDatabaseBackup(c.env.DB, {
      includeAuditLogs,
      format
    });

    const fileSize = new Blob([data]).size;
    const fileName = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}.${format}`;

    // Save to R2
    await c.env.R2_BUCKET.put(`backups/${fileName}`, data, {
      httpMetadata: {
        contentType: format === 'json' ? 'application/json' : 'text/plain',
      },
    });

    const fileUrl = `/api/files/backups/${fileName}`;

    // Record in backup history
    await c.env.DB.prepare(`
      INSERT INTO backup_history (
        backup_type, file_url, file_size, tables_included, row_count,
        status, created_by_id, created_by_name
      ) VALUES (?, ?, ?, ?, ?, 'COMPLETED', ?, ?)
    `).bind(
      format.toUpperCase(),
      fileUrl,
      fileSize,
      JSON.stringify(metadata.tables),
      metadata.totalRows,
      (userProfile as any).id,
      `${(userProfile as any).first_name} ${(userProfile as any).last_name}`
    ).run();

    // Log audit
    await auditLog(
      c.env.DB,
      c,
      (userProfile as any).id,
      (userProfile as any).email,
      AuditAction.CREATE,
      AuditModule.BACKUP,
      'database_backup',
      undefined,
      { format, includeAuditLogs, totalRows: metadata.totalRows, fileSize }
    );

    // Return file for download
    return new Response(data, {
      headers: {
        'Content-Type': format === 'json' ? 'application/json' : 'text/plain',
        'Content-Disposition': `attachment; filename="${fileName}"`
      }
    });
  } catch (error) {
    console.error('Error creating backup:', error);
    return c.json({ error: 'Failed to create backup' }, 500);
  }
});

// Download backup (HR only)
app.get("/api/backups/:id/download", authMiddleware, requirePermission(PERMISSIONS.HR_ADMIN), async (c) => {
  try {
    const backupId = parseInt(c.req.param('id'));
    
    const backup = await c.env.DB.prepare(
      "SELECT * FROM backup_history WHERE id = ?"
    ).bind(backupId).first();

    if (!backup || !backup.file_url) {
      return c.json({ error: 'Backup not found' }, 404);
    }

    const fileName = (backup as any).file_url.replace('/api/files/', '');
    const object = await c.env.R2_BUCKET.get(fileName);

    if (!object) {
      return c.json({ error: 'Backup file not found in storage' }, 404);
    }

    const arrayBuffer = await object.arrayBuffer();

    return new Response(arrayBuffer, {
      headers: {
        'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="backup-${backupId}.json"`
      }
    });
  } catch (error) {
    console.error('Error downloading backup:', error);
    return c.json({ error: 'Failed to download backup' }, 500);
  }
});

// Family dependents endpoints
app.get("/api/family-dependents", authMiddleware, async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const queryUserId = c.req.query('user_id');

    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // If user_id is provided and user is HR, get that user's dependents
    // Otherwise, get current user's dependents
    const targetUserId = queryUserId && userProfile.role === 'HR'
      ? parseInt(queryUserId)
      : userProfile.id;

    const { data: dependents, error: depErr } = await db
      .from('family_dependents')
      .select('*')
      .eq('user_id', targetUserId)
      .order('created_at', { ascending: false });

    if (depErr) throw depErr;

    return c.json(dependents || []);
  } catch (error) {
    console.error('Error getting family dependents:', error);
    return c.json({ error: 'Failed to get family dependents' }, 500);
  }
});

app.post("/api/family-dependents", authMiddleware, rateLimiter(RateLimits.MUTATION), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const { user_id, full_name, relationship, ci, birth_date } = await c.req.json();

    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Validate user can add dependent
    if (user_id !== userProfile.id && userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Validate and sanitize inputs
    const cleanFullName = validator.sanitizeString(full_name, 200);
    const cleanRelationship = validator.validateEnum(relationship, ['Cónyuge', 'Hijo/a']);
    const cleanCI = ci ? validator.validateCI(ci) : null;
    const cleanBirthDate = validator.validateDate(birth_date);

    if (!cleanFullName || !cleanRelationship) {
      return c.json({ error: 'Full name and relationship are required' }, 400);
    }

    const { data: dependent, error: insertErr } = await db
      .from('family_dependents')
      .insert({
        user_id,
        full_name: cleanFullName,
        relationship: cleanRelationship,
        ci: cleanCI,
        birth_date: cleanBirthDate,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('*')
      .single();

    if (insertErr) throw insertErr;

    return c.json(dependent);
  } catch (error) {
    console.error('Error creating family dependent:', error);
    return c.json({ error: 'Failed to create family dependent' }, 500);
  }
});

app.put("/api/family-dependents/:id", authMiddleware, rateLimiter(RateLimits.MUTATION), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const dependentId = parseInt(c.req.param('id'));
    const { full_name, relationship, ci, birth_date } = await c.req.json();

    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Get dependent to check ownership
    const { data: dependent, error: depErr } = await db
      .from('family_dependents')
      .select('user_id')
      .eq('id', dependentId)
      .single();

    if (!dependent || depErr) {
      return c.json({ error: 'Dependent not found' }, 404);
    }

    // Validate user can edit dependent
    if (dependent.user_id !== userProfile.id && userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    // Validate and sanitize inputs
    const cleanFullName = validator.sanitizeString(full_name, 200);
    const cleanRelationship = validator.validateEnum(relationship, ['Cónyuge', 'Hijo/a']);
    const cleanCI = ci ? validator.validateCI(ci) : null;
    const cleanBirthDate = validator.validateDate(birth_date);

    if (!cleanFullName || !cleanRelationship) {
      return c.json({ error: 'Full name and relationship are required' }, 400);
    }

    const { error: updateErr } = await db
      .from('family_dependents')
      .update({
        full_name: cleanFullName,
        relationship: cleanRelationship,
        ci: cleanCI,
        birth_date: cleanBirthDate,
        updated_at: new Date().toISOString()
      })
      .eq('id', dependentId);

    if (updateErr) throw updateErr;

    const { data: updated, error: selectErr } = await db
      .from('family_dependents')
      .select('*')
      .eq('id', dependentId)
      .single();

    if (selectErr) throw selectErr;

    return c.json(updated);
  } catch (error) {
    console.error('Error updating family dependent:', error);
    return c.json({ error: 'Failed to update family dependent' }, 500);
  }
});

app.delete("/api/family-dependents/:id", authMiddleware, rateLimiter(RateLimits.MUTATION), async (c) => {
  try {
    const mochaUser = c.get("user") as MochaUser;
    const dependentId = parseInt(c.req.param('id'));

    const { data: userProfile, error: userErr } = await db
      .from('users')
      .select('id, role')
      .eq('mocha_user_id', mochaUser.id)
      .single();

    if (!userProfile) {
      return c.json({ error: 'User profile not found' }, 404);
    }

    // Get dependent to check ownership
    const { data: dependent, error: depErr } = await db
      .from('family_dependents')
      .select('user_id')
      .eq('id', dependentId)
      .single();

    if (!dependent || depErr) {
      return c.json({ error: 'Dependent not found' }, 404);
    }

    // Validate user can delete dependent
    if (dependent.user_id !== userProfile.id && userProfile.role !== 'HR') {
      return c.json({ error: 'Unauthorized' }, 403);
    }

    const { error: deleteErr } = await db
      .from('family_dependents')
      .delete()
      .eq('id', dependentId);

    if (deleteErr) throw deleteErr;

    return c.json({ success: true });
  } catch (error) {
    console.error('Error deleting family dependent:', error);
    return c.json({ error: 'Failed to delete family dependent' }, 500);
  }
});

// Logout endpoint
app.get('/api/logout', async (c) => {
  try {
    const sessionToken = getCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME);

    // Try to log logout action
    if (typeof sessionToken === 'string') {
      try {
        const userProfile = await c.env.DB.prepare(
          "SELECT u.id, u.email FROM users u JOIN (SELECT mocha_user_id FROM users WHERE mocha_user_id IS NOT NULL LIMIT 1) tmp"
        ).first();
        
        if (userProfile) {
          await auditLog(
            c.env.DB,
            c,
            (userProfile as any).id,
            (userProfile as any).email,
            AuditAction.LOGOUT,
            AuditModule.SESSION
          );
        }
      } catch (err) {
        console.error('Error logging logout audit:', err);
      }

      await deleteSession(sessionToken, {
        apiUrl: c.env.MOCHA_USERS_SERVICE_API_URL,
        apiKey: c.env.MOCHA_USERS_SERVICE_API_KEY,
      });
    }

    setCookie(c, MOCHA_SESSION_TOKEN_COOKIE_NAME, '', {
      httpOnly: true,
      path: '/',
      sameSite: 'none',
      secure: true,
      maxAge: 0,
    });

    return c.json({ success: true }, 200);
  } catch (error) {
    console.error('Error during logout:', error);
    return c.json({ error: 'Logout failed' }, 500);
  }
});

export default app;
