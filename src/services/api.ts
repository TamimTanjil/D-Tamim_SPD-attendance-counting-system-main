
import {
  defaultSettings,
  type AttendanceLog,
  type AttendanceStatus,
  type CheckIn,
  type LabUser,
  type SystemSettings,
} from "@/lib/mock-data";

import { supabase } from "@/lib/supabase";

// --------------------------------------------------
// API CONFIGURATION
// --------------------------------------------------

export const API_BASE_URL = import.meta.env["VITE_API_BASE_URL"] ?? "";

export const USE_MOCK = !API_BASE_URL;

export const CAMERA_STREAM_URL = API_BASE_URL
  ? `${API_BASE_URL}/api/camera/stream`
  : "";

export const DETECTIONS_WS_URL = API_BASE_URL
  ? `${API_BASE_URL.replace(/^http/, "ws")}/ws/detections`
  : "";

const delay = (ms = 350) =>
  new Promise((resolve) => setTimeout(resolve, ms));

async function request<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!res.ok) {
    throw new Error(`${res.status} ${res.statusText}`);
  }

  return (await res.json()) as T;
}

// --------------------------------------------------
// LOCAL SETTINGS
// --------------------------------------------------

let settings: SystemSettings = { ...defaultSettings };

export interface DashboardStats {
  totalRegistered: number;
  presentToday: number;
  absentToday: number;
  lateToday: number;
  cameraOnline: boolean;
  fps: number;
  latencyMs: number;
  modelVersion: string;
}

function getLocalDate(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function normalizeStatus(status: unknown): AttendanceStatus {
  const value = String(status ?? "").toLowerCase();

  if (value === "late") return "late";
  if (value === "absent") return "absent";

  return "present";
}

// --------------------------------------------------
// DASHBOARD STATISTICS
// --------------------------------------------------

export async function getStats(): Promise<DashboardStats> {
  const today = getLocalDate();

  const { count: totalRegistered, error: studentsError } =
    await supabase
      .from("students")
      .select("*", { count: "exact", head: true });

  if (studentsError) {
    throw new Error(
      `Could not load registered students: ${studentsError.message}`
    );
  }

  const { data, error: attendanceError } = await supabase
    .from("attendance")
    .select("student_id, status, attendance_date")
    .eq("attendance_date", today);

  if (attendanceError) {
    throw new Error(
      `Could not load attendance stats: ${attendanceError.message}`
    );
  }

  const rows = data ?? [];

  const presentStudents = new Set(
    rows
      .filter(
        (row) => String(row.status).toLowerCase() === "present"
      )
      .map((row) => row.student_id)
      .filter(Boolean)
  );

  const lateStudents = new Set(
    rows
      .filter(
        (row) => String(row.status).toLowerCase() === "late"
      )
      .map((row) => row.student_id)
      .filter(Boolean)
  );

  const attendedStudents = new Set([
    ...presentStudents,
    ...lateStudents,
  ]);

  const registered = totalRegistered ?? 0;

  return {
    totalRegistered: registered,
    presentToday: presentStudents.size,
    lateToday: lateStudents.size,
    absentToday: Math.max(
      registered - attendedStudents.size,
      0
    ),
    cameraOnline: false,
    fps: 0,
    latencyMs: 0,
    modelVersion: "QR Attendance",
  };
}

// --------------------------------------------------
// STUDENT MANAGEMENT
// --------------------------------------------------

export async function getUsers(): Promise<LabUser[]> {
  const { data, error } = await supabase
    .from("students")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Could not load students: ${error.message}`);
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    studentId: row.student_id,
    name: row.name,
    department: row.department,
    email: row.email,
    enrolledPhotos: row.enrolled_photos ?? 0,
    active: row.active ?? true,
    createdAt: row.created_at ?? "",
  }));
}

export async function enrollUser(user: {
  studentId: string;
  name: string;
  department: string;
  email: string;
  enrolledPhotos?: number;
}): Promise<LabUser> {
  const { data, error } = await supabase
    .from("students")
    .insert({
      student_id: user.studentId.trim(),
      name: user.name.trim(),
      department: user.department.trim(),
      email: user.email.trim(),
      enrolled_photos: user.enrolledPhotos ?? 0,
      active: true,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Could not enroll student: ${error.message}`);
  }

  return {
    id: String(data.id),
    studentId: data.student_id,
    name: data.name,
    department: data.department,
    email: data.email,
    enrolledPhotos: data.enrolled_photos ?? 0,
    active: data.active ?? true,
    createdAt: data.created_at ?? "",
  };
}

export async function deleteUser(id: string): Promise<void> {
  const { error } = await supabase
    .from("students")
    .delete()
    .eq("id", id);

  if (error) {
    throw new Error(`Could not delete student: ${error.message}`);
  }
}

// --------------------------------------------------
// QR ATTENDANCE CHECK-IN
// --------------------------------------------------

