import { insertQuery } from "./repo";
import { queryDb } from "./db";
import {
  validateDocument,
  type DocStatus,
  type DocType,
  type DriverDocument,
} from "./documents";

export {
  DOC_TYPES,
  latestVerified,
  validateDocument,
  type DocStatus,
  type DocType,
  type DriverDocument,
} from "./documents";

function rowToDoc(row: Record<string, unknown>): DriverDocument {
  return {
    id: String(row.id),
    driverId: String(row.driver_id),
    type: String(row.type) as DocType,
    fileKey: String(row.file_key),
    status: String(row.status) as DocStatus,
    expiryDate: row.expiry_date == null ? null : String(row.expiry_date).slice(0, 10),
    uploadedAt: new Date(row.uploaded_at as string).toISOString(),
  };
}

export async function listDriverDocuments(driverId: string): Promise<DriverDocument[]> {
  const rows = await queryDb<Record<string, unknown>>(
    "SELECT * FROM driver_documents WHERE driver_id = $1 ORDER BY uploaded_at DESC",
    [driverId],
  );
  return rows.map(rowToDoc);
}

export async function addDriverDocument(
  driverId: string,
  type: string,
  fileKey: string,
  expiryDate?: string,
): Promise<DriverDocument> {
  const clean = validateDocument({ type, expiryDate });
  const q = insertQuery(
    "driver_documents",
    ["id", "driver_id", "type", "file_key", "status", "expiry_date"],
    {
      id: `doc-${Date.now()}`,
      driver_id: driverId,
      type: clean.type,
      file_key: fileKey,
      status: "pending",
      expiry_date: clean.expiryDate,
    },
  );
  const rows = await queryDb<Record<string, unknown>>(q.text, q.values);
  return rowToDoc(rows[0]);
}

export async function setDocumentStatus(
  id: string,
  status: "verified" | "rejected",
  verifierId: string,
): Promise<DriverDocument> {
  const rows = await queryDb<Record<string, unknown>>(
    "UPDATE driver_documents SET status = $1, verified_by = $2 WHERE id = $3 RETURNING *",
    [status, verifierId, id],
  );
  if (rows.length === 0) throw new Error("document not found");
  return rowToDoc(rows[0]);
}

export async function getDocument(id: string): Promise<DriverDocument | null> {
  const rows = await queryDb<Record<string, unknown>>(
    "SELECT * FROM driver_documents WHERE id = $1",
    [id],
  );
  return rows.length > 0 ? rowToDoc(rows[0]) : null;
}

/** Fleet-wide docs for alerts (agency scope enforced upstream). */
export async function listFleetDocs(
  agencyUserId: string,
): Promise<(DriverDocument & { driverName: string })[]> {
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT dd.*, d.name AS driver_name FROM driver_documents dd
     JOIN drivers d ON d.id = dd.driver_id
     WHERE d.agency_user_id = $1 ORDER BY dd.uploaded_at DESC`,
    [agencyUserId],
  );
  return rows.map((r) => ({ ...rowToDoc(r), driverName: String(r.driver_name) }));
}

export interface PendingDoc extends DriverDocument {
  driverName: string;
}

/** Fleet-wide pending queue (agency scope enforced upstream). */
export async function listFleetPendingDocs(agencyUserId: string): Promise<PendingDoc[]> {
  const rows = await queryDb<Record<string, unknown>>(
    `SELECT dd.*, d.name AS driver_name FROM driver_documents dd
     JOIN drivers d ON d.id = dd.driver_id
     WHERE d.agency_user_id = $1 AND dd.status = 'pending'
     ORDER BY dd.uploaded_at DESC`,
    [agencyUserId],
  );
  return rows.map((r) => ({ ...rowToDoc(r), driverName: String(r.driver_name) }));
}
