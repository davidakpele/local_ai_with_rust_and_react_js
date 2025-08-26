use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum CommunicationRequest {
    #[serde(rename = "ai_request")]
    AIRequest { prompt: String },
}
