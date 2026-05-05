#!/usr/bin/env node

/**
 * Hikvision Attendance Sync Agent
 * Sincroniza asistencia desde iVMS-4200 a Supabase
 *
 * Ejecución:
 *   npm install
 *   node agent.js
 */

import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import cron from 'node-cron';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

// ============================================
// CONFIGURACIÓN
// ============================================

const HIKVISION_CONFIG = {
  baseURL: process.env.HIKVISION_SERVER || 'http://192.168.1.100:8080',
  username: process.env.HIKVISION_USER || 'admin',
  password: process.env.HIKVISION_PASS || '',
  timeout: parseInt(process.env.HIKVISION_TIMEOUT || '10000'),
};

const SUPABASE_CONFIG = {
  url: process.env.SUPABASE_URL || '',
  key: process.env.SUPABASE_KEY || '',
};

const SYNC_INTERVAL = process.env.SYNC_INTERVAL || '*/5 * * * *'; // Cada 5 minutos
const DAYS_TO_SYNC = parseInt(process.env.DAYS_TO_SYNC || '1'); // Sincronizar últimos N días

// ============================================
// VALIDAR CONFIGURACIÓN
// ============================================

function validateConfig() {
  const errors = [];

  if (!HIKVISION_CONFIG.baseURL) errors.push('HIKVISION_SERVER no configurado');
  if (!SUPABASE_CONFIG.url) errors.push('SUPABASE_URL no configurado');
  if (!SUPABASE_CONFIG.key) errors.push('SUPABASE_KEY no configurado');

  if (errors.length > 0) {
    console.error(chalk.red('❌ Errores de configuración:'));
    errors.forEach((e) => console.error(chalk.red(`   - ${e}`)));
    process.exit(1);
  }

  console.log(chalk.green('✅ Configuración válida'));
}

// ============================================
// CLIENTE HIKVISION
// ============================================

class HikvisionClient {
  constructor(config) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseURL,
      auth: { username: config.username, password: config.password },
      timeout: config.timeout,
      headers: { 'Content-Type': 'application/json' },
    });

    console.log(chalk.blue(`📡 Cliente Hikvision inicializado: ${config.baseURL}`));
  }

  async getEmployees() {
    try {
      console.log(chalk.gray('  Obteniendo empleados de Hikvision...'));
      const response = await this.client.get('/ISAPI/AccessControl/UserInfo/Search?format=json');
      const employees = response.data?.UserInfoSearchResponse?.UserInfo || [];
      console.log(chalk.green(`  ✓ ${employees.length} empleados encontrados`));
      return employees;
    } catch (error) {
      console.error(chalk.red(`  ❌ Error obteniendo empleados: ${error.message}`));
      return [];
    }
  }

  async getAttendanceEvents(employeeId, startDate, endDate) {
    try {
      const params = new URLSearchParams({
        format: 'json',
        userID: employeeId,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
      });

      const response = await this.client.get(
        `/ISAPI/AccessControl/AcsEvent/Search?${params.toString()}`
      );

      return response.data?.AcsEventSearchResponse?.AcsEvent || [];
    } catch (error) {
      console.error(chalk.red(`  ❌ Error obteniendo eventos para ${employeeId}: ${error.message}`));
      return [];
    }
  }
}

// ============================================
// SINCRONIZACIÓN
// ============================================

