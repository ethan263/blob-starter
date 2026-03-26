import { Storage } from "@google-cloud/storage";

const storage = new Storage({
  credentials: JSON.parse(process.env.GCP_CREDENTIALS || '{}'),
});

const bucket = storage.bucket(process.env.GCS_BUCKET || '');

export async function POST(req: Request) {
  const form = await req.formData();

  const file = form.get("file") as File;
  const metadata = JSON.parse(form.get("metadata") as string);

  const buffer = Buffer.from(await file.arrayBuffer());
  const fileName = `${Date.now()}-${file.name}`;

  const gcsFile = bucket.file(fileName);

  await gcsFile.save(buffer, {
    contentType: file.type,
  });

  // Optional but useful
  await gcsFile.makePublic();

  const fileUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;

  // 🔥 Trigger n8n
  await fetch(process.env.N8N_WEBHOOK_URL!, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      event: "video_uploaded",
      data: {
        fileUrl,
        fileName,
        ...metadata,
      },
      meta: {
        uploadedAt: new Date().toISOString(),
        source: "vercel-api",
      }
    }),
  });

  return Response.json({ success: true, fileUrl });
}
