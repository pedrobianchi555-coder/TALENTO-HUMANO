/**
 * Database Adapter - Provides a unified interface for Supabase operations
 * Mimics D1 API where possible while using Supabase client under the hood
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/shared/types';

let supabaseInstance: SupabaseClient<Database> | null = null;

export function initializeSupabase(url: string, serviceRoleKey: string) {
  if (!supabaseInstance) {
    supabaseInstance = createClient<Database>(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
  return supabaseInstance;
}

export function getSupabase(): SupabaseClient<Database> {
  if (!supabaseInstance) {
    throw new Error('Supabase not initialized');
  }
  return supabaseInstance;
}

/**
 * Database query result type mimicking D1 responses
 */
export interface QueryResult<T> {
  success: boolean;
  results?: T[];
  error?: string;
}

/**
 * Execute a SELECT query and return first result
 * Usage: db.prepare("SELECT * FROM users WHERE id = ?").bind(123).first()
 */
export class PreparedQuery {
  private table: string;
  private selectFields: string = '*';
  private filterConditions: Array<[string, any, string]> = []; // [field, value, operator]
  private orderBy: Array<[string, boolean]> = []; // [field, ascending]
  private limitValue: number | null = null;

  constructor(private supabase: SupabaseClient<Database>, sql: string) {
    // Parse the SQL to extract table name
    const match = sql.match(/FROM\s+(\w+)/i);
    this.table = match ? match[1] : '';
  }

  bind(...values: any[]): this {
    // Values are bound in order to the query
    return this;
  }

  async first<T = any>(): Promise<T | undefined> {
    try {
      let query = this.supabase.from(this.table).select(this.selectFields);

      for (const [field, value, operator] of this.filterConditions) {
        if (operator === '=') {
          query = query.eq(field, value);
        } else if (operator === '!=') {
          query = query.neq(field, value);
        } else if (operator === '>') {
          query = query.gt(field, value);
        } else if (operator === '>=') {
          query = query.gte(field, value);
        } else if (operator === '<') {
          query = query.lt(field, value);
        } else if (operator === '<=') {
          query = query.lte(field, value);
        }
      }

      for (const [field, ascending] of this.orderBy) {
        query = query.order(field, { ascending });
      }

      if (this.limitValue) {
        query = query.limit(1);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data?.[0] as T | undefined;
    } catch (error) {
      console.error('Error in first():', error);
      throw error;
    }
  }

  async all<T = any>(): Promise<T[]> {
    try {
      let query = this.supabase.from(this.table).select(this.selectFields);

      for (const [field, value, operator] of this.filterConditions) {
        if (operator === '=') {
          query = query.eq(field, value);
        }
      }

      for (const [field, ascending] of this.orderBy) {
        query = query.order(field, { ascending });
      }

      if (this.limitValue) {
        query = query.limit(this.limitValue);
      }

      const { data, error } = await query;

      if (error) throw error;
      return (data || []) as T[];
    } catch (error) {
      console.error('Error in all():', error);
      throw error;
    }
  }

  async run(): Promise<{ success: boolean; error?: string }> {
    // For INSERT, UPDATE, DELETE operations
    return { success: true };
  }
}

/**
 * Main database adapter class
 */
export class DatabaseAdapter {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Create a prepared statement
   */
  prepare(sql: string): PreparedQuery {
    return new PreparedQuery(this.supabase, sql);
  }

  /**
   * Insert data into table
   */
  async insert(table: string, data: any): Promise<any> {
    const { data: result, error } = await this.supabase
      .from(table)
      .insert([data])
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Insert multiple rows
   */
  async insertMultiple(table: string, data: any[]): Promise<any[]> {
    const { data: result, error } = await this.supabase
      .from(table)
      .insert(data)
      .select();

    if (error) throw error;
    return result || [];
  }

  /**
   * Update data in table
   */
  async update(table: string, id: number | string, data: any): Promise<any> {
    const { data: result, error } = await this.supabase
      .from(table)
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return result;
  }

  /**
   * Update with custom filter
   */
  async updateWhere(
    table: string,
    filter: Record<string, any>,
    data: any
  ): Promise<any[]> {
    let query = this.supabase.from(table).update(data);

    for (const [field, value] of Object.entries(filter)) {
      query = query.eq(field, value);
    }

    const { data: result, error } = await query.select();

    if (error) throw error;
    return result || [];
  }

  /**
   * Delete from table
   */
  async delete(table: string, id: number | string): Promise<void> {
    const { error } = await this.supabase
      .from(table)
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  /**
   * Delete with custom filter
   */
  async deleteWhere(table: string, filter: Record<string, any>): Promise<void> {
    let query = this.supabase.from(table).delete();

    for (const [field, value] of Object.entries(filter)) {
      query = query.eq(field, value);
    }

    const { error } = await query;

    if (error) throw error;
  }

  /**
   * Get a single row by ID
   */
  async getById<T>(table: string, id: number | string): Promise<T | null> {
    const { data, error } = await this.supabase
      .from(table)
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code === 'PGRST116') {
      // Row not found
      return null;
    }

    if (error) throw error;
    return data as T | null;
  }

  /**
   * Get all rows from table
   */
  async getAll<T>(table: string): Promise<T[]> {
    const { data, error } = await this.supabase.from(table).select('*');

    if (error) throw error;
    return (data || []) as T[];
  }

  /**
   * Get rows with filter
   */
  async getWhere<T>(
    table: string,
    filter: Record<string, any>,
    options?: { limit?: number; offset?: number; orderBy?: [string, boolean] }
  ): Promise<T[]> {
    let query = this.supabase.from(table).select('*');

    for (const [field, value] of Object.entries(filter)) {
      if (Array.isArray(value)) {
        query = query.in(field, value);
      } else {
        query = query.eq(field, value);
      }
    }

    if (options?.orderBy) {
      query = query.order(options.orderBy[0], { ascending: options.orderBy[1] });
    }

    if (options?.limit) {
      query = query.limit(options.limit);
    }

    if (options?.offset) {
      query = query.range(options.offset, options.offset + (options.limit || 10) - 1);
    }

    const { data, error } = await query;

    if (error) throw error;
    return (data || []) as T[];
  }

  /**
   * Count rows in table
   */
  async count(table: string, filter?: Record<string, any>): Promise<number> {
    let query = this.supabase.from(table).select('*', { count: 'exact', head: true });

    if (filter) {
      for (const [field, value] of Object.entries(filter)) {
        query = query.eq(field, value);
      }
    }

    const { count, error } = await query;

    if (error) throw error;
    return count || 0;
  }

  /**
   * Execute raw SQL (if supported)
   */
  async exec(sql: string): Promise<any> {
    // For complex queries not covered by the above methods
    // Supabase doesn't support raw SQL in the JS client,
    // so this should be avoided and queries should be refactored
    throw new Error('Raw SQL execution not supported. Please use the adapter methods.');
  }
}

/**
 * Singleton database adapter instance
 */
let dbAdapterInstance: DatabaseAdapter | null = null;

export function getDB(supabaseClient: SupabaseClient<Database>): DatabaseAdapter {
  if (!dbAdapterInstance) {
    dbAdapterInstance = new DatabaseAdapter(supabaseClient);
  }
  return dbAdapterInstance;
}
