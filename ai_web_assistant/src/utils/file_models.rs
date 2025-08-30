use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use chrono::{DateTime, Utc};
use uuid::Uuid;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserData {
    pub session_id: String,
    pub basic_info: BasicInfo,
    pub content: ContentPreferences,
    pub security: SecurityInfo,
    pub subscriptions: SubscriptionInfo,
}


#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct BasicInfo {
    pub id: String,
    pub email: String,
    pub status: String,
    pub account_type: String,
    pub last_login: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ContentPreferences {
    pub theme: String,
    pub language: String,
    pub timezone: String,
    pub date_format: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SecurityInfo {
    pub password: PasswordInfo,
    pub two_factor_auth: TwoFactorAuth,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PasswordInfo {
    pub last_changed: DateTime<Utc>,
    pub requires_reset: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct TwoFactorAuth {
    pub enabled: bool,
    pub method: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SubscriptionInfo {
    pub premium_membership: PremiumMembership,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct PremiumMembership {
    pub active: bool,
    pub tier: String,
    pub start_date: String,
    pub renewal_date: String,
    pub payment_method: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct SessionRecord {
    pub session_id: String,
    pub user_id: u64,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct MessageData {
    pub users: HashMap<String, UserConversations>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct UserConversations {
    pub conversations: HashMap<String, ChatSession>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatSession {
    pub title: String,
    pub created_at: DateTime<Utc>,
    pub messages: Vec<ChatMessage>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ChatMessage {
    pub message_id: String,
    pub parent_id: String,
    pub reply_id: Option<String>,
    pub role: String,
    pub content: String,
    pub edited: bool,
    pub timestamp: DateTime<Utc>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub edit_timestamp: Option<DateTime<Utc>>,
}

#[derive(Serialize, Deserialize)]
pub struct AuthSession {
    pub auth_session: Vec<UsersWrapper>,
}

#[derive(Serialize, Deserialize)]
pub struct UsersWrapper {
    pub users: Vec<UserSessions>,
}

#[derive(Serialize, Deserialize)]
pub struct UserSessions {
    #[serde(flatten)]
    pub sessions: std::collections::HashMap<u64, Vec<SessionInfo>>,
}

#[derive(Serialize, Deserialize)]
pub struct SessionFile {
    pub sessions: Vec<AuthSession>,
}

#[derive(Serialize, Deserialize)]
pub struct SessionInfo {
    pub session_id: String,
    pub timestamp: DateTime<Utc>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ConversationMetadata {
    pub id: String,
    pub title: String,
    pub created_at: DateTime<Utc>,
}