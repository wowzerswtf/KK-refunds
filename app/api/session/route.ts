import { NextRequest, NextResponse } from 'next/server';
import { createSession, getSession } from '@/lib/sessionStore';
import { parseCSV } from '@/lib/csvParser';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const clientName = formData.get('clientName') as string;
    const agentName = (formData.get('agentName') as string) || 'Walter';
    const loginId = formData.get('loginId') as string;
    const password = formData.get('password') as string;

    if (!file || !clientName || !loginId || !password) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const csvText = await file.text();
    const { orders, stats } = parseCSV(csvText);

    const session = createSession({
      clientName,
      agentName,
      csvFileName: file.name,
      totalRows: stats.total,
      cleanCount: stats.clean,
      longIdCount: stats.longId,
      shortIdCount: stats.shortId,
      orders,
      credentials: { loginId, password },
    });

    // Return session without credentials
    const { credentials: _creds, ...safe } = session;
    void _creds;
    return NextResponse.json(safe);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing session ID' }, { status: 400 });
  }

  const session = getSession(id);
  if (!session) {
    return NextResponse.json({ error: 'Session not found' }, { status: 404 });
  }

  const { credentials: _creds, ...safe } = session;
    void _creds;
  return NextResponse.json(safe);
}
