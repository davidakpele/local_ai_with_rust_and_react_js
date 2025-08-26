// config_llm.rs
#[derive(Clone)]
pub struct Config {
    pub ollama_url: String,
    pub model_name: String,
}

impl Config {
    pub fn default() -> Self {
        Self {
            ollama_url: "http://localhost:11434".to_string(),
            model_name: "finalend/hermes-3-llama-3.1:8b".to_string(),
        }
    }
}