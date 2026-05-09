# Security Specification: FightNet

## Data Invariants
1. A **User** profile must match the authenticated `uid`.
2. A **Post** must be authored by the user who created it (`authorId == uid`).
3. **Sponsorship Applications** can only be created by fighters and read by the fighter or potentially a sponsor (though the current implementation is simple).
4. No user can change their `role` or `email` after registration (immutability).
5. All timestamps (`createdAt`) must be server-generated.

## The "Dirty Dozen" Payloads (Attack Vectors)

1. **User Spoofing**: Attempt to create a user profile with a different `uid` than the auth token.
2. **Role Escalation**: Attempt to update a user's `role` from 'fan' to 'sponsor'.
3. **Email Poaching**: Attempt to update another user's email.
4. **Shadow Post**: Create a post where `authorId` is another user's `uid`.
5. **Like Inflation**: Increment `likesCount` by 100 instead of 1.
6. **Malicious ID**: Create a document with a 2KB binary string as an ID.
7. **Junk Injection**: Add a `isVerified: true` field to a post.
8. **PII Leak**: Read another user's profile which contains their private email.
9. **State Shortcut**: Move a sponsorship application from 'rejected' back to 'pending'.
10. **Timestamp Fraud**: Submit a post with a `createdAt` from 2010.
11. **Massive Payload**: Submit a content string that is 1MB.
12. **Orphaned Post**: Create a post for a `uid` that doesn't exist in `/users`.

## Verification Status
- [x] Rules generated
- [x] ESLint passed
- [x] Tests passed
