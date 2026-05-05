import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types';

// Initialize Supabase client for server-side operations
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error('Missing Supabase configuration: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required');
}

export const db = createClient<Database>(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Helper functions for common operations
export const dbHelpers = {
  // User Profile operations
  async getUserProfile(userId: string) {
    const { data, error } = await db
      .from('user_profiles')
      .select('*')
      .eq('mocha_user_id', userId)
      .single();

    if (error) throw error;
    return data;
  },

  async updateUserProfile(userId: string, updates: any) {
    const { data, error } = await db
      .from('user_profiles')
      .update(updates)
      .eq('mocha_user_id', userId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async createUserProfile(userId: string, email: string, profileData: any) {
    const { data, error } = await db
      .from('user_profiles')
      .insert({
        mocha_user_id: userId,
        email,
        ...profileData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Requests operations
  async getUserRequests(userId: number) {
    const { data, error } = await db
      .from('requests')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async createRequest(userId: number, requestData: any) {
    const { data, error } = await db
      .from('requests')
      .insert({
        user_id: userId,
        ...requestData,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateRequestStatus(requestId: number, status: string) {
    const { data, error } = await db
      .from('requests')
      .update({
        status,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  // Loans operations
  async getUserLoans(userId: number) {
    const { data, error } = await db
      .from('loans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async getLoanInstallments(loanId: number) {
    const { data, error } = await db
      .from('loan_installments')
      .select('*')
      .eq('loan_id', loanId)
      .order('installment_number', { ascending: true });

    if (error) throw error;
    return data || [];
  },

  async getLoanPayments(loanId: number) {
    const { data, error } = await db
      .from('loan_payments')
      .select('*')
      .eq('loan_id', loanId)
      .order('payment_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Documents operations
  async getDocuments() {
    const { data, error } = await db
      .from('documents')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Evaluations operations
  async getUserEvaluations(userId: number) {
    const { data, error } = await db
      .from('evaluations')
      .select(`
        *,
        cycle:evaluation_cycles(*)
      `)
      .eq('employee_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Events operations
  async getUpcomingEvents(limit = 10) {
    const { data, error } = await db
      .from('corporate_events')
      .select('*')
      .gte('start_date', new Date().toISOString())
      .order('start_date', { ascending: true })
      .limit(limit);

    if (error) throw error;
    return data || [];
  },

  // Birthdays operations
  async getUpcomingBirthdays(days = 30) {
    const today = new Date();
    const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

    const { data, error } = await db
      .from('user_profiles')
      .select('id, first_name, last_name, birth_date, department, position, photo_url')
      .not('birth_date', 'is', null)
      .order('birth_date', { ascending: true });

    if (error) throw error;

    // Filter birthdays in the next X days
    const now = new Date();
    return (data || []).filter((user: any) => {
      if (!user.birth_date) return false;
      const birthDate = new Date(user.birth_date);
      const thisYearBirthday = new Date(now.getFullYear(), birthDate.getMonth(), birthDate.getDate());

      if (thisYearBirthday < now) {
        thisYearBirthday.setFullYear(now.getFullYear() + 1);
      }

      return thisYearBirthday <= futureDate;
    });
  },

  // Assets operations
  async getUserAssets(userId: number) {
    const { data, error } = await db
      .from('asset_assignments')
      .select(`
        *,
        asset:assets(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'ACTIVE')
      .order('assigned_date', { ascending: false });

    if (error) throw error;
    return data || [];
  },

  // Dashboard stats helper
  async getDashboardStats(userId: number, userRole: 'EMPLOYEE' | 'HR') {
    const userProfile = await this.getUserProfile(userId.toString());

    if (userRole === 'EMPLOYEE') {
      // Get employee stats
      const requests = await this.getUserRequests(userProfile.id);
      const loans = await this.getUserLoans(userProfile.id);
      const evaluations = await this.getUserEvaluations(userProfile.id);
      const assets = await this.getUserAssets(userProfile.id);

      return {
        myPendingRequests: requests.filter((r: any) => r.status === 'PENDING').length,
        myActiveLoans: loans.filter((l: any) => l.status === 'ACTIVE').length,
        myPendingEvaluations: evaluations.filter((e: any) =>
          e.status === 'PENDING' || e.status === 'SELF_COMPLETED'
        ).length,
        myAssignedAssets: assets.length,
        myPendingComplaints: 0, // Will implement separately
        myPayslipsThisYear: 0, // Will implement separately
      };
    } else {
      // Get HR stats
      const { data: employees } = await db
        .from('user_profiles')
        .select('id')
        .eq('status', 'ACTIVE');

      const { data: candidates } = await db
        .from('candidates')
        .select('id')
        .in('status', ['APPLIED', 'PHONE_SCREEN', 'INTERVIEW', 'OFFER']);

      const { data: allRequests } = await db
        .from('requests')
        .select('id, status')
        .eq('status', 'PENDING');

      const { data: allLoans } = await db
        .from('loans')
        .select('id')
        .eq('status', 'ACTIVE');

      return {
        activeEmployees: employees?.length || 0,
        candidatesInProcess: candidates?.length || 0,
        pendingRequests: allRequests?.length || 0,
        activeLoans: allLoans?.length || 0,
        pendingEvaluations: 0,
        upcomingEvents: 0,
        pendingComplaints: 0,
        assignedAssets: 0,
      };
    }
  },
};
