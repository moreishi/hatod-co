import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3Client as S3ClientType,
} from "@aws-sdk/client-s3";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

const ALLOWED: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "application/pdf": ".pdf",
};

export interface UploadCheck {
  ok: boolean;
  reason?: string;
}

/** MIME gate (sniff bytes server-side too — see upload route). Rejects executables. */
export function checkUpload(contentType: string, size: number): UploadCheck {
  if (!ALLOWED[contentType]) return { ok: false, reason: `content type not allowed: ${contentType}` };
  if (size <= 0) return { ok: false, reason: "empty file" };
  if (size > MAX_UPLOAD_BYTES)
    return { ok: false, reason: `file exceeds ${MAX_UPLOAD_BYTES} bytes` };
  return { ok: true };
}

function safeId(raw: string): string {
  const clean = raw.replace(/[^a-zA-Z0-9_-]/g, "");
  if (!clean || clean !== raw) throw new Error(`invalid driver id: ${raw}`);
  return clean;
}

/** Traversal-safe object key: drivers/<id>/<type>/<ts>-<rand><ext>.
 *  Extension comes from the validated content type — filenames lie. */
export function buildDocKey(
  driverId: string,
  type: string,
  filename: string,
  contentType: string,
): string {
  const id = safeId(driverId);
  const safeType = type.replace(/[^a-z_]/g, "");
  void filename;
  const ext = ALLOWED[contentType];
  if (!ext) throw new Error(`content type not allowed: ${contentType}`);
  const stamp = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `drivers/${id}/${safeType}/${stamp}${ext}`;
}

export interface StorageProvider {
  readonly name: "local" | "r2";
  put(key: string, bytes: Uint8Array, contentType: string): Promise<void>;
  /** Returns file bytes for authenticated serving. */
  get(key: string): Promise<{ bytes: Uint8Array; contentType: string }>;
  delete(key: string): Promise<void>;
}

export class LocalStorage implements StorageProvider {
  readonly name = "local" as const;
  constructor(private dir = process.env.UPLOAD_DIR ?? "uploads") {}

  private path(key: string): string {
    if (key.includes("..")) throw new Error("bad key");
    return join(process.cwd(), this.dir, key);
  }

  async put(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    const p = this.path(key);
    await mkdir(join(p, ".."), { recursive: true });
    await writeFile(p, bytes);
    await writeFile(`${p}.meta`, contentType, "utf8");
  }

  async get(key: string): Promise<{ bytes: Uint8Array; contentType: string }> {
    const { readFile } = await import("node:fs/promises");
    const bytes = await readFile(this.path(key));
    const contentType = await readFile(`${this.path(key)}.meta`, "utf8").catch(
      () => "application/octet-stream",
    );
    return { bytes: new Uint8Array(bytes), contentType };
  }

  async delete(key: string): Promise<void> {
    const { unlink } = await import("node:fs/promises");
    await unlink(this.path(key));
  }
}

export class R2Storage implements StorageProvider {
  readonly name = "r2" as const;
  private client: S3ClientType | null = null;
  private bucket = process.env.R2_BUCKET ?? "";

  private getClient(): S3ClientType {
    if (!this.client) {
      const account = process.env.R2_ACCOUNT_ID ?? "";
      if (!account || !this.bucket) throw new Error("R2 not configured");
      this.client = new S3Client({
        region: "auto",
        endpoint: `https://${account}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
        },
      });
    }
    return this.client;
  }

  async put(key: string, bytes: Uint8Array, contentType: string): Promise<void> {
    await this.getClient().send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: contentType }),
    );
  }

  async get(key: string): Promise<{ bytes: Uint8Array; contentType: string }> {
    const res = await this.getClient().send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );
    const chunks: Uint8Array[] = [];
    const body = res.Body as AsyncIterable<Uint8Array>;
    for await (const c of body) chunks.push(c);
    const total = chunks.reduce((n, c) => n + c.length, 0);
    const out = new Uint8Array(total);
    let off = 0;
    for (const c of chunks) {
      out.set(c, off);
      off += c.length;
    }
    return { bytes: out, contentType: res.ContentType ?? "application/octet-stream" };
  }

  async delete(key: string): Promise<void> {
    await this.getClient().send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}

/** R2 when R2_ACCOUNT_ID is set, else local disk. Swap is env-only. */
export function getStorage(): StorageProvider {
  if (process.env.R2_ACCOUNT_ID) return new R2Storage();
  return new LocalStorage();
}
