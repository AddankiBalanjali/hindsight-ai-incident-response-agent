import assert from 'assert';
import { sanitizeLogText, parseAndSanitizeLogs } from '../server/sanitizer';
import { hindsightService } from '../server/hindsight';
import { groqService } from '../server/groq';
import { remediationEngine } from '../server/remediation';
import { generatePostMortem } from '../server/postmortem';
import { dbManager } from '../server/db';
import { Incident, UserSession, Recommendation } from '../src/types';

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING HINDSIGHT AI AGENT INTEGRATION & LEARNING TESTS');
  console.log('====================================================\n');

  // Test 1: Sanitizer
  console.log('1. Testing Secret & PII Sanitizer...');
  const dirtyLog = 'Failed connecting to mongodb+srv://admin_user:P@ssw0rd99@prod.mongodb.net/payments with Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token and AKIAIOSFODNN7EXAMPLE35';
  const { sanitized, redactedCount } = sanitizeLogText(dirtyLog);
  assert(sanitized.includes('[REDACTED_DB_PWD]'), 'Database password must be redacted');
  assert(sanitized.includes('[REDACTED_JWT_TOKEN]'), 'JWT token must be redacted');
  assert(sanitized.includes('[REDACTED_AWS_ACCESS_KEY]'), 'AWS access key must be redacted');
  assert.strictEqual(redactedCount, 3, 'Should redact exactly 3 sensitive items');
  console.log('   ✅ Sanitizer test passed.\n');

  // Test 2: Database Ingestion & Pagination
  console.log('2. Testing Incident Ingestion & Filtering...');
  const queryRes = await dbManager.getIncidents({ page: 1, limit: 10 });
  assert(queryRes.incidents.length > 0, 'Database should contain seeded incidents');
  assert(queryRes.total >= 4, 'Total incidents should reflect seeded data');
  console.log(`   ✅ Database returned ${queryRes.incidents.length} incidents (Total: ${queryRes.total}).\n`);

  // Test 3: Safe Remediation & Approval Gate
  console.log('3. Testing Safe Remediation Engine & Human Approval Gate...');
  const testIncident: Incident = {
    id: 'INC-TEST-99',
    title: 'Test Service Latency',
    serviceName: 'test-api',
    environment: 'production',
    severity: 'P1',
    status: 'investigating',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    symptoms: ['High latency'],
    rawLogsSnippet: 'Sample error',
    sanitizedLogs: [],
    remediations: [],
    hindsightMemoryRetained: false,
  };

  const testRec: Recommendation = {
    id: 'REC-TEST-1',
    actionTitle: 'Expand Connection Pool',
    description: 'Scale pool size to 150',
    actionType: 'scale_connection_pool',
    targetResource: 'test-api/mongodb-pool',
    parameters: { maxPoolSize: 150 },
    reasoning: 'Relieves socket starvation',
    confidenceScore: 90,
    confidenceExplanation: 'Grounded in logs',
    risks: ['Socket saturation'],
    verificationSteps: ['Check /healthz'],
    rollbackInstructions: ['Revert to 50'],
    supportingIncidentIds: [],
  };

  const engineerUser: UserSession = {
    id: 'usr-eng-1',
    name: 'Sarah Connor',
    email: 'sarah@sre.org',
    role: 'Engineer',
  };

  const viewerUser: UserSession = {
    id: 'usr-view-1',
    name: 'Bob Viewer',
    email: 'bob@sre.org',
    role: 'Viewer',
  };

  // Propose remediation
  const proposed = remediationEngine.proposeRemediation(testIncident, testRec, engineerUser);
  assert.strictEqual(proposed.isDryRun, true, 'Proposed remediation MUST be dry-run by default');
  assert.strictEqual(proposed.status, 'pending_approval', 'Must be pending approval');
  testIncident.remediations.push(proposed);

  // Viewer cannot approve
  assert.throws(
    () => remediationEngine.processApproval(testIncident, proposed.id, viewerUser, 'approved'),
    /Access denied/,
    'Viewer role must be blocked from approving remediations'
  );

  // Engineer approves
  const approved = remediationEngine.processApproval(testIncident, proposed.id, engineerUser, 'approved', 'Verified safe in staging');
  assert.strictEqual(approved.status, 'approved', 'Status must be approved');

  // Execute remediation
  const executed = remediationEngine.executeRemediation(testIncident, proposed.id, engineerUser, {
    executeLive: false,
    confirmedRisk: true,
  });
  assert.strictEqual(executed.status, 'executed', 'Status must be executed');
  assert(executed.executionLog.length >= 4, 'Execution log must record steps');
  console.log('   ✅ Remediation engine & approval gates passed.\n');

  // Test 4: End-to-End Memory Learning Loop
  console.log('4. Testing Full Hindsight Long-Term Memory Learning Loop...');
  const incidentToLearn: Incident = {
    id: 'INC-2026-LEARN-1',
    title: 'Checkout Microservice MongoDB Cursor Leak',
    serviceName: 'checkout-service',
    environment: 'production',
    severity: 'P1',
    status: 'investigating',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    symptoms: ['MongoServerSelectionError on checkout', 'Cursor leak in receipt query'],
    rawLogsSnippet: 'MongoServerSelectionError cursor timeout',
    sanitizedLogs: [],
    remediations: [],
    hindsightMemoryRetained: false,
  };

  // Step 4a: Retain resolution in Hindsight memory
  const confirmedResolution = 'Applied cursor close timeout of 5000ms and scaled pool to 120 sockets';
  const retainedRecord = await hindsightService.retainExperience(
    incidentToLearn.id,
    incidentToLearn.serviceName,
    `Resolved incident ${incidentToLearn.id} on ${incidentToLearn.serviceName}. Root cause: cursor leak in receipt query. Successful resolution: ${confirmedResolution}.`,
    {
      severity: incidentToLearn.severity,
      environment: incidentToLearn.environment,
      outcome: 'successful',
      rootCause: 'Cursor leak in receipt query',
    }
  );
  assert(retainedRecord.id.startsWith('MEM-'), 'Retained memory should have valid ID');
  console.log(`   -> Retained memory ${retainedRecord.id} in Hindsight bank`);

  // Step 4b: A new incident occurs later with similar symptoms
  console.log('   -> Simulating subsequent incident with related symptoms...');
  const newIncidentQuery = 'checkout-service cursor leak timeout on mongodb';
  const recalled = await hindsightService.recallExperiences(newIncidentQuery, 3);

  assert(recalled.length > 0, 'Hindsight memory recall must return at least 1 relevant prior experience');
  const matchingCitation = recalled.find(m => m.incidentId === incidentToLearn.id);
  assert(matchingCitation, `Recalled memories must contain the newly learned incident ${incidentToLearn.id}`);
  assert(matchingCitation.similarityScore > 65, 'Recalled memory similarity score must be high');
  console.log(`   -> Recalled memory for ${matchingCitation.incidentId} with score ${matchingCitation.similarityScore}%`);

  // Step 4c: Post-Mortem Generation
  incidentToLearn.resolvedAt = new Date().toISOString();
  incidentToLearn.confirmedRootCause = 'Cursor leak in receipt query';
  incidentToLearn.confirmedResolutionOutcome = 'successful';
  incidentToLearn.hindsightMemoryRetained = true;
  const pm = generatePostMortem(incidentToLearn);
  assert.strictEqual(pm.incidentId, incidentToLearn.id, 'Post-mortem incident ID must match');
  assert.strictEqual(pm.rootCauseStatus, 'identified_and_verified', 'Root cause status should be verified');
  assert(pm.actionItems.length >= 3, 'Post-mortem must contain action items');
  console.log('   ✅ Post-mortem generation verified.\n');

  console.log('====================================================');
  console.log('🎉 ALL INTEGRATION & LEARNING LOOP TESTS PASSED SUCCESSFULLY!');
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('❌ Test failed with error:', err);
  process.exit(1);
});
