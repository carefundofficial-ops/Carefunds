# CareFund V34 — Profile, Settings, Account Recovery & Health Navigation

# CareFund V26 — Admin Login Diagnostic
This is based on V25 and keeps the heartbeat/session changes. It adds only safe login diagnostics (email/user ID/role, never password or token) to the Render log and browser console so the admin login path can be identified without changing CareFund functionality.


## CareFund email confirmation (V41)
The application uses Resend for registration confirmation, password reset, and new-device login emails.

Render environment variables:
- `RESEND_API_KEY` = your Resend API key
- `APP_BASE_URL` = `https://carefunds.onrender.com`
- `MAIL_FROM` = a sender address on a domain verified in Resend, for example `CareFund <no-reply@your-verified-domain.com>`
- `MAIL_REPLY_TO` = optional reply-to address

Important: do not set `MAIL_FROM` to a normal Gmail address unless that exact sending domain is supported/verified by your email provider. A custom domain is not required for the CareFund website itself, but Resend requires an appropriate verified sending identity for production email delivery to arbitrary users.
