const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

const supabaseUrl = 'https://hhabjtdapcosifnnsnzp.supabase.co';
const supabaseServiceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhoYWJqdGRhcGNvc2lmbm5zbnpwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0OTIyMTE0OSwiZXhwIjoyMDY0Nzk3MTQ5fQ.YGCnKDIa8LeglUzG3VvJbDQXqLf65eUinVB40TpWQ2c';

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function updateAdminPassword() {
  try {
    const password = 'Rayraymat010!';
    const hash = await bcrypt.hash(password, 10);
    
    console.log('Generated hash:', hash);
    
    const { data, error } = await supabase
      .from('admin_users')
      .update({ password_hash: hash })
      .eq('email', 'ray@artlas.jp')
      .select();
    
    if (error) {
      console.error('Error updating password:', error);
    } else {
      console.log('Password updated successfully:', data);
    }
  } catch (err) {
    console.error('Script error:', err);
  }
}

updateAdminPassword();