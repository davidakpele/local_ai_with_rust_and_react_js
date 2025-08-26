// ws_handler.rs
use std::net::SocketAddr;
use std::sync::Arc;
use futures_util::{SinkExt, StreamExt};
use serde_json::{json};
use tokio::sync::mpsc;
use tokio_tungstenite::tungstenite::protocol::Message;
use uuid::Uuid;
use crate::payloads::communication_response::CommunicationResponse;
use crate::payloads::communication_request::CommunicationRequest;
use crate::payloads::connection_request::ConnectionRequest;
use crate::services::llm_service::LlmService;
use crate::{
    services::user_service::UserService,
    utils::jwt::Claims,
    ws::{ws_auth::WsAuth, ws_channel::WsBroadcaster},
};

pub async fn handle_ws_connection(
    ws_stream: tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
    client_id: Uuid,
    peer: SocketAddr,
    broadcaster: Arc<WsBroadcaster>,
    user_service: Arc<UserService>,
    llm_service: Arc<LlmService>,
) {
    let (mut ws_sender, mut ws_receiver) = ws_stream.split();

    // AUTHENTICATION PHASE 
    let (user_id, claims) = match ws_receiver.next().await {
        Some(Ok(first_msg)) => {
            match WsAuth::from_first_message(&first_msg).await {
                Ok(WsAuth(claims)) => {
                    println!("[{client_id}] JWT authentication succeeded");
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
    let session_id = Uuid::new_v4().to_string();

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

    //  MAIN MESSAGE PROCESSING LOOP
    let process_task = tokio::spawn({
        let broadcaster = broadcaster.clone();
        let llm_service = llm_service.clone();
        let client_id_for_task = client_id.clone(); 

        async move {
            // inside the process_task async block
            while let Some(Ok(msg)) = ws_receiver.next().await {
                match msg {
                    Message::Text(text) => {
                        match serde_json::from_str::<ConnectionRequest>(&text) {
                            Ok(conn_req) => {
                                match conn_req {
                                    ConnectionRequest::Disconnect { session_id: req_session_id, user_id: _ } => {
                                        if req_session_id == session_id {
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
                                match serde_json::from_str::<CommunicationRequest>(&text) {
                                    Ok(comm_req) => {
                                        let CommunicationRequest::AIRequest { prompt } = comm_req;

                                        // CLONE HERE before moving into the spawn block
                                        let llm_service_clone = llm_service.clone();
                                        let broadcaster_clone = broadcaster.clone();
                                        let client_id_clone = client_id_for_task.clone();

                                        tokio::spawn(async move {
                                            let _ = llm_service_clone.run_prompt(&prompt, broadcaster_clone, client_id_clone).await;
                                        });
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
