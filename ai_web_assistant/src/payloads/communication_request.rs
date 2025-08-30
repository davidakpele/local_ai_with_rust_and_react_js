use serde::Deserialize;

#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
pub enum CommunicationRequest {
    #[serde(rename = "ai_request")]
      AIRequest { 
        prompt: String,
        session_id: String, 
    },

    #[serde(rename = "fetch_sidebar_history")]
    FetchSidebarHistory { user_id: u64 },

    #[serde(rename = "fetch_conversation")]
    FetchConversation { conversation_id: String },

    #[serde(rename = "start_new_session")]
    StartNewSession { user_id: u64 },

    #[serde(rename = "edit_content_title")]
    EditMessageContentById {
        content_id: String,
        content: String,
    },

    #[serde(rename = "edit_content")]
    EditContentTitleById {
        message_id: String,
        content: String,
    },

    #[serde(rename = "delete_content")]
    DeleteContentTById {
        target_id: String
    },

    #[serde(rename = "fetch_all_messages")]
    FetchAllMessages


}