export async function checkInByBadge(
  badgeId: string
): Promise<CheckIn> {
  const studentId = badgeId.trim();

  if (!studentId) {
    throw new Error("Invalid student ID.");
  }

  // Find registered student
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("*")
    .eq("student_id", studentId)
    .maybeSingle();

  if (studentError) {
    throw new Error(
      `Student lookup failed: ${studentError.message}`
    );
  }

  if (!student) {
    throw new Error(`No student registered for ID ${studentId}.`);
  }

  // Block inactive student
  if (student.active === false) {
    throw new Error("This student account is inactive.");
  }

  // Read duplicate timeout from application settings
  const currentSettings = await getSettings();

  const timeoutMinutes = Math.max(
    0,
    Number(currentSettings.duplicateTimeoutMinutes) || 0
  );

  // Check recent attendance for this student
  if (timeoutMinutes > 0) {
    const cutoff = new Date(
      Date.now() - timeoutMinutes * 60 * 1000
    ).toISOString();

    const { data: recentAttendance, error: duplicateError } =
      await supabase
        .from("attendance")
        .select("id, created_at")
        .eq("student_id", student.student_id)
        .gte("created_at", cutoff)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

    if (duplicateError) {
      throw new Error(
        `Could not check duplicate attendance: ${duplicateError.message}`
      );
    }

    if (recentAttendance) {
      throw new Error(
        `Attendance already recorded. Please try again after ${timeoutMinutes} minutes.`
      );
    }
  }

  // Save attendance
  const { data, error } = await supabase
    .from("attendance")
    .insert({
      student_id: student.student_id,
      student_name: student.name,
      status: "Present",
      method: "QR",
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Attendance save failed: ${error.message}`);
  }

  return {
    id: String(data.id),
    studentId: data.student_id,
    name: data.student_name,
    timestamp:
      data.attendance_date && data.attendance_time
        ? `${data.attendance_date}T${data.attendance_time}`
        : data.created_at ?? new Date().toISOString(),
    confidence: 1,
    status: normalizeStatus(data.status),
  };
}

// --------------------------------------------------
// ATTENDANCE LOGS
// --------------------------------------------------

export async function getLogs(filters?: {
  from?: string;
  to?: string;
  status?: string;
  query?: string;
}): Promise<AttendanceLog[]> {
  let query = supabase
    .from("attendance")
    .select("*")
    .order("attendance_date", { ascending: false })
    .order("attendance_time", { ascending: false });

  if (filters?.from) {
    query = query.gte("attendance_date", filters.from);
  }

  if (filters?.to) {
    query = query.lte("attendance_date", filters.to);
  }

  if (filters?.status && filters.status !== "all") {
    query = query.ilike("status", filters.status);
  }

  if (filters?.query?.trim()) {
    const search = filters.query.trim();

    query = query.or(
      `student_id.ilike.%${search}%,student_name.ilike.%${search}%`
    );
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(
      `Could not load attendance logs: ${error.message}`
    );
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    studentId: row.student_id,
    name: row.student_name,
    date: row.attendance_date,
    entryTime: row.attendance_time,
    exitTime: null,
    status: normalizeStatus(row.status),
  }));
}

// --------------------------------------------------
// EXPORT LOGS TO CSV
// --------------------------------------------------

export function logsToCsv(logs: AttendanceLog[]): string {
  const head = [
    "Date",
    "Student ID",
    "Name",
    "Entry Time",
    "Exit Time",
    "Status",
  ];

  const escapeCsv = (value: unknown) =>
    `"${String(value ?? "").replace(/"/g, '""')}"`;

  const rows = logs.map((log) => [
    log.date,
    log.studentId,
    log.name,
    log.entryTime,
    log.exitTime ?? "—",
    log.status,
  ]);

  return [head, ...rows]
    .map((row) => row.map(escapeCsv).join(","))
    .join("\n");
}

// --------------------------------------------------
// RECENT CHECK-INS
// --------------------------------------------------

export async function getCheckIns(): Promise<CheckIn[]> {
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(25);

  if (error) {
    throw new Error(
      `Could not load recent check-ins: ${error.message}`
    );
  }

  return (data ?? []).map((row) => ({
    id: String(row.id),
    studentId: row.student_id,
    name: row.student_name,
    timestamp:
      row.attendance_date && row.attendance_time
        ? `${row.attendance_date}T${row.attendance_time}`
        : row.created_at ?? "",
    confidence: 1,
    status: normalizeStatus(row.status),
  }));
}

// --------------------------------------------------
// SYSTEM SETTINGS
// --------------------------------------------------

export async function getSettings(): Promise<SystemSettings> {
  if (!USE_MOCK) {
    return request<SystemSettings>("/api/settings");
  }

  await delay(200);

  return { ...settings };
}

export async function updateSettings(
  next: SystemSettings
): Promise<SystemSettings> {
  if (!USE_MOCK) {
    return request<SystemSettings>("/api/settings", {
      method: "PUT",
      body: JSON.stringify(next),
    });
  }

  await delay(300);

  settings = { ...next };

  return { ...settings };
}

// --------------------------------------------------
// CAMERA CONNECTION TEST
// --------------------------------------------------

export async function testCameraConnection(
  rtspUrl: string
): Promise<{ ok: boolean; message: string }> {
  if (!rtspUrl.trim()) {
    return {
      ok: false,
      message: "RTSP URL is required.",
    };
  }

  if (!API_BASE_URL) {
    return {
      ok: false,
      message: "Camera backend is not configured.",
    };
  }

  try {
    const res = await fetch(
      `${API_BASE_URL}/api/camera/test`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ rtspUrl }),
      }
    );

    if (!res.ok) {
      return {
        ok: false,
        message: `Camera test failed: ${res.status} ${res.statusText}`,
      };
    }

    const data = await res.json();

    return {
      ok: data.ok ?? true,
      message: data.message ?? "Camera connection successful.",
    };
  } catch (error) {
    return {
      ok: false,
      message:
        error instanceof Error
          ? error.message
          : "Could not connect to camera backend.",
    };
  }
}
