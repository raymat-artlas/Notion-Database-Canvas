const { createClient } = require('@supabase/supabase-js');

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.log('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(url, key);

async function checkUser() {
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('email', 'ray.matsuura.01@gmail.com')
    .single();
    
  if (error) {
    console.log('Error:', error);
  } else {
    console.log('Current user data:');
    console.log('effective_plan:', data.effective_plan);
    console.log('plan:', data.plan);
    console.log('plan_source:', data.plan_source);
    console.log('trial_expires_at:', data.trial_expires_at);
    console.log('active_trial_code:', data.active_trial_code);
  }
}

checkUser();