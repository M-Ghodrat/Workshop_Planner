# Security Specification: UCW Workshop Planner

## 1. Data Invariants
1. **User Identity & Roles**: A user profile document `users/{userId}` can only be created by the authenticated owner (`request.auth.uid == userId`). The `role` field can only be updated by verified administrators or initialized during onboarding.
2. **Workshop Integrity**: A workshop document must have valid course prefix (max 10 chars), code (max 20 chars), title (max 200 chars), valid status, and valid `createdBy` UID.
3. **Collaboration & Access Control**: Access to view/edit a workshop is granted if the user is an Administrator OR if the user's UID is present in `assignedDeveloperIds` OR `createdBy == request.auth.uid`.
4. **Learning Outcomes Constraint**: Maximum of 6 learning outcomes per workshop, each requiring a valid Bloom's Taxonomy level.
5. **Materials & Storage**: Materials must link to a valid workshop and have an authenticated uploader UID.

## 2. The Dirty Dozen Payloads (Security Edge Cases Tested)
1. Unauthenticated read/write to `/workshops/{workshopId}` -> REJECTED.
2. Malicious user attempting to update someone else's workshop without being in `assignedDeveloperIds` -> REJECTED.
3. Developer attempting to elevate their own role to `administrator` in `/users/{userId}` -> REJECTED.
4. Payload with > 1.5MB junk string in workshop code or title -> REJECTED by size bounds.
5. Spoofed `createdBy` claiming to be another user's UID -> REJECTED.
6. Unauthenticated file download metadata query -> REJECTED.
7. Non-admin attempting to delete another developer's workshop -> REJECTED.
8. Updating immutable fields `id` or `createdAt` on workshop -> REJECTED.
9. Non-admin deleting workshop series created by another faculty member -> REJECTED.
10. Unassigned developer attempting to delete materials uploaded by another developer -> REJECTED.
11. Injection payload with invalid chars in document ID -> REJECTED.
12. Forging admin claims without authentic record in `users` collection or verified admin email -> REJECTED.
