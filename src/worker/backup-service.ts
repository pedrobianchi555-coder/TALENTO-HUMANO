/**
 * Servicio de copias de seguridad de la base de datos
 */

interface BackupOptions {
  includeAuditLogs?: boolean;
  format?: 'sql' | 'json';
}

interface TableBackup {
  tableName: string;
  rows: any[];
  rowCount: number;
}

/**
 * Genera una copia de seguridad completa de la base de datos
 */
export async function createDatabaseBackup(
  db: D1Database,
  options: BackupOptions = {}
): Promise<{ data: string; metadata: any }> {
  const { includeAuditLogs = false, format = 'json' } = options;
  
  // Lista de tablas a respaldar (orden importante por foreign keys)
  const tables = [
    'users',
    'family_dependents',
    'companies',
    'asset_categories',
    'assets',
    'asset_assignments',
    'asset_maintenance',
    'asset_incidents',
    'requests',
    'complaints',
    'documents',
    'loans',
    'loan_repayment_plans',
    'loan_installments',
    'loan_payments',
    'evaluation_cycles',
    'evaluations',
    'corporate_events',
    'event_rsvps',
    'candidates',
    'interviews',
    'conversations',
    'conversation_participants',
    'messages',
    'polls',
    'payslips',
    'whatsapp_notifications',
    'employee_audit_log',
    'backup_history'
  ];
  
  if (includeAuditLogs) {
    tables.push('audit_log');
  }
  
  const backup: TableBackup[] = [];
  let totalRows = 0;
  
  // Exportar cada tabla
  for (const tableName of tables) {
    try {
      const result = await db.prepare(`SELECT * FROM ${tableName}`).all();
      const rows = result.results || [];
      
      backup.push({
        tableName,
        rows,
        rowCount: rows.length
      });
      
      totalRows += rows.length;
    } catch (error) {
      console.error(`Error backing up table ${tableName}:`, error);
      // Continuar con otras tablas
    }
  }
  
  const metadata = {
    version: '1.0',
    timestamp: new Date().toISOString(),
    tables: backup.map(t => ({ name: t.tableName, rows: t.rowCount })),
    totalRows,
    includeAuditLogs
  };
  
  let data: string;
  
  if (format === 'sql') {
    // Generar SQL INSERT statements
    data = generateSQLBackup(backup, metadata);
  } else {
    // Generar JSON
    data = JSON.stringify({
      metadata,
      data: backup
    }, null, 2);
  }
  
  return { data, metadata };
}

/**
 * Genera SQL INSERT statements para restauración
 */
function generateSQLBackup(backup: TableBackup[], metadata: any): string {
  let sql = `-- Database Backup\n`;
  sql += `-- Generated: ${metadata.timestamp}\n`;
  sql += `-- Total Rows: ${metadata.totalRows}\n\n`;
  
  for (const table of backup) {
    if (table.rows.length === 0) continue;
    
    sql += `-- Table: ${table.tableName} (${table.rowCount} rows)\n`;
    
    // Get column names from first row
    const columns = Object.keys(table.rows[0]);
    
    for (const row of table.rows) {
      const values = columns.map(col => {
        const val = row[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'string') return `'${val.replace(/'/g, "''")}'`;
        if (typeof val === 'boolean') return val ? '1' : '0';
        return val;
      });
      
      sql += `INSERT INTO ${table.tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});\n`;
    }
    
    sql += '\n';
  }
  
  return sql;
}

/**
 * Restaura una copia de seguridad (solo formato JSON por seguridad)
 */
export async function restoreDatabaseBackup(
  db: D1Database,
  backupData: string
): Promise<{ success: boolean; tablesRestored: number; rowsRestored: number }> {
  try {
    const backup = JSON.parse(backupData);
    
    if (!backup.metadata || !backup.data) {
      throw new Error('Invalid backup format');
    }
    
    let tablesRestored = 0;
    let rowsRestored = 0;
    
    // Restaurar cada tabla
    for (const table of backup.data) {
      if (!table.rows || table.rows.length === 0) continue;
      
      // Por seguridad, solo restaurar si la tabla está vacía
      const existing = await db.prepare(`SELECT COUNT(*) as count FROM ${table.tableName}`).first();
      
      if ((existing as any)?.count > 0) {
        console.warn(`Skipping ${table.tableName} - already has data`);
        continue;
      }
      
      // Insertar filas
      const columns = Object.keys(table.rows[0]);
      const placeholders = columns.map(() => '?').join(', ');
      
      for (const row of table.rows) {
        const values = columns.map(col => row[col]);
        
        await db.prepare(`
          INSERT INTO ${table.tableName} (${columns.join(', ')})
          VALUES (${placeholders})
        `).bind(...values).run();
        
        rowsRestored++;
      }
      
      tablesRestored++;
    }
    
    return { success: true, tablesRestored, rowsRestored };
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  }
}
