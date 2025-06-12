import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { Resend } from 'https://esm.sh/resend';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);
const resend = new Resend(Deno.env.get('RESEND_API_KEY')!);

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  const { email, type } = await req.json();

  if (!email || !type) {
    return new Response(JSON.stringify({ error: 'Email and type are required' }), { status: 400 });
  }

  try {
    let subject, html;
    if (type === 'reset') {
      subject = 'Reset Your Password';
      html = `<p>Click <a href="${new URL(`/reset-password?token=token`, Deno.env.get('SUPABASE_URL')).href}">here</a> to reset your password.</p>`;
    } else if (type === 'login') {
      subject = 'Your Login Details';
      html = `<p>Your account is ready! Use this email to log in at ${new URL('/', Deno.env.get('SUPABASE_URL')).href}. If you need to reset your password, follow the link below.</p><p><a href="${new URL(`/reset-password`, Deno.env.get('SUPABASE_URL')).href}">Reset Password</a></p>`;
    } else {
      return new Response(JSON.stringify({ error: 'Invalid email type' }), { status: 400 });
    }

    await resend.emails.send({
      from: 'admin@yourdomain.com', // Replace with your verified Resend sender email
      to: email,
      subject,
      html,
    });

    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Email sending error:', error);
    return new Response(JSON.stringify({ error: 'Failed to send email' }), { status: 500 });
  }
});