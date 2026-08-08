# GitHub Evidence Collector

## Purpose

This directory documents the planned GitHub evidence collection process for the AI SaaS Security & Compliance Fit-Gap Analysis repository.

The goal is to collect GitHub repository and organization security evidence that can be mapped to controls such as secure software development, vulnerability management, access control and secrets management.

## Evidence Targets

The collector should eventually capture evidence for:

- Branch protection
- Required pull request reviews
- CODEOWNERS configuration
- Dependabot configuration
- CodeQL configuration
- Dependency review configuration
- Secret scanning
- Push protection
- Repository visibility
- Security policy file
- GitHub Actions workflow security
- Repository collaborators and permissions
- MFA enforcement at organization level, where available

## Current Status

This is a documentation-first collector. It defines the expected evidence model before implementing automated API collection.

## Future Implementation Options

The collector can be implemented using:

- GitHub CLI
- GitHub REST API
- GitHub GraphQL API
- Octokit
- GitHub Actions scheduled workflow

## Evidence Mapping

| Evidence Key | GitHub Evidence Source | Related Control |
|---|---|---|
| branch_protection_enabled | Branch protection settings | SDLC-001 |
| pull_request_reviews_required | Branch protection review rules | SDLC-001 |
| codeowners_configured | CODEOWNERS file | SDLC-001 |
| dependabot_enabled | .github/dependabot.yml | VULN-001 |
| codeql_enabled | .github/workflows/codeql.yml | VULN-001 |
| dependency_review_enabled | GitHub dependency review workflow | VULN-001 |
| security_policy_exists | SECURITY.md | GOV-001 |
| secret_scanning_enabled | GitHub security settings | VULN-001 |
| push_protection_enabled | GitHub security settings | VULN-001 |
