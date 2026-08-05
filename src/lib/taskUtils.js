// No direct supabase import — caller passes the authenticated client instance.
// This keeps taskUtils compatible with v1's auth pattern (supabase is already
// initialised in the component tree before any of these functions are called).

import { PARALLEL_TEAMS } from './constants';

// ─── Team config ─────────────────────────────────────────────────────────────
// Rich metadata used by AdminTaskSetup and TaskBoard to render team cards.
export const TASK_TEAMS = [
  // selfCompletes: true — editorial_team marks its own task complete
  // directly (TaskPanel.js's handleComplete), same as seo_team. No
  // stakeholder approval gate exists for this team today; this flag
  // previously said false, which didn't match the actual behavior.
  { role: 'editorial_team', label: 'Editorial Team', icon: '✍️',  color: '#2a7a4b', bg: '#ecfdf5', alwaysRequired: true,  webLocked: false, selfCompletes: true },
  { role: 'brand_team',     label: 'Brand Team',     icon: '🎨',  color: '#d97706', bg: '#fffbeb', alwaysRequired: false, webLocked: false, selfCompletes: false },
  { role: 'seo_team',       label: 'SEO Team',       icon: '🔍',  color: '#1b5793', bg: '#eff6ff', alwaysRequired: true,  webLocked: false, selfCompletes: true  },
  { role: 'design_team',    label: 'Design Team',    icon: '🖼️', color: '#ea580c', bg: '#fff7ed', alwaysRequired: true,  webLocked: false, selfCompletes: false },
  { role: 'web_team',       label: 'Web Team',       icon: '🌐',  color: '#0f2744', bg: '#F5F5F5', alwaysRequired: true,  webLocked: true,  selfCompletes: true  },
];

// ─── Status / overall-status metadata ────────────────────────────────────────
// Kept here for components that import from taskUtils rather than constants.
export const TASK_STATUS_META = {
  locked:            { label: 'Locked',           color: '#B5B5B5', bg: '#F9F9F9', icon: '🔒' },
  pending:           { label: 'Pending',           color: '#646464', bg: '#F3F3F3', icon: '⏳' },
  in_progress:       { label: 'In Progress',       color: '#1b5793', bg: '#eff6ff', icon: '⚡' },
  waiting_for_brand: { label: 'Waiting for Brand', color: '#d97706', bg: '#fffbeb', icon: '🎨' },
  needs_info:        { label: 'Needs Info',        color: '#d97706', bg: '#fffbeb', icon: '❓' },
  pending_approval:  { label: 'Needs Approval',    color: '#9333ea', bg: '#faf5ff', icon: '👁️' },
  pending_action:    { label: 'Pending Action',    color: '#dc2626', bg: '#fef2f2', icon: '🔴' },
  completed:         { label: 'Completed',         color: '#2a7a4b', bg: '#ecfdf5', icon: '✅' },
};

export const OVERALL_STATUS_META = {
  pending_admin:       { label: 'Pending Admin Review', color: '#d97706', bg: '#fffbeb' },
  in_progress:         { label: 'In Progress',          color: '#1b5793', bg: '#eff6ff' },
  pending_stakeholder: { label: 'Needs Approval',       color: '#9333ea', bg: '#faf5ff' },
  pending_web:         { label: 'Web Team Active',      color: '#2c90b2', bg: '#e8f4fb' },
  published:           { label: 'Published',            color: '#2a7a4b', bg: '#ecfdf5' },
};

export const getTaskTeam   = (role) => TASK_TEAMS.find(t => t.role === role);
export const getTaskStatus = (key)  => TASK_STATUS_META[key] || TASK_STATUS_META.pending;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const now = () => new Date().toISOString();

// ─── Core async functions ─────────────────────────────────────────────────────
// All return { data, error } to match Supabase conventions.
// supabase is always the last parameter — never imported at module scope.

/**
 * Insert one task row per role and flip overall_status → in_progress.
 * web_team always starts locked; every other role starts pending.
 *
 * @param {string}   requestId     UUID of the parent request
 * @param {string[]} selectedRoles e.g. ['editorial_team','seo_team','web_team']
 * @param {string}   adminId       public.users.id of the creating admin
 * @param {object}   supabase      authenticated Supabase client
 */
export async function createTasksForRequest(requestId, selectedRoles, adminId, supabase) {
  const rows = selectedRoles.map(role => ({
    request_id:  requestId,
    team_role:   role,
    status:      role === 'web_team' ? 'locked' : 'pending',
    is_required: true,
    assigned_by: adminId,
  }));

  const { data: tasks, error: insertError } = await supabase
    .from('tasks')
    .insert(rows)
    .select();

  if (insertError) return { data: null, error: insertError };

  const { error: reqError } = await supabase
    .from('requests')
    .update({
      overall_status:    'in_progress',
      admin_reviewed_by: adminId,
      admin_reviewed_at: now(),
      updated_at:        now(),
    })
    .eq('id', requestId);

  return { data: tasks, error: reqError || null };
}

