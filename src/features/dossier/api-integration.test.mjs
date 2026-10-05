import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { createServer } from 'vite'
import { QueryClient } from '@tanstack/react-query'

const server = await createServer({ server: { middlewareMode: true }, appType: 'custom' })
after(() => server.close())
const contract = () => server.ssrLoadModule('/src/features/dossier/lib/backend-contract.ts')

test('rejected dossier permits correction, specialist review and explicit readiness', async () => {
  const constants = await server.ssrLoadModule('/src/features/dossier/constants.ts')
  const policy = await server.ssrLoadModule('/src/features/dossier/lib/document-review.ts')
  const dossier = { status: 'REJECTED', writeLocked: false, mandatoryTotal: 1, mandatorySatisfiedOrWaived: 1 }
  assert.equal(constants.canUploadInitialDocument('CUSTOMER', dossier, { status: 'PENDING', document: null }), true)
  assert.ok(constants.getCustomerDocumentActions(dossier, { status: 'REJECTED', document: { status: 'REJECTED' } }).includes('Update Document'))
  assert.equal(policy.canOpenDocumentReview('TRANSPORT_SPECIALIST', dossier, { status: 'PROVIDED', document: { status: 'PROVIDED' } }), true)
  assert.equal(policy.canMarkReadyForSubmission('TRANSPORT_SPECIALIST', dossier), true)
  assert.equal(constants.canSendMissingDocumentReminder('TRANSPORT_SPECIALIST', dossier), false)
})

test('business upload sends only ordered confirmed publicIds and supported metadata', async () => {
  const { serializeDocumentSubmission } = await contract()
  assert.deepEqual(serializeDocumentSubmission([{ publicId: 'first', fileName: 'private.pdf', mimeType: 'application/pdf', fileSizeBytes: 3 }], {
    documentName: 'ignored', note: 'ignored', documentNumber: ' A ', issuingAuthority: ' B ', issuedDate: '2026-01-01', expiryDate: '', uploadNote: ' C ',
  }), { files: [{ publicId: 'first' }], documentNumber: 'A', issuingAuthority: 'B', issuedDate: '2026-01-01', uploadNote: 'C' })
  assert.throws(() => serializeDocumentSubmission([{ publicId: 'same' }, { publicId: 'same' }], {}))
  assert.throws(() => serializeDocumentSubmission(Array.from({ length: 11 }, (_, i) => ({ publicId: String(i) })), {}))
})

test('overview preserves authoritative progress and unknown booking information', async () => {
  const { mapBackendDossierOverview } = await contract()
  const overview = mapBackendDossierOverview({ isInitialized: true, complianceDossierId: '11111111-1111-4111-8111-111111111111', bookingId: '22222222-2222-4222-8222-222222222222', bookingCode: 'BK', dossierCode: 'CD', status: 'IN_PREPARATION', completionPercent: 33.333, fulfilledCount: 1, requirementCount: 3, tripRequirements: [], horseRequirements: [], actions: { canUpload: true, canReview: false } })
  assert.equal(overview.progressPercent, 33.333)
  assert.equal(overview.openedAt, null)
  assert.equal(overview.bookingSummary.bookingStatus, null)
  assert.equal(overview.bookingSummary.requestedDepartureDate, null)
})

test('history uses protected canonical preview URLs and keeps timestamps exact', async () => {
  const { mapBackendDocumentVersions } = await contract()
  const timestamp = '2026-10-05T10:20:30.1234567'
  const versionId = '11111111-1111-4111-8111-111111111111'
  const attachmentId = '22222222-2222-4222-8222-222222222222'
  const versions = mapBackendDocumentVersions([{ documentVersionId: versionId, versionNo: 2, uploadedAt: timestamp, uploadNote: null, files: [{ documentAttachmentId: null, fileName: 'main.pdf', mimeType: 'application/pdf', fileSizeBytes: 1, readUrl: 'https://secret.example/signed' }, { documentAttachmentId: attachmentId, fileName: 'attachment.pdf', mimeType: 'application/pdf', fileSizeBytes: 2, readUrl: 'https://secret.example/signed2' }], reviews: [] }], 'd', 'r')
  assert.equal(versions[0].uploadedAt, timestamp)
  assert.equal(versions[0].files[0].fileUrl, `/api/v1/compliance-dossiers/d/requirements/r/versions/${versionId}/preview`)
  assert.equal(versions[0].files[1].fileUrl, `/api/v1/compliance-dossiers/d/requirements/r/versions/${versionId}/attachments/${attachmentId}/preview`)
  assert.ok(!JSON.stringify(versions).includes('secret.example'))
})

