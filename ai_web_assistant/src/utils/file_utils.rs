// file_utils.rs
use std::fs::{File, OpenOptions};
use std::io::{BufReader, BufWriter, Write, Seek, SeekFrom};
use std::path::Path;
use chrono::{DateTime, Utc};
use serde_json::Value;
use tokio::sync::Mutex;
use serde::Serialize;
use anyhow::{Result, anyhow};

use crate::payloads::communication_response::ConversationSummary;
use crate::utils::file_models::ConversationMetadata;

pub struct JsonFileManager {
    users_file: Mutex<()>,
    sessions_file: Mutex<()>,
    messages_file: Mutex<()>,
}

impl JsonFileManager {
    pub fn new() -> Self {
        Self {
            users_file: Mutex::new(()),
            sessions_file: Mutex::new(()),
            messages_file: Mutex::new(()),
        }
    }

    pub async fn append_to_file<T: Serialize>(&self, file_path: &str, data: T) -> Result<()> {
        let path = Path::new(file_path);
        
        let _lock = if file_path.ends_with("users.json") {
            self.users_file.lock().await
        } else if file_path.ends_with("sessions.json") {
            self.sessions_file.lock().await
        } else {
            self.messages_file.lock().await
        };

        // Handle file creation if it doesn't exist or is empty/corrupted
        if !path.exists() || path.metadata()?.len() == 0 {
            self.create_initial_file(file_path).await?;
        }

        // Read and parse existing content with error recovery
        let mut json_value = self.read_and_parse_file(file_path).await?;

        // Append data based on file type
        if file_path.ends_with("users.json") {
            self.append_to_users(&mut json_value, data)?;
        } else if file_path.ends_with("sessions.json") {
            self.append_to_sessions(&mut json_value, data)?;
        } else if file_path.ends_with("messages.json") {
            self.append_to_messages(&mut json_value, data)?;
        }

        // Write updated content back to file
        self.write_file(file_path, &json_value).await?;

        Ok(())
    }

    async fn create_initial_file(&self, file_path: &str) -> Result<()> {
        let path = Path::new(file_path);
        let file = File::create(path)?;
        let mut writer = BufWriter::new(file);
        
        let initial_json = if file_path.ends_with("users.json") {
            serde_json::json!({ "users": [] })
        } else if file_path.ends_with("sessions.json") {
            serde_json::json!({ "sessions": [] })
        } else if file_path.ends_with("messages.json") {
            serde_json::json!({ "sessions": [] })
        } else {
            return Err(anyhow!("Unknown file type"));
        };
        
        serde_json::to_writer_pretty(&mut writer, &initial_json)?;
        Ok(())
    }

    async fn read_and_parse_file(&self, file_path: &str) -> Result<serde_json::Value> {
        let path = Path::new(file_path);
        let file = OpenOptions::new().read(true).open(path)?;
        let reader = BufReader::new(file);
        
        match serde_json::from_reader(reader) {
            Ok(value) => Ok(value),
            Err(e) => {
                eprintln!("Failed to parse {}: {}, recreating file", file_path, e);
                self.create_initial_file(file_path).await?;
                
                // Read the newly created file
                let new_file = OpenOptions::new().read(true).open(path)?;
                let new_reader = BufReader::new(new_file);
                serde_json::from_reader(new_reader)
                    .map_err(|e| anyhow!("Failed to parse recreated file: {}", e))
            }
        }
    }

    fn append_to_users<T: Serialize>(&self, json_value: &mut serde_json::Value, data: T) -> Result<()> {
        if let Some(users) = json_value.get_mut("users").and_then(|u| u.as_array_mut()) {
            users.push(serde_json::to_value(data)?);
            Ok(())
        } else {
            Err(anyhow!("Invalid users.json structure"))
        }
    }

    fn append_to_sessions<T: Serialize>(&self, json_value: &mut serde_json::Value, data: T) -> Result<()> {
        if let Some(sessions) = json_value.get_mut("sessions").and_then(|s| s.as_array_mut()) {
            sessions.push(serde_json::to_value(data)?);
            Ok(())
        } else {
            Err(anyhow!("Invalid sessions.json structure"))
        }
    }

