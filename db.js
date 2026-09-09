const Database = require("better-sqlite3");
const path = require("path");
const fs = require("fs");
const dataDir = path.join(__dirname, "..", "data");
fs.mkdirSync(dataDir, { recursive: true });
const db = new Database(path.join(dataDir, "carefund.db"));
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");
db.exec(`
CREATE TABLE IF NOT EXISTS users (
 id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, password_hash TEXT NOT NULL,
 role TEXT NOT NULL DEFAULT 'donor' CHECK(role IN ('donor','fundraiser','admin')), country TEXT DEFAULT '', profile_photo TEXT,
 date_of_birth TEXT, phone TEXT, kyc_status TEXT NOT NULL DEFAULT 'pending', liveness_status TEXT NOT NULL DEFAULT 'missing',
 liveness_file TEXT, account_status TEXT NOT NULL DEFAULT 'active', receipt_deadline TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS campaigns (
 id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER NOT NULL, title TEXT NOT NULL, patient_name TEXT NOT NULL, story TEXT NOT NULL,
 goal_usdt REAL NOT NULL, raised_usdt REAL NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','pending','approved','rejected','suspended','closed')),
 verified INTEGER NOT NULL DEFAULT 0, creator_age INTEGER, victim_is_minor INTEGER NOT NULL DEFAULT 0, relationship TEXT DEFAULT '', creator_liveness_status TEXT NOT NULL DEFAULT 'missing',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS campaign_files (id INTEGER PRIMARY KEY AUTOINCREMENT,campaign_id INTEGER NOT NULL,kind TEXT NOT NULL,file_name TEXT NOT NULL,stored_name TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS donations (
 id INTEGER PRIMARY KEY AUTOINCREMENT,campaign_id INTEGER NOT NULL,donor_user_id INTEGER,amount_usdt REAL NOT NULL,tx_hash TEXT NOT NULL UNIQUE,sender_address TEXT,recipient_address TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','confirmed','rejected')),confirmations INTEGER NOT NULL DEFAULT 0,block_timestamp INTEGER,donor_message TEXT DEFAULT '',verified_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(campaign_id) REFERENCES campaigns(id),FOREIGN KEY(donor_user_id) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS withdrawals (
 id INTEGER PRIMARY KEY AUTOINCREMENT,campaign_id INTEGER NOT NULL,requested_by INTEGER NOT NULL,amount_usdt REAL NOT NULL,fee_usdt REAL NOT NULL,net_usdt REAL NOT NULL,
 method TEXT NOT NULL CHECK(method IN ('crypto','bank')),beneficiary_address TEXT DEFAULT '',bank_name TEXT DEFAULT '',account_number TEXT DEFAULT '',account_name TEXT DEFAULT '',id_file TEXT DEFAULT '',
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','approved','processing','sent','received','rejected')),payout_tx_hash TEXT DEFAULT '',transfer_reference TEXT DEFAULT '',admin_note TEXT DEFAULT '',sent_at TEXT,received_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(campaign_id) REFERENCES campaigns(id),FOREIGN KEY(requested_by) REFERENCES users(id)
);
CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,type TEXT NOT NULL,title TEXT NOT NULL,message TEXT NOT NULL,data_json TEXT DEFAULT '{}',read_at TEXT,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT,sender_id INTEGER NOT NULL,recipient_id INTEGER NOT NULL,campaign_id INTEGER,body TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(sender_id) REFERENCES users(id),FOREIGN KEY(recipient_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS reports (id INTEGER PRIMARY KEY AUTOINCREMENT,campaign_id INTEGER NOT NULL,reporter_user_id INTEGER,reason TEXT NOT NULL,status TEXT NOT NULL DEFAULT 'open',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(campaign_id) REFERENCES campaigns(id),FOREIGN KEY(reporter_user_id) REFERENCES users(id));
CREATE TABLE IF NOT EXISTS platform_ratings (id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL UNIQUE,rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),review TEXT DEFAULT '',created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
`);
function add(col, sql){ try{ db.exec(`ALTER TABLE users ADD COLUMN ${col} ${sql}`); }catch{} }
// Compatibility migrations for older v3 databases.
add('country', "TEXT DEFAULT ''"); add('profile_photo', "TEXT"); add('date_of_birth', "TEXT"); add('phone', "TEXT"); add('kyc_status', "TEXT NOT NULL DEFAULT 'pending'"); add('liveness_status', "TEXT NOT NULL DEFAULT 'missing'"); add('liveness_file', "TEXT"); add('account_status', "TEXT NOT NULL DEFAULT 'active'"); add('receipt_deadline', "TEXT");
function addCampaign(col, sql){ try{db.exec(`ALTER TABLE campaigns ADD COLUMN ${col} ${sql}`);}catch{} }
addCampaign('creator_age','INTEGER'); addCampaign('victim_is_minor','INTEGER NOT NULL DEFAULT 0'); addCampaign('relationship',"TEXT DEFAULT ''"); addCampaign('creator_liveness_status',"TEXT NOT NULL DEFAULT 'missing'");
addCampaign('hospital_name',"TEXT DEFAULT ''"); addCampaign('hospital_address',"TEXT DEFAULT ''"); addCampaign('hospital_phone',"TEXT DEFAULT ''"); addCampaign('doctor_name',"TEXT DEFAULT ''"); addCampaign('diagnosis',"TEXT DEFAULT ''"); addCampaign('treatment_type',"TEXT DEFAULT ''"); addCampaign('estimated_cost_usdt','REAL DEFAULT 0'); addCampaign('verification_notes',"TEXT DEFAULT ''"); addCampaign('verification_status',"TEXT NOT NULL DEFAULT 'pending'"); addCampaign('verified_by','INTEGER'); addCampaign('verified_at','TEXT');
function addDonation(col, sql){try{db.exec(`ALTER TABLE donations ADD COLUMN ${col} ${sql}`);}catch{}}
addDonation('donor_message',"TEXT DEFAULT ''"); addDonation('verified_at','TEXT');
try{db.exec(`ALTER TABLE withdrawals ADD COLUMN fee_usdt REAL NOT NULL DEFAULT 0`)}catch{} try{db.exec(`ALTER TABLE withdrawals ADD COLUMN net_usdt REAL NOT NULL DEFAULT 0`)}catch{} try{db.exec(`ALTER TABLE withdrawals ADD COLUMN method TEXT NOT NULL DEFAULT 'crypto'`)}catch{} try{db.exec(`ALTER TABLE withdrawals ADD COLUMN bank_name TEXT DEFAULT ''`)}catch{} try{db.exec(`ALTER TABLE withdrawals ADD COLUMN account_number TEXT DEFAULT ''`)}catch{} try{db.exec(`ALTER TABLE withdrawals ADD COLUMN account_name TEXT DEFAULT ''`)}catch{} try{db.exec(`ALTER TABLE withdrawals ADD COLUMN id_file TEXT DEFAULT ''`)}catch{} try{db.exec(`ALTER TABLE withdrawals ADD COLUMN transfer_reference TEXT DEFAULT ''`)}catch{} try{db.exec(`ALTER TABLE withdrawals ADD COLUMN sent_at TEXT`)}catch{} try{db.exec(`ALTER TABLE withdrawals ADD COLUMN received_at TEXT`)}catch{}
module.exports=db;