test('production dossier source is API even with dev mock flags', async () => {
  const { resolveDossierSource } = await server.ssrLoadModule('/src/features/dossier/source.ts')
  assert.equal(resolveDossierSource(true, 'true'), 'api')
})

test('uninitialized and inaccessible dossiers retain meaningful load errors', async () => {
  const { getDossierLoadErrorKind } = await server.ssrLoadModule('/src/features/dossier/source.ts')
  assert.equal(getDossierLoadErrorKind(new Error('DOSSIER_NOT_INITIALIZED')), 'not-found')
  assert.equal(getDossierLoadErrorKind({ response: { status: 403 } }), 'forbidden')
  assert.equal(getDossierLoadErrorKind({ response: { status: 401 } }), 'unauthorized')
})

test('UUID horse selections reset pagination without deriving options from the current page', async () => {
  const { getDossierHorseFilterOptions, reconcileDossierHorseFilter, updateDossierRequirementFilters } = await server.ssrLoadModule('/src/features/dossier/constants.ts')
  const horses = [{ horseId: '11111111-1111-4111-8111-111111111111', horseName: 'First' }, { horseId: '22222222-2222-4222-8222-222222222222', horseName: 'Second' }]
  const params = { pageIndex: 4, pageSize: 5, sortBy: 'createdAt:asc', horseId: horses[1].horseId }
  assert.equal(getDossierHorseFilterOptions(horses).length, 3)
  assert.equal(reconcileDossierHorseFilter(params, horses), params)
  assert.deepEqual(reconcileDossierHorseFilter(params, [horses[0]]), { ...params, pageIndex: 1, horseId: undefined })
  assert.deepEqual(updateDossierRequirementFilters(params, { status: 'REQUESTED' }), { ...params, pageIndex: 1, status: 'REQUESTED' })
})

test('request guard permits only one in-flight business mutation even after reset', async () => {
  const { createRequestAttemptGuard } = await server.ssrLoadModule('/src/shared/hooks/request-attempt-guard.ts')
  const guard = createRequestAttemptGuard()
  let finish
  let calls = 0
  const first = guard.run(() => { calls++; return new Promise((resolve) => { finish = resolve }) })
  guard.reset()
  assert.deepEqual(await guard.run(async () => { calls++; }), { started: false })
  finish('saved')
  assert.deepEqual(await first, { started: true, value: 'saved' })
  assert.equal(calls, 1)
  guard.reset()
})

const dossierId = '11111111-1111-4111-8111-111111111111'
const requirementId = '22222222-2222-4222-8222-222222222222'
const versionId = '33333333-3333-4333-8333-333333333333'
const documentId = '44444444-4444-4444-8444-444444444444'
const reviewId = '55555555-5555-4555-8555-555555555555'
const uploadedAt = '2026-10-05T10:20:30.1234567Z'
const requirement = { dossierRequirementId: requirementId, complianceRequirementId: reviewId, requirementCode: 'REQ', requirementName: 'Certificate', horseId: null, horseName: null, isMandatory: true, status: 'PROVIDED', dueDate: null, leadTimeDays: null, instruction: null, openDocumentRequest: null }
const upload = { dossierRequirementId: requirementId, complianceDocumentId: documentId, documentVersionId: versionId, versionNo: 2, isNewVersion: false, status: 'PROVIDED', files: [{ documentAttachmentId: null, fileName: 'main.pdf', mimeType: 'application/pdf', fileSizeBytes: 1, readUrl: 'https://private.invalid/signed', readUrlExpiresAt: uploadedAt }] }
const success = (value) => ({ isSuccess: true, code: 200, message: 'Saved', value })

