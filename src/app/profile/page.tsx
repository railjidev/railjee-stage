import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Navbar from '@/components/home/Navbar';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  /* AUTH DISABLED - Uncomment to re-enable authentication
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/auth/signin');
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <Navbar user={user} />
      <ProfileClient user={user} />
    </main>
  );
  */

  // Mock user for testing without auth
  const mockUser = {
    id: 'temp-user-id',
    email: 'temp@mail.com',
    user_metadata: {
      name: 'Temp User'
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-stone-50 to-white">
      <Navbar user={mockUser} />
      <ProfileClient user={mockUser} />
    </main>
  );
}
