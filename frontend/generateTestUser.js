import { createClient } from '@supabase/supabase-js';


(async () => {
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY,
  );

  const { data, error } = await supabase.auth.signUp({
    email: process.env.TEST_EMAIL,
    password: process.env.TEST_PASSWORD,
  });
  const userId = data.user?.id;
  console.log([
    "id,created_at,user_id,display_name,image_url,background_image_url,site_theme,is_admin,is_mod,deactivated,summary,subscribed_content_sources,patreon,organized_play_id,is_developer,is_community_paragon",
    `1,2024-04-03 21:30:01.720023+00,${userId},User Name,,,,false,false,false,,,,,true,`
  ].join('\n'));
})();