async function interceptApi(run) {
  const { default: client } = await server.ssrLoadModule('/src/lib/axios.ts')
  const { dossierService } = await server.ssrLoadModule('/src/features/dossier/services.ts')
  const previous = client.defaults.adapter
  const requests = []
  let respond = () => success(null)
  client.defaults.adapter = async (config) => {
    requests.push({ method: config.method, url: config.url, params: config.params, body: config.data === undefined ? undefined : JSON.parse(config.data) })
    return { status: 200, statusText: 'OK', headers: {}, config, data: respond(config) }
  }
  try { await run(dossierService, requests, (resolver) => { respond = resolver }) } finally { client.defaults.adapter = previous }
}

test('UC21/22 sends singular nested endpoints, strips display fields, computes mode from backend', async () => {
  await interceptApi(async (service, requests, respond) => {
    respond(() => success(upload))
    const context = { dossierId, requirementId, documentId, files: [{ publicId: 'ref', fileName: 'main.pdf', mimeType: 'application/pdf', fileSizeBytes: 1 }], metadata: { documentName: 'display', documentNumber: '123', issuingAuthority: 'Authority', issuedDate: '2020-01-01', expiryDate: '', uploadNote: 'New scan' } }
    const initial = await service.uploadComplianceDocument(context)
    assert.equal(requests[0].url, `compliance-dossiers/${dossierId}/requirements/${requirementId}/document`)
    assert.deepEqual(requests[0].body, { files: [{ publicId: 'ref' }], documentNumber: '123', issuingAuthority: 'Authority', issuedDate: '2020-01-01', uploadNote: 'New scan' })
    assert.ok(!JSON.stringify(initial).includes('private.invalid'))
    const result = await service.submitDocumentVersion(context)
    assert.equal(requests[1].url, `compliance-dossiers/${dossierId}/requirements/${requirementId}/document/versions`)
    assert.equal(result.mode, 'EDIT_IN_PLACE')
    assert.equal(requests[1].body.mode, undefined)
    respond(() => success({ complianceDocumentId: documentId, documentNumber: 'new', issuingAuthority: 'Authority', issuedDate: '2020-01-01', expiryDate: null, status: 'PROVIDED' }))
    await service.updateComplianceDocumentMetadata({ dossierId, requirementId, documentId, changes: { documentName: 'ignored', note: 'ignored', documentNumber: 'new' } })
    assert.equal(requests[2].method, 'patch')
    assert.equal(requests[2].url, `compliance-dossiers/${dossierId}/requirements/${requirementId}/document/metadata`)
    assert.deepEqual(requests[2].body, { documentNumber: 'new' })
  })
})

test('UC23 review uses exact timestamps, numeric enums, nested approve/reject/revoke and readiness POST without body', async () => {
  await interceptApi(async (service, requests, respond) => {
    const result = { review: { documentReviewId: reviewId, reviewedByAccountId: reviewId, result: 'APPROVED', reviewComment: null, reviewedAt: uploadedAt }, requirementStatus: 'SATISFIED', documentStatus: 'APPROVED', dossierStatus: 'IN_PREPARATION' }
    respond(() => success(result))
    await service.reviewComplianceDocument({ dossierId, requirementId, versionId, review: { result: 'APPROVED', metadataConfirmed: true, versionUploadedAt: uploadedAt, documentUpdatedAt: uploadedAt } })
    assert.equal(requests[0].url, `compliance-dossiers/${dossierId}/requirements/${requirementId}/versions/${versionId}/approve`)
    assert.deepEqual(requests[0].body, { metadataConfirmed: true, versionUploadedAt: uploadedAt, documentUpdatedAt: uploadedAt })
    const rejection = { result: 'REJECTED', errorCategory: 3, rejectionNote: 'Please upload stamped copy', revisionDeadline: '2099-01-01', requirementStatus: 5, dossierStatus: 2, versionUploadedAt: uploadedAt, documentUpdatedAt: uploadedAt }
    respond(() => success({ ...result, requirementStatus: 'REJECTED', documentStatus: 'REJECTED', emailSent: false, deliveryWarning: 'Email pending' }))
    const rejected = await service.reviewComplianceDocument({ dossierId, requirementId, versionId, review: rejection })
    assert.equal(requests[1].url, `compliance-dossiers/${dossierId}/requirements/${requirementId}/versions/${versionId}/reject`)
    assert.equal(requests[1].body.result, undefined)
    assert.equal(requests[1].body.errorCategory, 3)
    assert.equal(rejected.value.deliveryWarning, 'Email pending')
    respond(() => success(result))
    await service.revokeDocumentReview({ dossierId, requirementId, versionId, reviewId, review: { status: 3, reason: 'Approval must be revoked' } })
    assert.equal(requests[2].url, `compliance-dossiers/${dossierId}/requirements/${requirementId}/versions/${versionId}/reviews/${reviewId}/revoke`)
    respond(() => success({ complianceDossierId: dossierId, status: 'READY_FOR_SUBMISSION', readyForSubmissionAt: uploadedAt }))
    await service.markReadyForSubmission(dossierId)
    assert.equal(requests[3].method, 'post')
    assert.equal(requests[3].body, undefined)
  })
})

