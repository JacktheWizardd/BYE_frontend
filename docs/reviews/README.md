# Student reviews

## What we built and why

The website owns school-email review writing and the same-origin `/api/reviews/*` endpoints used to resolve identities and read public BYE feedback. Sessions stay in HttpOnly cookies; browser code does not receive privileged database credentials. BYE review evidence stays independent from RMP.

## How it works

- [Submission, sessions and setup](REVIEW_SUBMISSION.md)
- [Review verification records](REVIEW_VERIFICATION.md)
- [Security review](../operations/SECURITY_REVIEW.md)
- [Database decisions in the sibling desktop repo](../../../BYE_Before_You_Enroll/docs/reviews/README.md)
- [Shared review presentation](../shared-ui/README.md)

Website owns browser routes and APIs. Desktop owns Windows read integration and historical database guides. Verification records use their stated test dates; do not copy student content, addresses, codes or credentials into docs.

## What remains

Operational moderation, retention and live acceptance must follow current evidence and authorization. Native login/submission/reporting are outside the Windows read-integration phase.

[All documents](../README.md)
