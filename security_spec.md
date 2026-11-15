# Security Specification — Sofra Atlas Restaurant Membership

## 1. Data Invariants
1. A registered `/restaurants/{restaurantId}` document must have `restaurantId == request.auth.uid` and `ownerId == request.auth.uid` with a verified email (`request.auth.token.email_verified == true`).
2. PII (`contactEmail`, `contactPhone`, `streetAddress`, `taxId`) is strictly isolated in `/restaurants/{restaurantId}/private/contact`, readable and writable ONLY by the owning user (`request.auth.uid == restaurantId` and `ownerId == request.auth.uid`).
3. A `/dishes/{dishId}` document cannot exist without a registered parent restaurant (`/restaurants/$(incoming().restaurantId)`) belonging to `request.auth.uid`.
4. `ownerId`, `restaurantId`, and `createdAt` are immutable after creation; `createdAt` and `updatedAt` must equal `request.time`.
5. Public `list` queries on `/restaurants` and `/dishes` are rule-enforced against `resource.data.status == 'active'` and `resource.data.isPublished == true` (plus owner access and verified bootstrapped admin access).
6. Platform administration (`/admins/{adminId}` and cross-restaurant moderation) requires `request.auth.token.email_verified == true` and either the bootstrapped admin email (`cafersellii@gmail.com`) or an existing `/admins/{request.auth.uid}` record. Non-admins cannot self-assign admin privileges.
7. Customer orders (`/orders/{orderId}`) require verified sign-in (`ownerId == request.auth.uid`), strict bounded schema keys, and immutable `ownerId`/`orderNumber`/`createdAt`. Customers can only advance `status` while non-delivered; refunds (`paymentStatus`, `refundId`) are restricted to verified admins.
8. Saved payment cards (`/users/{userId}/savedCards/{cardId}`) store strictly tokenized metadata (`last4`, `brand`, `expiry`, `label`)—never raw PAN or CVV—and are readable/writable exclusively by `request.auth.uid == userId`.
9. Platform commission configuration (`/platformSettings/commission`) and per-restaurant commission overrides (`/restaurantCommissions/{restaurantId}`) contain zero PII, are strictly bounded (`restaurantCommissionPct` 0–50, `fixedCommissionTry` 0–5000, `customerServiceFeeTry` 0–1000, `courierSharePct` 0–50, `courierMinFeeTry` 0–1000, `minCommissionTry` 0–5000), require `updatedAt == request.time`, and are writable exclusively by verified admins (`isAdmin()`).

## 2. Dirty Dozen Adversarial Payloads
1. Unauthenticated create on `/restaurants/r1` -> PERMISSION_DENIED
2. Unverified email (`email_verified: false`) create on `/restaurants/{uid}` or admin spoof (`email == 'cafersellii@gmail.com'`, `email_verified: false`) -> PERMISSION_DENIED
3. Identity spoofing (`ownerId != request.auth.uid`) on `/restaurants/{uid}` or `/orders/{orderId}` -> PERMISSION_DENIED
4. Shadow field injection (`isVerified: true` or raw `cvv`) on `/restaurants/{uid}` or `/users/{uid}/savedCards/{cardId}` -> PERMISSION_DENIED
5. Reading `/restaurants/{otherUid}/private/contact` or `/users/{otherUid}/savedCards/{cardId}` as non-owner -> PERMISSION_DENIED
6. Writing `/restaurants/{otherUid}/private/contact` or `/users/{otherUid}/savedCards/{cardId}` -> PERMISSION_DENIED
7. Orphaned dish creation referencing non-existent `restaurantId` -> PERMISSION_DENIED
8. Client-forged timestamp (`createdAt != request.time`) -> PERMISSION_DENIED
9. Updating immutable `ownerId`, `orderNumber`, or `createdAt` on `/dishes/{dishId}` or `/orders/{orderId}` -> PERMISSION_DENIED
10. Oversized string (> 240 chars in `description`) or empty `itemsSummary` array -> PERMISSION_DENIED
11. Resource poisoning with >128 char invalid document ID -> PERMISSION_DENIED
12. Non-admin self-registration in `/admins/{uid}`, customer modifying `paymentStatus`/`refundId` on `/orders/{orderId}`, or non-admin / out-of-bounds write (`restaurantCommissionPct: 99`) to `/platformSettings/commission` or `/restaurantCommissions/{restaurantId}` -> PERMISSION_DENIED
