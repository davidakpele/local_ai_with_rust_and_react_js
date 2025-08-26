use serde::Deserialize;
use dotenv::dotenv;
use std::env;

#[allow(dead_code)]
#[derive(Debug, Deserialize, Clone)]
pub struct Settings {
    pub database_url: String,
    pub broker_api_url: String,
    pub broker_api_key: String,
}


impl Settings {
    pub fn new() -> Self {
        dotenv().ok();

        Settings {
            database_url: env::var("DATABASE_URL").expect("DATABASE_URL must be set"),
            broker_api_url: env::var("BROKER_API_URL").expect("BROKER_API_URL must be set"),
            broker_api_key: env::var("BROKER_API_KEY").expect("BROKER_API_KEY must be set"),
        }
    }
}