    fn append_to_messages<T: Serialize>(&self, json_value: &mut serde_json::Value, data: T) -> Result<()> {
        let data_value = serde_json::to_value(data)?;
        
        if let Some(users) = json_value.get_mut("users").and_then(|u| u.as_object_mut()) {
            if let Some((user_id, session_id, messages)) = Self::extract_user_session_data(&data_value)? {
                // Initialize user if not exists
                if !users.contains_key(&user_id) {
                    users.insert(user_id.clone(), serde_json::json!({
                        "conversations": {}
                    }));
                }
                
                if let Some(user_entry) = users.get_mut(&user_id) {
                    if let Some(conversations) = user_entry.get_mut("conversations").and_then(|c| c.as_object_mut()) {
                        // Initialize session if not exists
                        if !conversations.contains_key(&session_id) {
                            conversations.insert(session_id.clone(), serde_json::json!({
                                "title": "New Chat",
                                "created_at": Utc::now().to_rfc3339(),
                                "messages": []
                            }));
                        }
                        
                        if let Some(session_entry) = conversations.get_mut(&session_id) {
                            if let Some(session_messages) = session_entry.get_mut("messages").and_then(|m| m.as_array_mut()) {
                                // Add all messages to the session - FIXED ITERATION
                                if let Some(messages_array) = messages.as_array() {
                                    for message in messages_array.iter() {
                                        session_messages.push(message.clone());
                                    }
                                    
                                    // Update title if this is the first user message
                                    Self::update_chat_title(session_entry, messages_array)?;
                                }
                            }
                        }
                    }
                }
            }
        }
        
        Ok(())
    }

    async fn write_file(&self, file_path: &str, json_value: &serde_json::Value) -> Result<()> {
        let path = Path::new(file_path);
        let file = File::create(path)?;
        let writer = BufWriter::new(file);
        serde_json::to_writer_pretty(writer, json_value)?;
        Ok(())
    }

    // Helper method for debugging
    pub async fn get_file_status(&self, file_path: &str) -> String {
        let path = Path::new(file_path);
        if !path.exists() {
            return "File does not exist".to_string();
        }
        
        match path.metadata() {
            Ok(metadata) if metadata.len() == 0 => "File exists but is empty".to_string(),
            Ok(_) => "File exists and has content".to_string(),
            Err(e) => format!("Error checking file: {}", e),
        }
    }

    fn update_chat_title(session_entry: &mut serde_json::Value, messages: &[serde_json::Value]) -> Result<()> {
        if let Some(session_obj) = session_entry.as_object_mut() {
            if let Some(title) = session_obj.get("title").and_then(|t| t.as_str()) {
                if title == "New Chat" {
                    // Find first user message to set as title
                    for message in messages {
                        if let Some(role) = message.get("role").and_then(|r| r.as_str()) {
                            if role == "user" {
                                if let Some(content) = message.get("content").and_then(|c| c.as_str()) {
                                    let title = if content.len() > 50 {
                                        format!("{}...", &content[..50])
                                    } else {
                                        content.to_string()
                                    };
                                    session_obj.insert("title".to_string(), serde_json::Value::String(title));
                                    break;
                                }
                            }
                        }
                    }
                }
            }
        }
        Ok(())
    }

    pub async fn get_user_chats_for_all_sessions(&self, user_id: &u64) -> Result<Vec<ConversationSummary>> {
        let _lock = self.messages_file.lock().await;
        let path = Path::new("messages.json");

        if !path.exists() {
            return Ok(vec![]);
        }

        let file = OpenOptions::new().read(true).open(path)?;
        let reader = BufReader::new(file);
        let json_value: serde_json::Value = serde_json::from_reader(reader)?;

        let mut conversations = Vec::new();

        if let Some(users) = json_value.get("users").and_then(|u| u.as_object()) {
            if let Some(user_entry) = users.get(&user_id.to_string()) {
                if let Some(conversations_obj) = user_entry.get("conversations").and_then(|c| c.as_object()) {
                    for (session_id, conv_data) in conversations_obj.iter() {
                        let title = conv_data.get("title")
                            .and_then(|t| t.as_str())
                            .unwrap_or("Untitled")
                            .to_string();

                        let created_at = conv_data.get("created_at")
                            .and_then(|ts| ts.as_str())
                            .and_then(|ts| chrono::DateTime::parse_from_rfc3339(ts).ok())
                            .map(|dt| dt.with_timezone(&Utc))
                            .unwrap_or_else(|| Utc::now());

                        conversations.push(ConversationSummary {
                            conversation_id: session_id.clone(),
                            title,
                            created_at,
                        });
                    }
                }
            }
        }

        Ok(conversations)
    }

    
    fn extract_user_session_data(data_value: &serde_json::Value) -> Result<Option<(String, String, serde_json::Value)>> {
        // This is a simplified version - you'll need to adapt based on your actual data structure
        // For now, return None as placeholder
        Ok(None)
    }

    
}