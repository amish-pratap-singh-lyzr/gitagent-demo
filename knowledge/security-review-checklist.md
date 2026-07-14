# Security Review Checklist

Applied by the `security-scanner` sub-agent when
`security_sensitive_diff_detected` fires.

- [ ] No hardcoded secrets, API keys, or credentials in the diff
- [ ] User input reaching a query/command/template is parameterized, not
      string-concatenated (SQL, shell, LDAP, XPath injection)
- [ ] No untrusted-input deserialization without a schema/allowlist
- [ ] Auth/session logic changes are covered by a test that fails on the
      old behavior
- [ ] New third-party dependency isn't typosquatting an existing one
- [ ] No `eval`, dynamic `require`/`import`, or reflection on user input
