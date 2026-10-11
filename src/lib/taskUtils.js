// No direct supabase import — caller passes the authenticated client instance.
// This keeps taskUtils compatible with v1's auth pattern (supabase is already
// initialised in the component tree before any of these functions are called).

import {
  FaPenNib, FaPalette, FaSearch, FaImage, FaGlobe, FaLock, FaHourglassHalf,
  FaBolt, FaQuestionCircle, FaEye, FaExclamationCircle, FaCheckCircle,
} from 'react-icons/fa';
import { PARALLEL_TEAMS } from './constants';

// ─── Team config ─────────────────────────────────────────────────────────────
// Rich metadata used by AdminTaskSetup and TaskBoard to render team cards.
// `icon` is a react-icons component reference (was emoji) -- rendered as
// <team.icon/> in rich JSX contexts. The one plain-text <option> consumer
// (TaskPanel.js's team picker) can't render a component, so it skips this
// field entirely rather than trying to stringify it.
//
// Trimmed to editorial_team only (2026-09-11 role consolidation -- see
// sql/29-role-consolidation.sql). brand_team/seo_team/design_team/
// web_team are retired: AdminTaskSetup.js no longer creates task rows
// for them. The web_team-specific logic (locked-start status,
// tryUnlockWebTeam, the pending_web / web publish branches) was removed
// 2026-10-12 after confirming no web_team task rows exist in the database.
export const TASK_TEAMS = [
  // selfCompletes: true — editorial_team marks its own task complete
  // directly (TaskPanel.js's handleComplete). No stakeholder approval
  // gate exists for this team today.
  { role: 'editorial_team', label: 'Editorial Team', icon: FaPenNib, color: '#2a7a4b', bg: '#ecfdf5', alwaysRequired: true, webLocked: false, selfCompletes: true },
];

// ─── Status / overall-status metadata ────────────────────────────────────────
// Kept here for components that import from taskUtils rather than constants.
export const TASK_STATUS_META = {
  locked:            { label: 'Locked',           color: '#B5B5B5', bg: '#F9F9F9', icon: FaLock },
  pending:           { label: 'Pending',           color: '#646464', bg: '#F3F3F3', icon: FaHourglassHalf },
  in_progress:       { label: 'In Progress',       color: '#1b5793', bg: '#eff6ff', icon: FaBolt },
  waiting_for_brand: { label: 'Waiting for Brand', color: '#d97706', bg: '#fffbeb', icon: FaPalette },
  needs_info:        { label: 'Needs Info',        color: '#d97706', bg: '#fffbeb', icon: FaQuestionCircle },
  pending_approval:  { label: 'Needs Approval',    color: '#9333ea', bg: '#faf5ff', icon: FaEye },
  pending_action:    { label: 'Pending Action',    color: '#dc2626', bg: '#fef2f2', icon: FaExclamationCircle },
  completed:         { label: 'Completed',         color: '#2a7a4b', bg: '#ecfdf5', icon: FaCheckCircle },
};

export const OVERALL_STATUS_META = {
  pending_admin:       { label: 'Pending Admin Review', color: '#d97706', bg: '#fffbeb' },
  in_progress:         { label: 'In Progress',          color: '#1b5793', bg: '#eff6ff' },
  pending_stakeholder: { label: 'Needs Approval',       color: '#9333ea', bg: '#faf5ff' },
  completed:           { label: 'Completed',            color: '#2a7a4b', bg: '#ecfdf5' },
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
 * Every task starts as pending.
 *
 * @param {string}   requestId     UUID of the parent request
 * @param {string[]} selectedRoles e.g. ['editorial_team']
 * @param {string}   adminId       public.users.id of the creating admin
 * @param {object}   supabase      authenticated Supabase client
 */
export async function createTasksForRequest(requestId, selectedRoles, adminId, supabase) {
  const rows = selectedRoles.map(role => ({
    request_id:  requestId,
    team_role:   role,
    status:      'pending',
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
 * Recalculate and write overall_status on the request after any task change.
 *
 *   completed          ← every task on the request is completed
 *   pending_stakeholder← any parallel task needs stakeholder approval
 *   in_progress        ← default while work is active
 *
 * Editorial-only workflow: when the editorial task is marked completed the
 * whole request is completed. Re-opening a task recomputes this to
 * in_progress. (The web_team publish branches were removed 2026-10-12.)
 */
export async function syncOverallStatus(requestId, supabase) {
  const { data: tasks, error: fetchError } = await supabase
    .from('tasks')
    .select('team_role, status, is_required')
    .eq('request_id', requestId);

  if (fetchError)                      return { data: null, error: fetchError };
  if (!tasks || tasks.length === 0)   return { data: null, error: null };

  const parallelTasks = tasks.filter(t => PARALLEL_TEAMS.includes(t.team_role));

  const overall_status = tasks.every(t => t.status === 'completed')
    ? 'completed'
    : parallelTasks.some(t => t.status === 'pending_approval')
      ? 'pending_stakeholder'
      : 'in_progress';

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
