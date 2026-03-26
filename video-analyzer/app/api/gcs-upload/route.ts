import { Storage } from '@google-cloud/storage';
import { NextResponse } from 'next/server';

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  credentials: {
    client_email: process.env.GCP_CLIENT_EMAIL,
    // Replace literal "\n" strings from env files to proper newlines
    private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  },
});

export async function POST(request: Request) {
  try {
    const { filename, contentType } = await request.json();
    if (!filename) {
      return NextResponse.json({ error: 'Filename is required' }, { status: 400 });
    }

    const bucketName = process.env.GCS_BUCKET_NAME;
    if (!bucketName) {
      throw new Error('GCS_BUCKET_NAME is missing');
    }

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(`uploads/${Date.now()}-${filename}`);
    
    // Generate a signed URL allowing the client to PUT the file
    const [url] = await file.getSignedUrl({
      version: 'v4',
      action: 'write',
      expires: Date.now() + 15 * 60 * 1000, // 15 minutes
      contentType,
    });

    return NextResponse.json({ 
      uploadUrl: url, 
      fileName: file.name,
      // Default public mapping assuming the bucket is public-read or using uniform access
      publicUrl: `https://storage.googleapis.com/${bucketName}/${file.name}`
    });
  } catch (error) {
    console.error('Error generating signed URL:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to generate signed URL' }, { status: 500 });
  }
}