test('UC20 filters overview and hydrates only visible requirement detail', async () => {
  await interceptApi(async (service, requests, respond) => {
    respond((config) => config.url.endsWith(`/requirements/${requirementId}`) ? success({ requirement, validUntil: null, satisfiedAt: null, waivedReason: null, document: null, documentRequests: [], actions: { canUpload: true, canReview: false } }) : success({ isInitialized: true, bookingId: documentId, bookingCode: 'BK', complianceDossierId: dossierId, dossierCode: 'CD', status: 'IN_PREPARATION', fulfilledCount: 0, requirementCount: 1, completionPercent: 0, tripRequirements: [requirement], horseRequirements: [], actions: { canUpload: true, canReview: false } }))
    const result = await service.getRequirements(dossierId, { status: 'PROVIDED', pageIndex: 1, pageSize: 20, sortBy: 'status:asc' })
    assert.equal(requests[0].url, `compliance-dossiers/${dossierId}`)
    assert.deepEqual(requests[0].params, { status: 'PROVIDED', horseId: undefined })
    assert.equal(requests[1].url, `compliance-dossiers/${dossierId}/requirements/${requirementId}`)
    assert.equal(result.items[0].actions.canUpload, true)
  })
})

test('UC24/25 comments and missing reminders use backend routes and delivery warnings', async () => {
  await interceptApi(async (service, requests, respond) => {
    respond(() => success([]))
    await service.getDocumentRequestComments(dossierId, requirementId, reviewId)
    await service.addDocumentRequestComment({ dossierId, requirementId, requestId: reviewId, message: ' Customer reply ' })
    assert.equal(requests[0].url, `compliance-dossiers/${dossierId}/requirements/${requirementId}/document-requests/${reviewId}/comments`)
    assert.deepEqual(requests[1].body, { message: 'Customer reply' })
    await service.getMissingRequirements(dossierId)
    assert.equal(requests[2].url, `compliance-dossiers/${dossierId}/missing-requirements`)
    respond(() => success({ reminderId: reviewId, requirements: [{ ...requirement, status: 'REQUESTED' }], emailSent: false, deliveryWarning: 'Queued' }))
    const response = await service.sendMissingRequirementReminder({ dossierId, reminder: { requirementIds: [requirementId], dueDate: '2099-01-01', note: 'Reminder' } })
    assert.equal(requests[3].url, `compliance-dossiers/${dossierId}/missing-document-reminders`)
    assert.deepEqual(requests[3].body, { requirementIds: [requirementId], dueDate: '2099-01-01', note: 'Reminder' })
    assert.equal(response.value.deliveryWarning, 'Queued')
  })
})

