use chrono::{DateTime, Utc};
// communication_response.rs
use serde::{Serialize};

use crate::utils::file_models::ChatMessage;
#[derive(Serialize)]
#[serde(tag = "type")]
pub enum CommunicationResponse {
    #[serde(rename = "stream_chunk")]
    StreamChunk {
        chunk: String,
    },

    #[serde(rename = "stream_end")]
    StreamEnd {
        status: String,
    },

    #[serde(rename = "session_created")]
    SessionCreated {
        status: String,
        session_id: String,
        user_id: u64,
    },

    #[serde(rename = "disconnected")]
    Disconnected {
        status: String,
    },

    #[serde(rename = "error")]
    Error {
        status: String,
        error: String,
    },

    #[serde(rename = "ai_response")]
    AIResponse {
        status: String,
        response: String,
    },

    #[serde(rename = "sidebar_history")]
    SidebarHistory {
        status: String,
        conversations: Vec<ConversationSummary>,
    },

    #[serde(rename = "conversation_history")]
    ConversationHistory {
        status: String,
        conversation_id: String,
        messages: Vec<ChatMessage>,
    },

    MessageCreated  {
        status: String,
        message_id: String,
        message: ChatMessage,
    },
}

#[derive(Serialize)]
pub struct ConversationSummary {
    pub conversation_id: String,
    pub title: String,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Serialize)]
pub struct MessageWithContext {
    pub message: ChatMessage,
    pub conversation_id: String,
    pub conversation_title: String,
    pub created_at: DateTime<Utc>,
}