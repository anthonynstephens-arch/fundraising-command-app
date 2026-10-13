# Authentication email BCC

Application emails already use `emailSender()` and BCC anthony@detroitdecalandapparel.com.

The authentication email bridge is deployed, but Supabase's Send Email Hook must be enabled separately. This is a dashboard configuration, not a database migration setting.

1. Open the Fundraiser Command Supabase project (`cuzxnryslupnrlasntxl`).
2. Open Authentication > Hooks > Send Email.
3. Choose a Postgres function, schema `public`, function `queue_auth_email`, and enable the hook.
4. Keep the Email provider enabled. The hook replaces Supabase's SMTP delivery for auth messages.

The function queues signup confirmation, invitations, password recovery, magic links, email changes, reauthentication codes, and security notices. The production `/api/cron/auth-emails` worker processes the queue every minute using the same SMTP sender and BCC rule. Secure email changes send separate messages to old and new addresses with the correct token mapping.

Pending tokens are accessible only to the service role, cleared after delivery or final failure, and removed after expiration. The hook can only be called by Supabase Auth. Confirmation links return to the Fundraiser Command domain.

After enabling the hook, request a real confirmation or recovery email and check both recipient and BCC delivery. No synthetic users or outgoing test emails were created during implementation. Disable the hook to restore Supabase-managed SMTP delivery if needed.
