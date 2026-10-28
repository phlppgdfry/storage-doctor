# Security

Run only against isolated local test environments using disposable credentials and dedicated buckets. The initial release rejects non-loopback targets. Do not tunnel a production system onto loopback and treat it as a test system.

Reports omit credentials and bodies by design, but retain local endpoint and bucket identities. Review them before sharing. Exported files, checksums and replay recipes are not independently authenticated evidence.

For suspected Storage Doctor vulnerabilities, do not publish secrets or exploit details in public issues. This local project has no published reporting contact yet; arrange a private reporting route before a public release.

For a suspected Supabase vulnerability, follow [Supabase's security policy](https://github.com/supabase/storage/blob/master/SECURITY.md). Do not publish exploit details or submit automated public findings.
