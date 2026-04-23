# Security Specification

## Data Invariants

1. A user can only access their own profile.
2. A parent can only list and read student profiles where `parentEmail` strictly matches the parent's `request.auth.token.email` and their email is verified.
3. Badges are created by the server/client on achievement but cannot be updated once created.
4. Performance metrics can only be updated with exact schema boundaries.
5. All timestamps must strictly match `request.time`.

## The "Dirty Dozen" Payloads

1. Shadow Creation Payload: Adding `isAdmin: true` to user creation payload. (Should be rejected by `hasOnly` schema validation)
2. Role Spoofing (Student->Admin) update attempt. (Should be rejected because `role` cannot be mutated on update).
3. Spoofed Registration Email: Creating a student account assigning `parentEmail` to a parent without proper schema match. (Accepted only if perfectly valid schema).
4. Unverified Parent Data Scraping: `parentEmail` matches, but `email_verified` is false!
5. ID Poisoning: Try to create a badge with ID `../../users/...`. (Should be blocked by `isValidId` regex).
6. Missing Relational Link: Parent tries reading student they do not own.
7. Denial of Wallet: Array size explosion (No unbounded arrays exist in DB).
8. Immortal Field Edit: Try updating `createdAt`.
9. Time Traveler Edit: `updatedAt: "2010..."`. (Fails against `request.time`).
10. System-Only Field Write: Writing invalid badge.
11. PII Blanket Read check.
12. Null Pointer Exploit on read.

## The Test Runner

A test file `firestore.rules.test.ts` will verify all of these.