// CareFund V8 feature migrations
function addUserV8(col, sql){ try{ db.exec(`ALTER TABLE users ADD COLUMN ${col} ${sql}`); }catch{} }
addUserV8('email_verified','INTEGER NOT NULL DEFAULT 0'); addUserV8('email_verification_token','TEXT'); addUserV8('gender',"TEXT DEFAULT ''"); addUserV8('age','INTEGER'); addUserV8('state',"TEXT DEFAULT ''"); addUserV8('address',"TEXT DEFAULT ''"); addUserV8('occupation',"TEXT DEFAULT ''"); addUserV8('donor_rating','REAL NOT NULL DEFAULT 0'); addUserV8('inspiration_last_shown','TEXT'); addUserV8('country_verified','INTEGER NOT NULL DEFAULT 0'); addUserV8('password_changed_at','TEXT');
function addCampV8(col, sql){ try{ db.exec(`ALTER TABLE campaigns ADD COLUMN ${col} ${sql}`); }catch{} }
addCampV8('withdrawal_disabled_at','TEXT'); addCampV8('public_hidden_at','TEXT'); addCampV8('next_campaign_at','TEXT'); addCampV8('referral_priority','INTEGER NOT NULL DEFAULT 0');
function addWithV8(col, sql){ try{ db.exec(`ALTER TABLE withdrawals ADD COLUMN ${col} ${sql}`); }catch{} }
addWithV8('confirmation_started_at','TEXT'); addWithV8('confirmation_deadline','TEXT'); addWithV8('confirmation_notified_at','TEXT'); addWithV8('suspension_applied','INTEGER NOT NULL DEFAULT 0'); addWithV8('balance_before','REAL NOT NULL DEFAULT 0'); addWithV8('balance_after','REAL NOT NULL DEFAULT 0');

