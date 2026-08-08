# Next.js Security Checklist

## Authentication

- [ ] Authentication mechanism documented
- [ ] Session management reviewed
- [ ] Secure cookies configured
- [ ] Logout behavior verified
- [ ] MFA considered for privileged users

## Authorization

- [ ] API routes protected
- [ ] Role-based access enforced
- [ ] Server-side authorization checks implemented
- [ ] Horizontal privilege escalation risks reviewed

## Input and Output Handling

- [ ] Input validation implemented
- [ ] Output encoding considered
- [ ] XSS risks reviewed
- [ ] SQL injection risks reviewed
- [ ] Server-side request forgery risks reviewed

## Secrets

- [ ] Secrets stored outside source code
- [ ] Environment variables reviewed
- [ ] .env files excluded from Git
- [ ] Production secrets separated from development secrets

## Logging and Errors

- [ ] Security-relevant events logged
- [ ] Sensitive data excluded from logs
- [ ] Error messages do not leak internal details
- [ ] Authentication failures logged

## Dependencies

- [ ] npm/pnpm dependencies scanned
- [ ] Lockfile committed
- [ ] Vulnerable packages reviewed
- [ ] Unused packages removed
