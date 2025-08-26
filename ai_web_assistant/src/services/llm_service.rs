use serde::{Deserialize, Serialize};
use serde_json::json;
use std::error::Error;
use std::sync::Arc;
use std::io::{BufReader, Error as IoError};

use tokio::sync::Mutex;
use tokio::io::{AsyncBufReadExt, BufReader as TokioBufReader};
use tokio_util::io::StreamReader;
use uuid::Uuid;
use bytes::Bytes;
use futures_util::{StreamExt, TryStreamExt};

use crate::config::config_llm::Config;
use crate::payloads::communication_response::CommunicationResponse;
use crate::ws::ws_channel::WsBroadcaster;

#[derive(Serialize, Deserialize, Debug)]
struct OllamaResponse {
    response: Option<String>,
    done: bool,
    error: Option<String>,
}

#[derive(Clone)]
pub struct LlmService {
    client: reqwest::Client,
    config: Config,
}

impl LlmService {
    pub fn new() -> Result<Self, Box<dyn Error + Send + Sync>> {
        let cfg = Config::default();
        let client = reqwest::Client::new();
        Ok(Self { client, config: cfg })
    }

    pub async fn run_prompt(
        &self,
        prompt: &str,
        broadcaster: Arc<WsBroadcaster>,
        client_id: Uuid,
    ) -> Result<(), Box<dyn Error + Send + Sync>> {
        let url = format!("{}/api/generate", self.config.ollama_url);

        let request_body = json!({
            "model": self.config.model_name,
            "prompt": prompt,
            "stream": true,
            "options": {
                "temperature": 0.7,
                "top_p": 0.9,
                "top_k": 40,
                "num_predict": -1 
            }
        });

        let response = self.client
            .post(&url)
            .json(&request_body)
            .send()
            .await?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_else(|_| "Failed to read error body.".to_string());
            let _ = broadcaster.send_to(
                &client_id,
                serde_json::to_string(&CommunicationResponse::Error {
                    status: "ai_error".to_string(),
                    error: format!("Ollama API returned error {}: {}", status, body),
                }).unwrap(),
            ).await;
            return Err(format!("Ollama API error: {}", status).into());
        }

        // Convert the streaming response into an async reader
        let byte_stream = response.bytes_stream();
        let stream_reader = StreamReader::new(
            byte_stream.map_err(|e| std::io::Error::new(std::io::ErrorKind::Other, e))
        );
        let reader = TokioBufReader::new(stream_reader);
        let mut lines = reader.lines();

        while let Some(line_result) = lines.next_line().await? {
            let trimmed = line_result.trim();
            if trimmed.is_empty() {
                continue;
            }

            let ollama_response: OllamaResponse = match serde_json::from_str(trimmed) {
                Ok(parsed) => parsed,
                Err(e) => {
                    eprintln!("[LlmService] Failed to parse Ollama stream: {}, line: {}", e, trimmed);
                    continue;
                }
            };

            if let Some(text) = ollama_response.response {
                let _ = broadcaster.send_to(
                    &client_id,
                    serde_json::to_string(&CommunicationResponse::StreamChunk {
                        chunk: text,
                    }).unwrap()
                ).await;
            }

            if ollama_response.done {
                break;
            }
        }

        let _ = broadcaster.send_to(
            &client_id,
            serde_json::to_string(&CommunicationResponse::StreamEnd {
                status: "success".to_string(),
            }).unwrap()
        ).await;

        Ok(())
    }

    pub async fn health_check(&self) -> Result<bool, Box<dyn Error + Send + Sync>> {
        let url = format!("{}/api/tags", self.config.ollama_url);
        
        match self.client.get(&url).send().await {
            Ok(response) => Ok(response.status().is_success()),
            Err(_) => Ok(false),
        }
    }
}
