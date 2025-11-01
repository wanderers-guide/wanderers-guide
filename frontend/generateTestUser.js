import { createClient } from '@supabase/supabase-js';

(async () => {
  const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

  // Sign up the user
  const { error: signUpError } = await supabase.auth.signUp({
    email: process.env.TEST_EMAIL,
    password: process.env.TEST_PASSWORD,
  });

  if (signUpError) {
    console.error('Sign up error:', signUpError);
    process.exit(1);
  }

  // Query the user ID from auth.users table by email
  const { data: user, error: userError } = await supabase
    .from('auth.users')
    .select('id')
    .eq('email', process.env.TEST_EMAIL)
    .single();

  if (userError || !user) {
    console.error('Failed to fetch user:', userError);
    process.exit(1);
  }

  const userId = user.id;

  console.log(
    [
      'id,created_at,user_id,display_name,image_url,background_image_url,site_theme,is_admin,is_mod,deactivated,summary,subscribed_content_sources,patreon,organized_play_id,is_developer,is_community_paragon',
      `1,2024-04-03 21:30:01.720023+00,${userId},User Name,,,,false,false,false,,,,,true,`,
    ].join('\n')
  );
})();
