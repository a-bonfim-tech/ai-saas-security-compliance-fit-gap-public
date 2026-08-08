# Manual GitHub Commands

## View Repository

~~~bash
gh repo view --web
~~~

## View Repository Metadata

~~~bash
gh repo view --json nameWithOwner,visibility,isPrivate,url,description --jq '.'
~~~

## Add Repository Topics

GitHub CLI topic support may vary. If available, use:

~~~bash
gh repo edit --add-topic cybersecurity --add-topic compliance --add-topic grc --add-topic saas-security --add-topic ai-governance --add-topic typescript --add-topic devsecops
~~~

If the command fails, add topics manually in the GitHub web interface.

## Update Description

~~~bash
gh repo edit --description "AI-driven security and compliance fit-gap analysis lab for AI-enabled B2B SaaS products."
~~~

## Confirm Remote

~~~bash
git remote -v
~~~

## Confirm Tag

~~~bash
git tag --list
git ls-remote --tags origin
~~~

## Confirm Clean State

~~~bash
git status
~~~

## Final Verification

~~~bash
pnpm portfolio:final
~~~
