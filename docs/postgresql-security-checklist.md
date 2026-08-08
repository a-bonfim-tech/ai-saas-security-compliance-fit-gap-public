# PostgreSQL Security Checklist

## Access Control

- [ ] Database users follow least privilege
- [ ] Administrative accounts restricted
- [ ] Application account separated from admin account
- [ ] Password policy reviewed

## Network Security

- [ ] Database not publicly exposed unless explicitly required
- [ ] TLS required where applicable
- [ ] Network access restricted by environment

## Data Protection

- [ ] Sensitive data identified
- [ ] Encryption at rest reviewed
- [ ] Backup encryption reviewed
- [ ] Retention rules defined

## Query Security

- [ ] ORM or parameterized queries used
- [ ] SQL injection risks reviewed
- [ ] Dangerous raw queries identified

## Logging and Monitoring

- [ ] Authentication logs reviewed
- [ ] Query logging approach defined
- [ ] Suspicious access monitoring considered

## Backup and Recovery

- [ ] Backups enabled
- [ ] Restore procedure documented
- [ ] Recovery time objective considered
- [ ] Recovery point objective considered
