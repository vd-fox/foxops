import { redirect } from 'next/navigation';
import { LoginForm } from '@/components/forms/LoginForm';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export default async function LoginPage() {
  const supabase = getSupabaseServerClient();
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (session) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('active')
      .eq('id', session.user.id)
      .single();

    if (profile?.active) {
      redirect('/dashboard');
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4">
      <div className="w-full max-w-xl rounded-lg bg-white p-8 shadow">
        <h1 className="mb-6 text-2xl font-semibold text-primary">FoxOps</h1>
        <LoginForm />
      </div>
    </div>
  );
}
