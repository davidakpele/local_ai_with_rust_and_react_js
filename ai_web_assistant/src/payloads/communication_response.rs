// communication_response.rs
use serde::{Serialize};
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
}
