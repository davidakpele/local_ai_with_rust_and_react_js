// ws_handler.rs
use std::{collections::HashMap, net::SocketAddr};
use std::sync::Arc;
use futures_util::{SinkExt, StreamExt};
use serde::Serialize;
use serde_json::{json};
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::protocol::Message;
use uuid::Uuid;
use chrono::Utc;

use crate::{
    helpers::message_manager::MessageManager, payloads::{communication_request::CommunicationRequest, communication_response::{CommunicationResponse, ConversationSummary}, connection_request::ConnectionRequest}, services::{llm_service::LlmService, user_service::UserService}, utils::{file_models::{AuthSession, BasicInfo, ChatMessage, ChatSession, ContentPreferences, PasswordInfo, PremiumMembership, SecurityInfo, SessionInfo, SessionRecord, SubscriptionInfo, TwoFactorAuth, UserData, UserSessions, UsersWrapper}, file_utils::JsonFileManager, jwt::Claims}, ws::{ws_auth::WsAuth, ws_channel::WsBroadcaster}
};

pub async fn handle_ws_connection(
    ws_stream: tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    client_id: Uuid,
    peer: SocketAddr,
    broadcaster: Arc<WsBroadcaster>,
    user_service: Arc<UserService>,
    llm_service: Arc<LlmService>,
    file_manager: Arc<JsonFileManager>,
    message_manager: Arc<MessageManager>,
) {
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    // AUTHENTICATION PHASE 
    let (user_id, claims) = match ws_receiver.next().await {
        Some(Ok(first_msg)) => {
            match WsAuth::from_first_message(&first_msg).await {
                Ok(WsAuth(claims)) => {
                    (claims.sub as u64, claims)
                }
                Err((code, msg)) => {
                    let _ = ws_sender.send(Message::Text(
                        json!({
                            "type": "error",
                            "status": "authentication_failed",
                            "error": msg,
                            "code": code.as_u16()
                        }).to_string().into()
                    )).await;
                    return;
                }
            }
        }
        Some(Err(e)) => {
            let _ = ws_sender.send(Message::Text(
                json!({
                    "type": "error",
                    "status": "connection_error",
                    "error": format!("Failed to read message: {}", e),
                    "code": 400
                }).to_string().into()
            )).await;
            return;
        }
        None => {
            let _ = ws_sender.send(Message::Text(
                json!({
                    "type": "error",
                    "status": "no_message",
                    "error": "No initial message received",
                    "code": 400
                }).to_string().into()
            )).await;
            return;
        }
    };

    // SESSION CREATION
    let now = Utc::now();

    // Load existing sessions.json
    let mut auth_session: AuthSession = match tokio::fs::read_to_string("sessions.json").await {
        Ok(data) => serde_json::from_str(&data).unwrap_or(AuthSession { 
            auth_session: vec![UsersWrapper { 
                users: vec![] 
            }] }),
        Err(_) => AuthSession { auth_session: vec![UsersWrapper { users: vec![] }] },
    };

    let mut session_id = Uuid::new_v4().to_string();
    let mut session_exists = false;

    // Check if user already has a session
    if let Some(wrapper) = auth_session.auth_session.first_mut() {
        for user_sessions in &mut wrapper.users {
            if let Some(sessions) = user_sessions.sessions.get_mut(&user_id) {
                if let Some(existing_session) = sessions.first() {
                    // Use existing session ID
                    session_id = existing_session.session_id.clone();
                    session_exists = true;
                    break;
                }
            }
        }
    }

    // If session doesn't exist, create new session entry
    if !session_exists {
        let session_info = SessionInfo {
            session_id: session_id.clone(),
            timestamp: now,
        };

        // Build the session structure
        let mut user_sessions = HashMap::new();
        user_sessions.insert(user_id, vec![session_info]);

        let new_user_session = UserSessions {
            sessions: user_sessions,
        };

        // Add to existing auth_session or create new one
        if auth_session.auth_session.is_empty() {
            auth_session.auth_session.push(UsersWrapper {
                users: vec![new_user_session],
            });
        } else {
            auth_session.auth_session[0].users.push(new_user_session);
        }
    }

    // 1. SAVE USER DATA FIRST
    let user_data = UserData {
        session_id: session_id.clone(),
        basic_info: BasicInfo {
            id: format!("usr_{}", user_id),
            email: claims.email.clone(),
            status: "active".to_string(),
            account_type: "premium".to_string(),
            last_login: now,
        },
        content: ContentPreferences {
            theme: "dark".to_string(),
            language: "en".to_string(),
            timezone: "America/New_York".to_string(),
            date_format: "MM/DD/YYYY".to_string(),
        },
        security: SecurityInfo {
            password: PasswordInfo {
                last_changed: now,
                requires_reset: false,
            },
            two_factor_auth: TwoFactorAuth {
                enabled: true,
                method: "authenticator_app".to_string(),
            },
        },
        subscriptions: SubscriptionInfo {
            premium_membership: PremiumMembership {
                active: true,
                tier: "pro".to_string(),
                start_date: now.format("%Y-%m-%d").to_string(),
                renewal_date: now.format("%Y-%m-%d").to_string(),
                payment_method: "credit_card".to_string(),
            },
        },
    };
    self::save_with_retry(&file_manager, "users.json", user_data, 3).await;

    // 2. SAVE SESSION DATA SECOND
    self::save_with_retry(&file_manager, "sessions.json", auth_session, 3).await;

    // 3. SAVE MESSAGE DATA LAST
    let chat_session = ChatSession {
        title: "New Chat Session".to_string(),
        created_at: now,
        messages: Vec::new(),
    };
    self::save_with_retry(&file_manager, "messages.json", chat_session, 3).await;

    // Register client
    let (tx, mut rx) = mpsc::unbounded_channel();
    broadcaster.add_client(client_id, tx).await;

    // Send session info
    let _ = ws_sender.send(Message::Text(
        serde_json::to_string(&CommunicationResponse::SessionCreated {
            status: "session_created".to_string(),
            session_id: session_id.clone(),
            user_id,
        }).unwrap().into()
    )).await;

    // MAIN MESSAGE PROCESSING LOOP
    let process_task = tokio::spawn({
        let broadcaster = broadcaster.clone();
        let llm_service = llm_service.clone();
        let file_manager = file_manager.clone();
        let client_id_for_task = client_id.clone();
        let session_id_clone = session_id.clone();

        async move {
            while let Some(Ok(msg)) = ws_receiver.next().await {
                match msg {
                    Message::Text(text) => {
                        // First, try parsing as a ConnectionRequest
                        match serde_json::from_str::<ConnectionRequest>(&text) {
                            Ok(conn_req) => {
                                match conn_req {
                                    ConnectionRequest::Disconnect { session_id: req_session_id, user_id: _ } => {
                                        if req_session_id == session_id_clone {
                                            let _ = broadcaster.send_to(
                                                &client_id_for_task,
                                                serde_json::to_string(&CommunicationResponse::Disconnected {
                                                    status: "disconnected".to_string(),
                                                }).unwrap()
                                            ).await;
                                            break;
                                        }
                                    }
                                    ConnectionRequest::StartConnection { .. } => {
                                        let _ = broadcaster.send_to(
                                            &client_id_for_task,
                                            serde_json::to_string(&CommunicationResponse::Error {
                                                status: "invalid_request".to_string(),
                                                error: "Already connected".to_string(),
                                            }).unwrap()
                                        ).await;
                                    }
                                }
                            }
                            Err(_) => {
                                // If not a ConnectionRequest, try parsing as CommunicationRequest
                                match serde_json::from_str::<CommunicationRequest>(&text) {
                                    Ok(comm_req) => {
                                        match comm_req {
                                            CommunicationRequest::AIRequest { prompt, session_id } => {
                                                // Generate unique ID for user message
                                                let user_message_id = format!("msg_{}", Uuid::new_v4());
                                                let timestamp = Utc::now();

                                                let user_message = ChatMessage {
                                                    message_id: user_message_id.clone(),
                                                    parent_id: "root".to_string(),
                                                    reply_id: None,
                                                    role: "user".to_string(),
                                                    content: prompt.clone(),
                                                    edited: false,
                                                    timestamp,
                                                    edit_timestamp: None,
                                                };

                                                // Send back message_created response
                                                let _ = broadcaster.send_to(
                                                    &client_id_for_task,
                                                    serde_json::to_string(&CommunicationResponse::MessageCreated {
                                                        status: "message_created".to_string(),
                                                        message_id: user_message_id.clone(),
                                                        message: user_message.clone(),
                                                    }).unwrap()
                                                ).await;

                                                // Convert user_id to string
                                                let user_id_str = user_id;

                                                // Save user message to the provided session
                                                if let Err(e) = message_manager.save_message(
                                                    &user_id_str,
                                                    &session_id, 
                                                    user_message,
                                                ).await {
                                                    eprintln!("Failed to save user message: {}", e);
                                                }

                                                // Spawn AI response task
                                                let llm_service_clone = llm_service.clone();
                                                let broadcaster_clone = broadcaster.clone();
                                                let message_manager_clone = message_manager.clone();
                                                let client_id_clone = client_id_for_task.clone();
                                                let user_id_str_clone = user_id_str.clone();
                                                let user_message_id_clone = user_message_id.clone();

                                                tokio::spawn(async move {
                                                    if let Ok(response) = llm_service_clone
                                                        .run_prompt(&prompt, broadcaster_clone.clone(), client_id_clone.clone())
                                                        .await
                                                    {
                                                        let ai_message = ChatMessage {
                                                            message_id: Uuid::new_v4().to_string(),
                                                            parent_id: "root".to_string(),
                                                            reply_id: Some(user_message_id_clone),
                                                            role: "ai".to_string(),
                                                            content: response,
                                                            edited: false,
                                                            timestamp: Utc::now(),
                                                            edit_timestamp: None,
                                                        };

                                                        // Save AI message in the same session
                                                        if let Err(e) = message_manager_clone.save_message(
                                                            &user_id_str_clone,
                                                            &session_id,
                                                            ai_message,
                                                        ).await {
                                                            eprintln!("Failed to save AI message: {}", e);
                                                        }
                                                    }
                                                });
                                            }

                                            CommunicationRequest::FetchSidebarHistory { user_id } => {
                                                match message_manager.get_all_conversation_titles(user_id).await {
                                                    Ok(conversations) => {
                                                        // Map to clean JSON response
                                                        let response = conversations.into_iter()
                                                            .map(|conv| {
                                                                json!({
                                                                    "id": conv.id,
                                                                    "title": conv.title,
                                                                    "created_at": conv.created_at.to_rfc3339()
                                                                })
                                                            })
                                                            .collect::<Vec<_>>();
                                                        
                                                        let _ = broadcaster.send_to(
                                                            &client_id_for_task,
                                                            serde_json::to_string(&json!({
                                                                "type": "sidebar_history",
                                                                "status": "ok",
                                                                "conversations": response
                                                            })).unwrap()
                                                        ).await;
                                                    }
                                                    Err(e) => {
                                                        eprintln!("Failed to fetch sidebar history for user {}: {}", user_id, e);
                                                        
                                                        // Add debug info - check if file exists and its size
                                                        if let Ok(metadata) = tokio::fs::metadata("messages.json").await {
                                                            eprintln!("messages.json metadata: size={}, modified={:?}", 
                                                                metadata.len(), metadata.modified());
                                                        } else {
                                                            eprintln!("messages.json does not exist");
                                                        }
                                                        
                                                        let _ = broadcaster.send_to(
                                                            &client_id_for_task,
                                                            serde_json::to_string(&json!({
                                                                "type": "sidebar_history",
                                                                "status": "error",
                                                                "error": format!("Failed to fetch conversations: {}", e)
                                                            })).unwrap()
                                                        ).await;
                                                    }
                                                }
                                            }
                                            
                                            CommunicationRequest::FetchConversation { conversation_id } => {
                                                let user_id_str = user_id.to_string();
                                                match message_manager.get_user_messages(&user_id_str, Some(&conversation_id)).await {
                                                    Ok(messages) => {
                                                        let _ = broadcaster.send_to(
                                                            &client_id_for_task,
                                                            serde_json::to_string(&CommunicationResponse::ConversationHistory {
                                                                status: "ok".to_string(),
                                                                conversation_id,
                                                                messages,
                                                            }).unwrap()
                                                        ).await;
                                                    }
                                                    Err(e) => {
                                                        let _ = broadcaster.send_to(
                                                            &client_id_for_task,
                                                            serde_json::to_string(&CommunicationResponse::Error {
                                                                status: "error".to_string(),
                                                                error: "Failed to fetch conversation".to_string(),
                                                            }).unwrap()
                                                        ).await;
                                                    }
                                                }
                                            }

                                            CommunicationRequest::StartNewSession { user_id } => {
                                                let now = Utc::now();
                                                let new_session_id = Uuid::new_v4();
                                                // Load existing auth_session
                                                let mut auth_session: AuthSession = match tokio::fs::read_to_string("sessions.json").await {
                                                    Ok(data) => serde_json::from_str(&data).unwrap_or(AuthSession { auth_session: vec![UsersWrapper { users: vec![] }] }),
                                                    Err(_) => AuthSession { auth_session: vec![UsersWrapper { users: vec![] }] },
                                                };

                                                // Flatten and check for user
                                                let mut existing_session_id: Option<String> = None;
                                                if let Some(wrapper) = auth_session.auth_session.first_mut() {
                                                    for user_sessions in &mut wrapper.users {
                                                        if let Some(sessions) = user_sessions.sessions.get(&user_id) {
                                                            if let Some(existing) = sessions.first() {
                                                                existing_session_id = Some(existing.session_id.clone());
                                                                break;
                                                            }
                                                        }
                                                    }
                                                }

                                                if let Some(session_id) = existing_session_id {
                                                    // Respond with existing session
                                                    let _ = broadcaster.send_to(
                                                        &client_id_for_task,
                                                        serde_json::to_string(&CommunicationResponse::SessionCreated {
                                                            status: "ok".to_string(),
                                                            session_id,
                                                            user_id,
                                                        }).unwrap()
                                                    ).await;
                                                } else {
                                                    // User not found → create new session entry
                                                    let session_info = SessionInfo {
                                                        session_id: new_session_id.to_string(),
                                                        timestamp: now,
                                                    };

                                                    if let Some(wrapper) = auth_session.auth_session.first_mut() {
                                                        wrapper.users.push(UserSessions {
                                                            sessions: {
                                                                let mut map = HashMap::new();
                                                                map.insert(user_id, vec![session_info]);
                                                                map
                                                            },
                                                        });
                                                    }

                                                    // Save back to file
                                                    if let Err(e) = tokio::fs::write(
                                                        "sessions.json",
                                                        serde_json::to_string_pretty(&auth_session).unwrap()
                                                    ).await {
                                                        eprintln!("Failed to save new session: {}", e);
                                                        let _ = broadcaster.send_to(
                                                            &client_id_for_task,
                                                            serde_json::to_string(&CommunicationResponse::Error {
                                                                status: "error".to_string(),
                                                                error: "Failed to create session".to_string(),
                                                            }).unwrap()
                                                        ).await;
                                                        break;
                                                    }

                                                    // Respond with new session
                                                    let _ = broadcaster.send_to(
                                                        &client_id_for_task,
                                                        serde_json::to_string(&CommunicationResponse::SessionCreated {
                                                            status: "ok".to_string(),
                                                            session_id: new_session_id.to_string(),
                                                            user_id,
                                                        }).unwrap()
                                                    ).await;
                                                }
                                            }

                                            CommunicationRequest::EditMessageContentById { content_id, content } => {
                                                let user_id_str = user_id.to_string();
                                                match message_manager.edit_message_content(&user_id_str, &content_id, &content).await {
                                                    Ok(()) => {
                                                        let _ = broadcaster.send_to(
                                                            &client_id_for_task,
                                                            serde_json::to_string(&json!({
                                                                "type": "message_edited",
                                                                "status": "ok",
                                                                "content_id": content_id,
                                                                "content": content
                                                            })).unwrap()
                                                        ).await;
                                                    }
                                                    Err(e) => {
                                                        eprintln!("Failed to edit message: {}", e);
                                                        let _ = broadcaster.send_to(
                                                            &client_id_for_task,
                                                            serde_json::to_string(&json!({
                                                                "type": "message_edited",
                                                                "status": "error",
                                                                "error": format!("Failed to edit message: {}", e)
                                                            })).unwrap()
                                                        ).await;
                                                    }
                                                }
                                            }

                                            CommunicationRequest::EditContentTitleById { message_id, content } => {
                                                let user_id_str = user_id.to_string();
                                                match message_manager.edit_title(&user_id_str, &message_id, &content).await {
                                                    Ok(conversation_title) => {
                                                        let _ = broadcaster.send_to(
                                                            &client_id_for_task,
                                                            serde_json::to_string(&json!({
                                                                "type": "content_title_edited",
                                                                "status": "ok",
                                                                "message_id": message_id,
                                                                "content": content,
                                                                "conversation_title": conversation_title
                                                            })).unwrap()
                                                        ).await;
                                                    }
                                                    Err(e) => {
                                                        let _ = broadcaster.send_to(
                                                            &client_id_for_task,
                                                            serde_json::to_string(&json!({
                                                                "type": "content_title_edited",
                                                                "status": "error",
                                                                "error": format!("Failed to edit content and title: {}", e)
                                                            })).unwrap()
                                                        ).await;
                                                    }
                                                }
                                            }

                                            CommunicationRequest::DeleteContentTById { target_id } => {
                                                let user_id_str = user_id.to_string();
                                                match message_manager.delete_by_id(&user_id_str, &target_id).await {
                                                    Ok(delete_result) => {
                                                        let _ = broadcaster.send_to(
                                                            &client_id_for_task,
                                                            serde_json::to_string(&json!({
                                                                "type": "deleted",
                                                                "status": "ok",
                                                                "deleted_type": delete_result.deleted_type,
                                                                "target_id": delete_result.target_id,
                                                                "title": delete_result.title,
                                                                "message": delete_result.message
                                                            })).unwrap()
                                                        ).await;
                                                    }
                                                    Err(e) => {
                                                        eprintln!("Failed to delete: {}", e);
                                                        let _ = broadcaster.send_to(
                                                            &client_id_for_task,
                                                            serde_json::to_string(&json!({
                                                                "type": "deleted",
                                                                "status": "error",
                                                                "error": format!("Failed to delete: {}", e)
                                                            })).unwrap()
                                                        ).await;
                                                    }
                                                }
                                            }

                                            CommunicationRequest::FetchAllMessages => {
                                                let user_id_str = user_id.to_string();
                                                match message_manager.get_all_user_messages(&user_id_str).await {
                                                    Ok(messages) => {
                                                        let _ = broadcaster.send_to(
                                                            &client_id_for_task,
                                                            serde_json::to_string(&json!({
                                                                "type": "all_messages",
                                                                "status": "ok",
                                                                "messages": messages,
                                                                "total_count": messages.len()
                                                            })).unwrap()
                                                        ).await;
                                                    }
                                                    Err(e) => {
                                                        eprintln!("Failed to fetch all messages: {}", e);
                                                        let _ = broadcaster.send_to(
                                                            &client_id_for_task,
                                                            serde_json::to_string(&json!({
                                                                "type": "all_messages",
                                                                "status": "error",
                                                                "error": format!("Failed to fetch all messages: {}", e)
                                                            })).unwrap()
                                                        ).await;
                                                    }
                                                }
                                            }
                                        }
                                    }
                                    Err(_) => {
                                        let _ = broadcaster.send_to(
                                            &client_id_for_task,
                                            serde_json::to_string(&CommunicationResponse::Error {
                                                status: "invalid_request".to_string(),
                                                error: "Unknown request type".to_string(),
                                            }).unwrap()
                                        ).await;
                                    }
                                }
                            }
                        }
                    }
                    Message::Close(_) => break,
                    _ => {
                        let _ = broadcaster.send_to(
                            &client_id_for_task,
                            serde_json::to_string(&CommunicationResponse::Error {
                                status: "invalid_message".to_string(),
                                error: "Only text messages are supported".to_string(),
                            }).unwrap()
                        ).await;
                    }
                }
            }
        }
    });

    // Message sending task
    let send_task = tokio::spawn(async move {
        while let Some(msg) = rx.recv().await {
            if ws_sender.send(Message::Text(msg.into())).await.is_err() {
                break;
            }
        }
    });

    tokio::select! {
        _ = process_task => (),
        _ = send_task => (),
    }

    println!("[{}] Connection closed", client_id);
}

async fn save_with_retry<T: Serialize + Send + Sync>(
    file_manager: &Arc<JsonFileManager>,
    file_path: &str,
    data: T,
    max_retries: usize,
) {
    for attempt in 0..max_retries {
        match file_manager.append_to_file(file_path, &data).await {
            Ok(_) => {
                break;
            }
            Err(e) => {
                if attempt == max_retries - 1 {
                    eprintln!("Giving up on saving to {}", file_path);
                }
                tokio::time::sleep(tokio::time::Duration::from_millis(100)).await;
            }
        }
    }
}
