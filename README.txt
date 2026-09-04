SHEKINAH PHARMACY - CEO STAFF AUTH BACKEND

This package connects ceo-module.js to the Supabase Edge Function manage-staff-auth.

FILES
- ceo-module.js
- supabase/config.toml
- supabase/functions/manage-staff-auth/index.ts

WHAT IT ENABLES
- CEO creates a staff login and can enter the initial password.
- CEO can set a password for an existing linked staff login.
- CEO can send password reset emails.
- CEO can remove login access.
- CEO can remove/archive staff while preserving historical records.

DEPLOYMENT
1. Upload this folder to your private GitHub repository.
2. Install/login to Supabase CLI.
3. Link the repository/project as your deployment workflow requires.
4. Deploy the function:
   supabase functions deploy manage-staff-auth
5. The function name must remain exactly: manage-staff-auth

SUPABASE SECRETS
The Edge Function requires:
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY

Supabase normally provides these project variables to Edge Functions. Verify them in the Supabase project before testing.

SECURITY
- The service-role key is used only inside the Edge Function.
- NEVER place SUPABASE_SERVICE_ROLE_KEY in ceo-module.js or any GitHub Pages frontend file.
- ceo-module.js uses the public Supabase publishable/anon key and the signed-in CEO access token.

FRONTEND
The JavaScript calls:
https://YOUR_PROJECT.supabase.co/functions/v1/manage-staff-auth

The existing ceo-module.js already uses the project URL/key and sends the CEO session token to the function.