db.exec(`

CREATE TABLE IF NOT EXISTS trusted_devices (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 user_id INTEGER NOT NULL,
 token_hash TEXT NOT NULL UNIQUE,
 device_label TEXT DEFAULT '',
 last_used_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_trusted_devices_user ON trusted_devices(user_id);
CREATE TABLE IF NOT EXISTS login_challenges (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 token_hash TEXT NOT NULL UNIQUE,
 user_id INTEGER NOT NULL,
 expires_at TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS login_sessions (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 session_id TEXT NOT NULL UNIQUE,
 user_id INTEGER NOT NULL,
 device_token_hash TEXT NOT NULL,
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 last_seen_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
 revoked_at TEXT,
 FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_login_sessions_user ON login_sessions(user_id);
CREATE TABLE IF NOT EXISTS password_resets (id INTEGER PRIMARY KEY AUTOINCREMENT, token_hash TEXT NOT NULL UNIQUE, user_id INTEGER NOT NULL, expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS registration_confirmations (
 id INTEGER PRIMARY KEY AUTOINCREMENT, token_hash TEXT NOT NULL UNIQUE, name TEXT NOT NULL, email TEXT NOT NULL, role TEXT NOT NULL CHECK(role IN ('donor','fundraiser')), expires_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS analytics_visits (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 visit_date TEXT NOT NULL DEFAULT (date('now')),
 country_code TEXT NOT NULL DEFAULT 'XX',
 country_name TEXT NOT NULL DEFAULT 'Unknown',
 page TEXT NOT NULL DEFAULT '/',
 role TEXT NOT NULL DEFAULT 'anonymous',
 gender TEXT NOT NULL DEFAULT '',
 created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_analytics_visits_date ON analytics_visits(visit_date);
CREATE INDEX IF NOT EXISTS idx_analytics_visits_country ON analytics_visits(country_code);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_withdrawal_per_campaign ON withdrawals(campaign_id) WHERE status IN ('pending','approved','processing','sent');
CREATE TABLE IF NOT EXISTS testimonies (
 id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL UNIQUE,rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),message TEXT NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS health_articles (
 id INTEGER PRIMARY KEY AUTOINCREMENT,title TEXT NOT NULL,intro TEXT NOT NULL,content TEXT NOT NULL,image_file TEXT DEFAULT '',published INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS campaign_referrals (
 id INTEGER PRIMARY KEY AUTOINCREMENT,campaign_id INTEGER NOT NULL,created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,session_key TEXT NOT NULL,FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE
);
`);
