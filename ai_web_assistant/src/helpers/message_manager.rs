// message_manager.rs
use chrono::{DateTime, Utc};
use serde_json::Value;
use std::collections::HashMap;
use tokio::sync::Mutex;
use anyhow::{Result, anyhow};
use serde::Serialize;
use std::sync::Arc;
use std::error::Error;

use crate::utils::file_models::{ChatMessage, ChatSession, ConversationMetadata, MessageData, UserConversations};

#[derive(Clone)]
pub struct MessageManager {
    file_path: String,
    file_lock: Arc<Mutex<()>>,
}

    impl MessageManager {
        pub fn new(file_path: &str) -> Self {
            Self {
                file_path: file_path.to_string(),
                file_lock: Arc::new(Mutex::new(())),
            }
        }

        // Main save_message function matching Python
        pub async fn save_message(
        &self,
        user_id: &u64,
        chat_id: &str,
        message_data: ChatMessage,
    ) -> Result<ChatMessage> {
        let _lock = self.file_lock.lock().await;

        let mut messages_db = self.load_messages().await?;

        let user_key = user_id.to_string(); // Convert u64 → String

        // Initialize user structure if not exists
        if !messages_db.users.contains_key(&user_key) {
            messages_db.users.insert(user_key.clone(), UserConversations {
                conversations: HashMap::new(),
            });
        }

        let user_conversations = messages_db.users.get_mut(&user_key).unwrap();

        // Initialize chat structure if not exists
        if !user_conversations.conversations.contains_key(chat_id) {
            user_conversations.conversations.insert(chat_id.to_string(), ChatSession {
                title: "New Chat".to_string(),
                created_at: Utc::now(),
                messages: Vec::new(),
            });
        }

        let chat_session = user_conversations.conversations.get_mut(chat_id).unwrap();

        // If this is the first user message, set it as the chat title
        if message_data.role == "user" &&
        chat_session.messages.is_empty() &&
        chat_session.title == "New Chat" {

            let title = if message_data.content.len() > 50 {
                format!("{}...", &message_data.content[..50])
            } else {
                message_data.content.clone()
            };
            chat_session.title = title;
        }

        // Add message to the chat
        chat_session.messages.push(message_data.clone());

        self.save_messages(&messages_db).await?;

        Ok(message_data)
    }


    pub async fn update_message(
        &self,
        user_id: &str,
        chat_id: &str,
        message_id: &str,
        new_content: &str,
    ) -> Result<Option<ChatMessage>> {
        let _lock = self.file_lock.lock().await;
        
        let mut messages_db = self.load_messages().await?;
        
        let mut result = None;
        
        if let Some(user_conv) = messages_db.users.get_mut(user_id) {
            if let Some(chat) = user_conv.conversations.get_mut(chat_id) {
                // Find and update the message
                for message in &mut chat.messages {
                    if message.message_id == message_id {
                        message.content = new_content.to_string();
                        message.edited = true;
                        message.edit_timestamp = Some(Utc::now());
                        
                        result = Some(message.clone());
                        break;
                    }
                }
            }
        }
        
        // Save only if we found and updated a message
        if result.is_some() {
            self.save_messages(&messages_db).await?;
        }
        
        Ok(result)
    }

    pub async fn delete_message(
        &self,
        user_id: &str,
        chat_id: &str,
        message_id: &str,
    ) -> Result<bool> {
        let _lock = self.file_lock.lock().await;
        
        let mut messages_db = self.load_messages().await?;
        
        let mut deleted = false;
        
        if let Some(user_conv) = messages_db.users.get_mut(user_id) {
            if let Some(chat) = user_conv.conversations.get_mut(chat_id) {
                let original_len = chat.messages.len();
                chat.messages.retain(|msg| msg.message_id != message_id);
                
                deleted = chat.messages.len() < original_len;
            }
        }
        
        // Save only if we deleted a message
        if deleted {
            self.save_messages(&messages_db).await?;
        }
        
        Ok(deleted)
    }

    pub async fn delete_message_and_responses(
        &self,
        user_id: &str,
        chat_id: &str,
        message_id: &str,
    ) -> Result<usize> {
        let _lock = self.file_lock.lock().await;
        
        let mut messages_db = self.load_messages().await?;
        let mut deleted_count = 0;
        
        if let Some(user_conv) = messages_db.users.get_mut(user_id) {
            if let Some(chat) = user_conv.conversations.get_mut(chat_id) {
                let original_messages = std::mem::take(&mut chat.messages);
                
                for message in original_messages {
                    if message.message_id != message_id && 
                    !(message.role == "ai" && message.reply_id.as_ref() == Some(&message_id.to_string())) {
                        chat.messages.push(message);
                    } else {
                        deleted_count += 1;
                    }
                }
            }
        }
        if deleted_count > 0 {
            self.save_messages(&messages_db).await?;
        }
        
        Ok(deleted_count)
    }

    pub async fn get_user_messages(
        &self,
        user_id: &str,
        chat_id: Option<&str>,
    ) -> Result<Vec<ChatMessage>> {
        let messages_db = self.load_messages().await?;
        
        if let Some(user_conv) = messages_db.users.get(user_id) {
            let mut all_messages = Vec::new();
            
            for (cid, chat_data) in &user_conv.conversations {
                if chat_id.is_none() || chat_id == Some(cid) {
                    all_messages.extend(chat_data.messages.clone());
                }
            }
            
            all_messages.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
            return Ok(all_messages);
        }
        
        Ok(Vec::new())
    }

    pub async fn get_user_chats(&self, user_id: &str) -> Result<Vec<ChatSummary>> {
        let messages_db = self.load_messages().await?;
        let mut chats = Vec::new();
        
        if let Some(user_conv) = messages_db.users.get(user_id) {
            for (chat_id, chat_data) in &user_conv.conversations {
                let last_message = chat_data.messages.iter()
                    .max_by_key(|msg| msg.timestamp)
                    .map(|msg| msg.timestamp);
                
                chats.push(ChatSummary {
                    id: chat_id.clone(),
                    title: chat_data.title.clone(),
                    last_message,
                    message_count: chat_data.messages.len(),
                });
            }
        }
        
        chats.sort_by(|a, b| b.last_message.cmp(&a.last_message));
        Ok(chats)
    }

    pub async fn update_ai_response(
        &self,
        user_id: &str,
        chat_id: &str,
        user_message_id: &str,
        new_ai_content: &str,
    ) -> Result<Option<ChatMessage>> {
        let _lock = self.file_lock.lock().await;
        
        let mut messages_db = self.load_messages().await?;
        
        let mut result = None;
        
        if let Some(user_conv) = messages_db.users.get_mut(user_id) {
            if let Some(chat) = user_conv.conversations.get_mut(chat_id) {
                // Find the AI message that replies to this user message
                for message in &mut chat.messages {
                    if message.role == "ai" && message.reply_id.as_ref() == Some(&user_message_id.to_string()) {
                        message.content = new_ai_content.to_string();
                        message.edited = true;
                        message.edit_timestamp = Some(Utc::now());
                        
                        result = Some(message.clone());
                        break;
                    }
                }
            }
        }
        if result.is_some() {
            self.save_messages(&messages_db).await?;
        }
        
        Ok(result)
    }
    
    pub async fn delete_chat(&self, user_id: &str, chat_id: &str) -> Result<bool> {
        let _lock = self.file_lock.lock().await;
        
        let mut messages_db = self.load_messages().await?;
        
        let mut deleted = false;
        
        if let Some(user_conv) = messages_db.users.get_mut(user_id) {
            deleted = user_conv.conversations.remove(chat_id).is_some();
        }
        if deleted {
            self.save_messages(&messages_db).await?;
        }
        
        Ok(deleted)
}

    pub async fn update_chat_title(&self, user_id: &str, chat_id: &str, new_title: &str) -> Result<bool> {
        let _lock = self.file_lock.lock().await;
        
        let mut messages_db = self.load_messages().await?;
        
        let mut updated = false;
        
        if let Some(user_conv) = messages_db.users.get_mut(user_id) {
            if let Some(chat) = user_conv.conversations.get_mut(chat_id) {
                chat.title = new_title.to_string();
                updated = true;
            }
        }
        if updated {
            self.save_messages(&messages_db).await?;
        }
        
        Ok(updated)
    }

    pub async fn delete_all_chats(&self, user_id: &str) -> Result<usize> {
        let _lock = self.file_lock.lock().await;
        
        let mut messages_db = self.load_messages().await?;
        
        let chat_count = if let Some(user_conv) = messages_db.users.get_mut(user_id) {
            let count = user_conv.conversations.len();
            user_conv.conversations.clear();
            count
        } else {
            0
        };
        if chat_count > 0 {
            self.save_messages(&messages_db).await?;
        }
        
        Ok(chat_count)
    }

    pub async fn delete_multiple_chats(&self, user_id: &str, chat_ids: &[String]) -> Result<usize> {
        let _lock = self.file_lock.lock().await;
        
        let mut messages_db = self.load_messages().await?;
        let mut deleted_count = 0;
        
        if let Some(user_conv) = messages_db.users.get_mut(user_id) {
            let chat_set: std::collections::HashSet<_> = chat_ids.iter().collect();
            let original_keys: Vec<String> = user_conv.conversations.keys().cloned().collect();
            
            for chat_id in original_keys {
                if chat_set.contains(&chat_id) {
                    user_conv.conversations.remove(&chat_id);
                    deleted_count += 1;
                }
            }
        }
        if deleted_count > 0 {
            self.save_messages(&messages_db).await?;
        }
        
        Ok(deleted_count)
    }

    pub async fn delete_session(&self, user_id: &str, session_id: &str) -> Result<bool> {
        self.delete_chat(user_id, session_id).await
    }

    // Private helper methods
    async fn load_messages(&self) -> Result<MessageData> {
        let path = std::path::Path::new(&self.file_path);
        
        if !path.exists() {
            return Ok(MessageData {
                users: HashMap::new(),
            });
        }
        
        let content = tokio::fs::read_to_string(path).await?;
        
        // Try to parse as the new structure first
        match serde_json::from_str::<MessageData>(&content) {
            Ok(message_data) => Ok(message_data),
            Err(_) => {
                Ok(MessageData {
                    users: HashMap::new(),
                })
            }
        }
    }

    async fn save_messages(&self, message_data: &MessageData) -> Result<()> {
        let path = std::path::Path::new(&self.file_path);
        
        // Create parent directories if they don't exist
        if let Some(parent) = path.parent() {
            tokio::fs::create_dir_all(parent).await?;
        }
        
        let file = std::fs::File::create(path)?;
        let writer = std::io::BufWriter::new(file);
        serde_json::to_writer_pretty(writer, message_data)?;
        Ok(())
    }

    pub async fn get_all_conversation_titles(&self, user_id: u64) -> anyhow::Result<Vec<ConversationMetadata>> {
        const MAX_RETRIES: usize = 5;
        const RETRY_DELAY_MS: u64 = 100;
        
        for attempt in 0..MAX_RETRIES {
            // Check if file exists and has content
            if let Ok(metadata) = tokio::fs::metadata("messages.json").await {
                if metadata.len() == 0 {
                    if attempt == MAX_RETRIES - 1 {
                        return Ok(Vec::new()); // Return empty list instead of error
                    }
                    tokio::time::sleep(tokio::time::Duration::from_millis(RETRY_DELAY_MS)).await;
                    continue;
                }
            }
            
            match tokio::fs::read_to_string("messages.json").await {
                Ok(data_str) if data_str.trim().is_empty() => {
                    if attempt == MAX_RETRIES - 1 {
                        return Ok(Vec::new()); // Empty file, return empty list
                    }
                    tokio::time::sleep(tokio::time::Duration::from_millis(RETRY_DELAY_MS)).await;
                    continue;
                }
                Ok(data_str) => {
                    // Try to parse the JSON
                    match serde_json::from_str::<Value>(&data_str) {
                        Ok(data) => {
                            let mut conversations = Vec::new();
                            
                            if let Some(users) = data.get("users") {
                                let user_key = user_id.to_string();
                                if let Some(user_data) = users.get(&user_key) {
                                    if let Some(conversations_obj) = user_data.get("conversations") {
                                        if let Some(conversations_map) = conversations_obj.as_object() {
                                            for (conversation_id, conversation_data) in conversations_map {
                                                let title = conversation_data.get("title")
                                                    .and_then(|t| t.as_str())
                                                    .ok_or_else(|| anyhow::anyhow!("Missing title for conversation {}", conversation_id))?;
                                                
                                                let created_at_str = conversation_data.get("created_at")
                                                    .and_then(|c| c.as_str())
                                                    .ok_or_else(|| anyhow::anyhow!("Missing created_at for conversation {}", conversation_id))?;
                                                
                                                let created_at = DateTime::parse_from_rfc3339(created_at_str)?
                                                    .with_timezone(&Utc);
                                                
                                                conversations.push(ConversationMetadata {
                                                    id: conversation_id.clone(),
                                                    title: title.to_string(),
                                                    created_at,
                                                });
                                            }
                                        }
                                    }
                                }
                            }
                            
                            conversations.sort_by(|a, b| b.created_at.cmp(&a.created_at));
                            return Ok(conversations);
                        }
                        Err(e) if e.is_eof() => {
                            // EOF error, retry
                            if attempt == MAX_RETRIES - 1 {
                                return Err(anyhow::anyhow!("Failed to parse messages.json after {} attempts: {}", MAX_RETRIES, e));
                            }
                            tokio::time::sleep(tokio::time::Duration::from_millis(RETRY_DELAY_MS)).await;
                            continue;
                        }
                        Err(e) => {
                            return Err(anyhow::anyhow!("Failed to parse messages.json: {}", e));
                        }
                    }
                }
                Err(e) if e.kind() == std::io::ErrorKind::NotFound => {
                    // File doesn't exist, return empty list
                    return Ok(Vec::new());
                }
                Err(e) => {
                    return Err(anyhow::anyhow!("Failed to read messages.json: {}", e));
                }
            }
        }
        
        Ok(Vec::new()) // Fallback: return empty list
    }

    pub async fn edit_message_content(
        &self,
        user_id: &str,
        message_id: &str,
        new_content: &str,
    ) -> Result<(), Box<dyn Error + Send>> {
        let mut messages_db = self.load_messages().await?;
        
        if let Some(user_conv) = messages_db.users.get_mut(user_id) {
            for conversation in user_conv.conversations.values_mut() {
                if let Some(message) = conversation.messages.iter_mut().find(|m| m.message_id == message_id) {
                    message.content = new_content.to_string();
                    message.edited = true;
                    message.edit_timestamp = Some(Utc::now());
                    
                    self.save_messages(&messages_db).await?;
                    return Ok(());
                }
            }
        }
        
        Err(anyhow::anyhow!("Message not found: {}", message_id).into())
    }

    pub async fn edit_title(
        &self,
        user_id: &str,
        target_id: &str,
        new_title: &str,
    ) -> Result<String, Box<dyn Error + Send>> {
        let mut messages_db = self.load_messages().await?;
        let mut result: Option<String> = None;

        if let Some(user_conv) = messages_db.users.get_mut(user_id) {
            // Direct conversation ID match
            if let Some(conversation) = user_conv.conversations.get_mut(target_id) {
                let title = if new_title.len() > 30 {
                    format!("{}...", &new_title[..30])
                } else {
                    new_title.to_string()
                };
                conversation.title = title.clone();
                result = Some(title);
            } else {
                // If target_id is a message ID, find its conversation
                for (_conv_id, conversation) in user_conv.conversations.iter_mut() {
                    if conversation.messages.iter().any(|m| m.message_id == target_id) {
                        let title = if new_title.len() > 30 {
                            format!("{}...", &new_title[..30])
                        } else {
                            new_title.to_string()
                        };
                        conversation.title = title.clone();
                        result = Some(title);
                        break;
                    }
                }
            }
        }

        if let Some(conversation_title) = result {
            self.save_messages(&messages_db).await?;
            return Ok(conversation_title);
        }

        Err(anyhow::anyhow!("Target not found: {}", target_id).into())
    }

    pub async fn delete_by_id(
        &self,
        user_id: &str,
        target_id: &str,
    ) -> Result<DeleteResult, Box<dyn Error + Send>> {
        let mut messages_db = self.load_messages().await?;
        let mut result: Option<DeleteResult> = None;
        
        if let Some(user_conv) = messages_db.users.get_mut(user_id) {
            // First, check if it's a conversation ID
            if let Some(conversation) = user_conv.conversations.get(target_id) {
                let title = conversation.title.clone();
                user_conv.conversations.remove(target_id);
                
                result = Some(DeleteResult {
                    deleted_type: "conversation".to_string(),
                    target_id: target_id.to_string(),
                    title: Some(title.clone()),
                    message: format!("Deleted conversation: {}", title),
                });
            } else {
                // Search for message ID across all conversations
                let mut found_conv_id: Option<String> = None;
                let mut found_title: Option<String> = None;
                let mut should_remove_conversation = false;
                
                for (conv_id, conversation) in user_conv.conversations.iter_mut() {
                    if let Some(index) = conversation.messages.iter().position(|m| m.message_id == target_id) {
                        found_title = Some(conversation.title.clone());
                        conversation.messages.remove(index);
                        
                        // Check if conversation is now empty
                        should_remove_conversation = conversation.messages.is_empty();
                        found_conv_id = Some(conv_id.clone());
                        break;
                    }
                }
                
                if let (Some(conv_id), Some(title)) = (found_conv_id, found_title) {
                    if should_remove_conversation {
                        user_conv.conversations.remove(&conv_id);
                        result = Some(DeleteResult {
                            deleted_type: "message_and_conversation".to_string(),
                            target_id: target_id.to_string(),
                            title: Some(title.clone()),
                            message: format!("Deleted message and empty conversation: {}", title),
                        });
                    } else {
                        result = Some(DeleteResult {
                            deleted_type: "message".to_string(),
                            target_id: target_id.to_string(),
                            title: Some(title.clone()),
                            message: format!("Deleted message from conversation: {}", title),
                        });
                    }
                }
            }
        }
        
        if let Some(delete_result) = result {
            self.save_messages(&messages_db).await?;
            return Ok(delete_result);
        }
        
        Err(anyhow::anyhow!("Target not found: {}", target_id).into())
    }

    pub async fn get_all_user_messages(
        &self,
        user_id: &str,
    ) -> Result<Vec<ChatMessage>, Box<dyn Error + Send>> {
        let messages_db = self.load_messages().await?;
        let mut all_messages = Vec::new();
        
        if let Some(user_conv) = messages_db.users.get(user_id) {
            for conversation in user_conv.conversations.values() {
                all_messages.extend(conversation.messages.clone());
            }
        }
        
        all_messages.sort_by(|a, b| a.timestamp.cmp(&b.timestamp));
        
        Ok(all_messages)
    }

}

#[derive(Debug, Serialize)]
pub struct ChatSummary {
    pub id: String,
    pub title: String,
    pub last_message: Option<DateTime<Utc>>,
    pub message_count: usize,
}

#[derive(Debug, Serialize)]
pub struct DeleteResult {
    pub deleted_type: String, 
    pub target_id: String,
    pub title: Option<String>,
    pub message: String,
}