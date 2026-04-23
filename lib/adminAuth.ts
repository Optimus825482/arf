import "server-only";
import { applicationDefault, cert, getApps, initializeApp, type App } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { NextResponse } from "next/server";
import { ensureEnv } from "./env";
import firebaseConfig from "../firebase-applet-config.json";

let _app: App | null = null;
let _db: Firestore | null = null;

function getProjectId() {
  return (
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.GCLOUD_PROJECT ||
    process.env.GCP_PROJECT
  );
}

function getDatabaseId() {
  return process.env.FIREBASE_DATABASE_ID || firebaseConfig.firestoreDatabaseId;
}

function getAdminApp(): App | null {
  ensureEnv();
  if (_app) return _app;
  if (getApps().length > 0) {
    _app = getApps()[0];
    return _app;
  }
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    try {
      const creds = JSON.parse(raw);
      _app = initializeApp({
        credential: cert(creds),
        projectId: creds.project_id || getProjectId(),
      });
      return _app;
    } catch (e) {
      console.error("Firebase Admin init failed with FIREBASE_SERVICE_ACCOUNT:", e);
      return null;
    }
  }

  try {
    _app = initializeApp({
      credential: applicationDefault(),
      projectId: getProjectId(),
    });
    return _app;
  } catch (e) {
    console.error("Firebase Admin init failed with application default credentials:", e);
    return null;
  }
}

/** Admin Firestore instance — bypasses client-side security rules. */
export function getAdminDb(): Firestore {
  if (_db) return _db;

  const app = getAdminApp();
  if (!app)
    throw new Error(
      "Firebase Admin not initialised - configure FIREBASE_SERVICE_ACCOUNT or platform Google credentials",
    );

  const databaseId = getDatabaseId();
  _db = databaseId ? getFirestore(app, databaseId) : getFirestore(app);
  return _db;
}

export interface AuthedUser {
  uid: string;
  email?: string;
  role?: "student" | "parent" | "admin";
}

export async function verifyRequest(req: Request): Promise<AuthedUser | null> {
  const header =
    req.headers.get("authorization") || req.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  const token = header.slice(7).trim();
  if (!token) return null;

  const app = getAdminApp();
  if (!app) {
    // Dev / unconfigured env: fail closed unless explicitly opted in.
    if (process.env.ALLOW_UNVERIFIED_AUTH === "true") {
      if (process.env.NODE_ENV === "production") {
        console.error(
          "ALLOW_UNVERIFIED_AUTH must not be enabled in production. Ignoring.",
        );
        return null;
      }
      console.warn(
        "Firebase Admin not configured; allowing unverified auth (dev only).",
      );
      return { uid: "unverified", email: "dev@local" };
    }
    return null;
  }

  try {
    const decoded = await getAuth(app).verifyIdToken(token);
    return {
      uid: decoded.uid,
      email: decoded.email,
      role: decoded.role as AuthedUser["role"],
    };
  } catch (e) {
    console.error("Token verify failed:", e);
    return null;
  }
}

export function unauthorized() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

export function forbidden() {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export function adminUnavailable() {
  return NextResponse.json(
    { error: "Server auth/config is not ready. Firebase Admin credentials are missing." },
    { status: 503 },
  );
}