test('submission validation requires initial metadata but allows empty edit metadata and strict expiry boundary', async () => {
  const { createDocumentSubmissionSchema } = await server.ssrLoadModule('/src/features/dossier/schemas.ts')
  assert.equal(createDocumentSubmissionSchema(null, null, 'initial').safeParse({}).success, false)
  assert.equal(createDocumentSubmissionSchema(null, null, 'update').safeParse({ documentNumber: null, issuingAuthority: null, issuedDate: null, expiryDate: null }).success, true)
  const metadata = { documentNumber: '123', issuingAuthority: 'Authority', issuedDate: '2020-01-01', expiryDate: '2099-01-01' }
  assert.equal(createDocumentSubmissionSchema(null, '2099-01-01', 'initial').safeParse(metadata).success, false)
  assert.equal(createDocumentSubmissionSchema('2099-01-01', '2098-01-01', 'initial').safeParse(metadata).success, true)
  assert.equal(createDocumentSubmissionSchema(null, null, 'initial').safeParse({ ...metadata, issuedDate: '2999-01-01' }).success, false)
})

test('requirement detail preserves OPEN requests despite APPROVED document and keeps all review history', async () => {
  const { mapBackendRequirementDetail } = await contract()
  const request = { documentRequestId: reviewId, requestCode: 'REQ-1', status: 'OPEN', errorCategory: 'MISSING_STAMP', message: 'Please provide stamped copy', dueDate: '2099-01-01', requestedAt: uploadedAt }
  const review = { documentReviewId: reviewId, reviewedByAccountId: documentId, result: 'APPROVED', reviewComment: null, reviewedAt: uploadedAt }
  const raw = { requirement: { ...requirement, status: 'SATISFIED' }, validUntil: '2099-01-01', satisfiedAt: uploadedAt, waivedReason: null, documentRequests: [request], actions: { canUpload: false, canReview: true }, document: { complianceDocumentId: documentId, documentCode: 'DOC', documentName: 'Certificate', status: 'APPROVED', documentNumber: '123', issuingAuthority: 'Authority', issuedDate: '2020-01-01', expiryDate: '2099-01-01', note: null, updatedAt: uploadedAt, versions: [{ documentVersionId: versionId, versionNo: 1, fileName: 'main.pdf', previewUrl: `/api/v1/compliance-dossiers/${dossierId}/requirements/${requirementId}/versions/${versionId}/preview`, mimeType: 'application/pdf', fileSizeBytes: 1, uploadNote: null, uploadedAt, attachments: [], reviews: [review, { ...review, documentReviewId: versionId, result: 'REVOKED', reviewedAt: '2026-10-04T10:20:30.1234567Z' }] }] } }
  const result = mapBackendRequirementDetail(raw)
  assert.equal(result.document.openRequest.status, 'OPEN')
  assert.equal(result.document.openRequest.errorCategory, 'MISSING_STAMP')
  assert.equal(result.document.documentRequests.length, 1)
  assert.equal(result.document.versions[0].reviews.length, 2)
  assert.equal(result.document.versions[0].review.result, 'APPROVED')
  assert.equal(result.document.updatedAt, uploadedAt)
  assert.equal(result.document.latestVersionNo, 1)
})

test('document invalidation is scoped to dossier and requirement including comments and history', async () => {
  const { documentKeys, invalidateComplianceDocument } = await server.ssrLoadModule('/src/features/dossier/hooks/useComplianceDocument.ts')
  const { dossierKeys } = await server.ssrLoadModule('/src/features/dossier/hooks/useDossier.ts')
  const { documentRequestKeys } = await server.ssrLoadModule('/src/features/dossier/hooks/useDocumentRequests.ts')
  const client = new QueryClient()
  const scoped = [documentKeys.detail(documentId, dossierId, requirementId), documentKeys.history(dossierId, requirementId), documentRequestKeys.comments(dossierId, requirementId, reviewId), dossierKeys.overview(dossierId), dossierKeys.requirementsRoot(dossierId)]
  const other = documentKeys.detail(documentId, documentId, requirementId)
  for (const key of [...scoped, other, ['notifications']]) client.setQueryData(key, 'cached')
  await invalidateComplianceDocument(client, documentId, dossierId, requirementId)
  for (const key of scoped) assert.equal(client.getQueryState(key).isInvalidated, true)
  assert.equal(client.getQueryState(other).isInvalidated, false)
  assert.equal(client.getQueryState(['notifications']).isInvalidated, false)
  client.clear()
})
