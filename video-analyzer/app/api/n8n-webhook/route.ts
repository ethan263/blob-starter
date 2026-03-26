import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    const webhookUrl = process.env.N8N_WEBHOOK_URL;
    if (!webhookUrl) {
      throw new Error('N8N_WEBHOOK_URL is missing in environment variables');
    }

    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('n8n error response:', errorText);
      throw new Error(`n8n webhook responded with status ${n8nResponse.status}`);
    }

    return NextResponse.json({ success: true, message: 'Data pushed to n8n' });
  } catch (error) {
    console.error('n8n webhook error:', error);
    return NextResponse.json({ error: (error as Error).message || 'Failed to forward data to n8n' }, { status: 500 });
  }
}
