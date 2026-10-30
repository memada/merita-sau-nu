CREATE TABLE IF NOT EXISTS leads (
 id TEXT PRIMARY KEY, createdAt TEXT NOT NULL, updatedAt TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'NEW', source TEXT NOT NULL,
 utmSource TEXT, utmMedium TEXT, utmCampaign TEXT, utmContent TEXT, utmTerm TEXT,
 landingPage TEXT, referrer TEXT, county TEXT NOT NULL, city TEXT NOT NULL,
 homeOwner INTEGER NOT NULL, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT,
 hasSolar TEXT NOT NULL, pvPowerKw REAL, inverterBrand TEXT, inverterModel TEXT,
 monthlyConsumptionKwh REAL NOT NULL, nightConsumptionCategory TEXT NOT NULL,
 estimatedNightConsumptionKwh REAL NOT NULL, goal TEXT NOT NULL, backupLoads TEXT NOT NULL,
 budgetRange TEXT NOT NULL, purchaseTimeline TEXT NOT NULL,
 recommendedBatteryMinKwh REAL NOT NULL, recommendedBatteryMaxKwh REAL,
 recommendationLabel TEXT NOT NULL, calculationConfidence TEXT NOT NULL,
 calculatorInput TEXT NOT NULL, calculatorResult TEXT NOT NULL,
 notes TEXT NOT NULL, internalNotes TEXT NOT NULL DEFAULT '',
 consentGiven INTEGER NOT NULL CHECK(consentGiven = 1), consentText TEXT NOT NULL,
 consentTimestamp TEXT NOT NULL, privacyPolicyVersion TEXT NOT NULL,
 verificationStatus TEXT NOT NULL DEFAULT 'PENDING',
 possibleDuplicate INTEGER NOT NULL DEFAULT 0,
 duplicateOfLeadId TEXT REFERENCES leads(id) ON DELETE SET NULL,
 ipHash TEXT, userAgent TEXT, leadScore INTEGER NOT NULL, leadCategory TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS leads_phone_created ON leads(phone, createdAt);
CREATE INDEX IF NOT EXISTS leads_created ON leads(createdAt DESC);
CREATE INDEX IF NOT EXISTS leads_filters ON leads(status, county, leadCategory);
CREATE TABLE IF NOT EXISTS lead_status_history (
 id INTEGER PRIMARY KEY, leadId TEXT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
 oldStatus TEXT NOT NULL, newStatus TEXT NOT NULL, changedAt TEXT NOT NULL, changedBy TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS rate_limits (
 key TEXT PRIMARY KEY, count INTEGER NOT NULL, expiresAt INTEGER NOT NULL
);