async function syncAttendanceData() {
  console.log(chalk.cyan(`\n${'='.repeat(60)}`));
  console.log(chalk.cyan(`📅 Sincronización iniciada: ${new Date().toLocaleString('es-ES')}`));
  console.log(chalk.cyan(`${'='.repeat(60)}`));

  try {
    // Inicializar clientes
    const hikvision = new HikvisionClient(HIKVISION_CONFIG);
    const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);

    // 1. Obtener empleados de Hikvision
    const hikEmployees = await hikvision.getEmployees();
    if (hikEmployees.length === 0) {
      console.warn(chalk.yellow('⚠️ No se encontraron empleados en Hikvision'));
      return;
    }

    // 2. Calcular rango de fechas
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - DAYS_TO_SYNC);

    console.log(chalk.blue(`📅 Sincronizando período: ${startDate.toLocaleDateString('es-ES')} a ${endDate.toLocaleDateString('es-ES')}`));

    // 3. Sincronizar por empleado
    let totalSynced = 0;
    let totalErrors = 0;

    for (const hikEmployee of hikEmployees) {
      const employeeId = hikEmployee.userID;
      const employeeName = hikEmployee.employeeName;
      const cardNo = hikEmployee.cardNo;

      try {
        // Obtener eventos
        const events = await hikvision.getAttendanceEvents(employeeId, startDate, endDate);

        if (events.length === 0) {
          continue;
        }

        // Agrupar eventos por día
        const attendanceByDate = groupEventsByDate(events);

        // Buscar usuario en Supabase
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('ci', cardNo)
          .single();

        if (userError || !userData) {
          console.log(chalk.yellow(`⚠️ Empleado con CI ${cardNo} no encontrado en HR system`));
          totalErrors++;
          continue;
        }

        const userId = userData.id;

        // Insertar registros
        for (const [dateStr, times] of Object.entries(attendanceByDate)) {
          const record = calculateAttendanceRecord(userId, cardNo, dateStr, times);

          const { error: insertError } = await supabase
            .from('attendance_records')
            .upsert(record, { onConflict: 'user_id,date' });

          if (insertError) {
            console.error(chalk.red(`  ❌ Error sincronizando ${employeeName} - ${dateStr}: ${insertError.message}`));
            totalErrors++;
          } else {
            totalSynced++;
          }
        }

        console.log(chalk.green(`  ✓ ${employeeName} - ${Object.keys(attendanceByDate).length} día(s)`));
      } catch (error) {
        console.error(chalk.red(`  ❌ Error procesando ${employeeName}: ${error.message}`));
        totalErrors++;
      }
    }

    // Resumen
    console.log(chalk.cyan(`\n${'='.repeat(60)}`));
    console.log(chalk.green(`✅ Sincronización completada`));
    console.log(chalk.gray(`   Registros sincronizados: ${totalSynced}`));
    if (totalErrors > 0) {
      console.log(chalk.yellow(`   Errores: ${totalErrors}`));
    }
    console.log(chalk.cyan(`${'='.repeat(60)}\n`));

  } catch (error) {
    console.error(chalk.red(`\n❌ Error crítico: ${error.message}`));
  }
}

// ============================================
// FUNCIONES AUXILIARES
// ============================================

function groupEventsByDate(events) {
  const grouped = {};

  events.forEach((event) => {
    const eventDate = new Date(event.eventTime);
    const dateKey = eventDate.toISOString().split('T')[0];

    if (!grouped[dateKey]) {
      grouped[dateKey] = {
        checkIns: [],
        checkOuts: [],
      };
    }

    // Detectar tipo de evento
    const eventType = (event.eventType || '').toUpperCase();

    if (eventType === 'IN' || eventType === 'ACCESS_GRANTED' || eventType === '1') {
      grouped[dateKey].checkIns.push(eventDate);
    } else if (eventType === 'OUT' || eventType === '0') {
      grouped[dateKey].checkOuts.push(eventDate);
    }
  });

  return grouped;
}

function calculateAttendanceRecord(userId, cardNo, dateStr, times) {
  // Primer check-in y último check-out
  const checkIn = times.checkIns.length > 0
    ? new Date(Math.min(...times.checkIns.map(t => t.getTime())))
    : null;

  const checkOut = times.checkOuts.length > 0
    ? new Date(Math.max(...times.checkOuts.map(t => t.getTime())))
    : null;

  // Calcular horas trabajadas
  let hoursWorked = null;
  if (checkIn && checkOut) {
    hoursWorked = (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60);
  }

  // Determinar estado
  let status = 'ABSENT';
  if (checkIn) {
    status = 'PRESENT';
    const checkInHour = checkIn.getHours();
    const checkInMinutes = checkIn.getMinutes();

    // Considerar tardanza si entra después de las 8:15
    if (checkInHour > 8 || (checkInHour === 8 && checkInMinutes > 15)) {
      status = 'LATE';
    }
  }

  return {
    user_id: userId,
    employee_ci: cardNo,
    check_in: checkIn?.toISOString() || null,
    check_out: checkOut?.toISOString() || null,
    hours_worked: hoursWorked,
    date: dateStr,
    status,
    source: 'HIKVISION',
    synced_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

// ============================================
// MAIN
// ============================================

async function main() {
  console.log(chalk.bold.blue('\n🚀 Hikvision Attendance Sync Agent\n'));

  // Validar configuración
  validateConfig();

  // Ejecutar sincronización inicial
  await syncAttendanceData();

  // Programar sincronización periódica
  console.log(chalk.blue(`\n⏱️ Programando sincronización cada: ${SYNC_INTERVAL}`));
  cron.schedule(SYNC_INTERVAL, syncAttendanceData);

  console.log(chalk.green('✅ Agente ejecutándose. Presiona Ctrl+C para detener.\n'));
}

main().catch((error) => {
  console.error(chalk.red('Error fatal:'), error);
  process.exit(1);
});
