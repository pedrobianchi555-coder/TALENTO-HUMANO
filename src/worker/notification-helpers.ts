import { db } from './db';

type NotificationType =
  | 'REQUEST_APPROVED' | 'REQUEST_REJECTED' | 'REQUEST_CREATED'
  | 'LOAN_APPROVED' | 'LOAN_PAYMENT_RECORDED'
  | 'EVALUATION_ASSIGNED' | 'EVALUATION_COMPLETED'
  | 'ATTENDANCE_REGISTERED' | 'ASSET_ASSIGNED' | 'ASSET_RETURNED'
  | 'EVENT_REMINDER' | 'COMPLAINT_RESOLVED' | 'GENERAL';

interface CreateNotificationInput {
  user_id: number;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  created_by_id?: number;
  metadata?: Record<string, unknown>;
}

export async function createNotification(input: CreateNotificationInput) {
  const { error } = await db.from('notifications').insert({
    ...input,
    is_read: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  });
  if (error) console.error('[notifications] insert error:', error.message);
}

export async function notifyRequestStatusChange(
  employeeId: number,
  requestType: string,
  newStatus: 'APPROVED' | 'REJECTED',
  resolvedById: number
) {
  const approved = newStatus === 'APPROVED';
  await createNotification({
    user_id: employeeId,
    type: approved ? 'REQUEST_APPROVED' : 'REQUEST_REJECTED',
    title: approved ? 'Solicitud aprobada' : 'Solicitud rechazada',
    body: `Tu solicitud de ${requestType} ha sido ${approved ? 'aprobada' : 'rechazada'}.`,
    link: '/requests',
    created_by_id: resolvedById,
    metadata: { request_type: requestType, status: newStatus },
  });
}

export async function notifyAttendanceRegistered(
  employeeId: number,
  date: string,
  registeredById: number
) {
  await createNotification({
    user_id: employeeId,
    type: 'ATTENDANCE_REGISTERED',
    title: 'Asistencia registrada',
    body: `Se ha registrado tu asistencia manualmente para el ${date}.`,
    link: '/dashboard',
    created_by_id: registeredById,
    metadata: { date },
  });
}

export async function notifyEvaluationAssigned(employeeId: number, cycleTitle: string, evaluatorId: number) {
  await createNotification({
    user_id: employeeId,
    type: 'EVALUATION_ASSIGNED',
    title: 'Nueva evaluación asignada',
    body: `Se te ha asignado la evaluación "${cycleTitle}". Por favor completa tu autoevaluación.`,
    link: '/evaluations',
    created_by_id: evaluatorId,
    metadata: { cycle_title: cycleTitle },
  });
}

export async function notifyAssetAssigned(employeeId: number, assetName: string, assignedById: number) {
  await createNotification({
    user_id: employeeId,
    type: 'ASSET_ASSIGNED',
    title: 'Equipo asignado',
    body: `Se te ha asignado el activo: ${assetName}.`,
    link: '/assets',
    created_by_id: assignedById,
    metadata: { asset_name: assetName },
  });
}

export async function notifyLoanApproved(employeeId: number, amount: number, createdById: number) {
  await createNotification({
    user_id: employeeId,
    type: 'LOAN_APPROVED',
    title: 'Préstamo aprobado',
    body: `Tu préstamo por ${amount.toLocaleString('es-VE')} ha sido registrado.`,
    link: '/loans',
    created_by_id: createdById,
    metadata: { amount },
  });
}
