use std::net::SocketAddr;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio_tungstenite::accept_async;
use uuid::Uuid;

use crate::{
    helpers::message_manager::MessageManager, // Remove "self," since you're not using it
    services::{llm_service::LlmService, user_service::UserService}, 
    utils::file_utils::JsonFileManager, 
    ws::{ws_channel::WsBroadcaster, ws_handler::handle_ws_connection}
};

pub async fn start_ws_server(
    addr: &str,
    broadcaster: Arc<WsBroadcaster>,
    user_service: Arc<UserService>,
    llm_service: Arc<LlmService>,
) {
    let listener = TcpListener::bind(addr)
        .await
        .expect("Failed to bind WebSocket port");

    println!("🔌 WebSocket server running at ws://{}", addr);
    
    let file_manager = Arc::new(JsonFileManager::new());
    let message_manager = Arc::new(MessageManager::new("messages.json")); 
    
    while let Ok((stream, _)) = listener.accept().await {
        let peer = stream
            .peer_addr()
            .unwrap_or_else(|_| SocketAddr::from(([127, 0, 0, 1], 0)));

        let llm_service = llm_service.clone();
        let broadcaster = broadcaster.clone();
        let user_service = user_service.clone(); 
        let file_manager = file_manager.clone();
        let message_manager = message_manager.clone(); 

        tokio::spawn(async move {
            handle_connection(
                stream, 
                peer, 
                broadcaster, 
                user_service, 
                llm_service, 
                file_manager, 
                message_manager
            ).await;
        });
    }
}

async fn handle_connection(
    stream: tokio::net::TcpStream,
    peer: SocketAddr,
    broadcaster: Arc<WsBroadcaster>,
    user_service: Arc<UserService>,
    llm_service: Arc<LlmService>,
    file_manager: Arc<JsonFileManager>,
    message_manager: Arc<MessageManager>,
) {
    if let Ok(ws_stream) = accept_async(stream).await {
        let client_id = Uuid::new_v4();
        let broadcaster = broadcaster.clone();
        let user_service = user_service.clone();
        let llm_service = llm_service.clone();
        let file_manager = file_manager.clone();
        let message_manager = message_manager.clone();
        
        handle_ws_connection(
            ws_stream, 
            client_id, 
            peer, 
            broadcaster, 
            user_service, 
            llm_service, 
            file_manager, 
            message_manager
        ).await;
    }
}