/**
 * Call the DB-side check_web_team_unlock() RPC. If all required parallel
 * tasks are completed, unlock the web_team task and set overall_status →
 * pending_web.
 *
 * @returns {{ unlocked: boolean, error: Error|null }}
 */
export async function tryUnlockWebTeam(requestId, supabase) {
  const { data: canUnlock, error: rpcError } = await supabase
    .rpc('check_web_team_unlock', { p_request_id: requestId });

  if (rpcError)    return { unlocked: false, error: rpcError };
  if (!canUnlock)  return { unlocked: false, error: null };

  const { data: updatedTasks, error: taskError } = await supabase
    .from('tasks')
    .update({ status: 'pending', unlocked_at: now(), updated_at: now() })
    .eq('request_id', requestId)
    .eq('team_role', 'web_team')
    .eq('status', 'locked')
    .select();

  if (taskError) return { unlocked: false, error: taskError };
  // web_team task was already unlocked (pending/in_progress/completed) — no-op,
  // and critically: don't clobber overall_status if it's since moved past pending_web.
  if (!updatedTasks?.length) return { unlocked: false, error: null };

  const { error: reqError } = await supabase
    .from('requests')
    .update({ overall_status: 'pending_web', updated_at: now() })
    .eq('id', requestId);

  // Notify web_team members — otherwise nobody finds out this task became
  // actionable until they happen to check the dashboard themselves. Fire
  // and forget: a notification failure must never fail the unlock itself.
  try {
    const { data: req } = await supabase
      .from('requests').select('page_title').eq('id', requestId).single();
    const { data: webUsers } = await supabase
      .from('users').select('id').eq('role', 'web_team');
    if (webUsers?.length) {
      supabase.from('notifications').insert(
        webUsers.map(u => ({
          user_id:    u.id,
          type:       'web_team_unlocked',
          title:      'A page is ready for Web Team',
          message:    `All other teams have finished "${req?.page_title || 'a request'}" — it's ready for implementation.`,
          request_id: requestId,
          action_url: `/requests/${requestId}`,
        }))
      ).then(() => {}).catch(() => {});
    }
  } catch { /* notification failure must not block the unlock */ }

  return { unlocked: true, error: reqError || null };
}

/**
 * Recalculate and write overall_status on the request after any task change.
 *
 * Priority:
 *   published          ← web_team task completed
 *   pending_web        ← web_team task is unlocked (pending / in_progress)
 *   pending_stakeholder← any parallel task needs stakeholder approval
 *   in_progress        ← default while work is active
 *
 * Note: this function does NOT auto-unlock web_team. Call tryUnlockWebTeam
 * separately when a parallel task reaches 'completed'.
 */
export async function syncOverallStatus(requestId, supabase) {
  const { data: tasks, error: fetchError } = await supabase
    .from('tasks')
    .select('team_role, status, is_required')
    .eq('request_id', requestId);

  if (fetchError)                      return { data: null, error: fetchError };
  if (!tasks || tasks.length === 0)   return { data: null, error: null };

  const webTask      = tasks.find(t => t.team_role === 'web_team');
  const parallelTasks = tasks.filter(t => PARALLEL_TEAMS.includes(t.team_role));

  let overall_status = 'in_progress';

  if (webTask?.status === 'completed') {
    overall_status = 'published';
  } else if (webTask && ['pending', 'in_progress'].includes(webTask.status)) {
    overall_status = 'pending_web';
  } else if (parallelTasks.some(t => t.status === 'pending_approval')) {
    overall_status = 'pending_stakeholder';
  }

  const { error: updateError } = await supabase
    .from('requests')
    .update({ overall_status, updated_at: now() })
    .eq('id', requestId);

  return { data: overall_status, error: updateError || null };
}

/**
 * Fetch all tasks for a request with assignee and assigner names joined.
 * Ordered by creation time so the board renders in a stable sequence.
 */
export async function getTasksForRequest(requestId, supabase) {
  const { data, error } = await supabase
    .from('tasks')
    .select(`
      *,
      assignee:users!tasks_assigned_to_fkey(id, name, email, role),
      assigner:users!tasks_assigned_by_fkey(id, name, role)
    `)
    .eq('request_id', requestId)
    .order('created_at', { ascending: true });

  return { data: data || [], error };
}

// Alias kept so TaskBoard.js can migrate to getTasksForRequest incrementally.
export const getTasksWithAssignees = getTasksForRequest;

/**
 * Update a task; always stamps updated_at. Automatically sets completed_at
 * when status is flipped to 'completed'.
 *
 * @param {string} taskId   UUID of the task row
 * @param {object} updates  Fields to change (partial)
 * @param {object} supabase authenticated Supabase client
 */
export async function updateTask(taskId, updates, supabase) {
  const payload = { ...updates, updated_at: now() };
  if (updates.status === 'completed') payload.completed_at = now();

  const { data, error } = await supabase
    .from('tasks')
    .update(payload)
    .eq('id', taskId)
    .select()
    .single();

  return { data, error };
}
