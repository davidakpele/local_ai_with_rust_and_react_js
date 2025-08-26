use std::sync::Arc;
use utoipa_swagger_ui::SwaggerUi;
use utoipa::OpenApi;
use axum::{
    middleware::{self},
    response::IntoResponse,
    routing::{delete, get, post, put},
    Extension, Json, Router,
    http::StatusCode,
};
use serde_json::json;
use sqlx::PgPool;
use crate::ws::{ws_channel::WsBroadcaster};
use crate::controllers::{
    auth_controller::{login_user, register_user},
    user_controller::{delete_user, get_user_by_id, update_user},
};

use crate::middleware::auth::{AuthUser, AdminUser};

async fn default_handler() -> impl IntoResponse {
    "Backend is up!"
}

async fn handler_404() -> impl IntoResponse {
    (
        StatusCode::NOT_FOUND,
        Json(json!({
            "error": "Not Found",
            "message": "The requested resource was not found"
        })),
    )
}

pub fn create_routes(pool: PgPool, broadcaster: Arc<WsBroadcaster>) -> Router {
    let swagger_handler = SwaggerUi::new("/swagger-ui")
    .url("/api-docs/openapi.json", crate::swagger_doc::doc::ApiDoc::openapi());
    let _ = broadcaster;
    let auth_routes = Router::new()
        .route("/auth/register", post(register_user))
        .route("/auth/login", post(login_user))
        .layer(Extension(pool.clone()));

    let user_routes = Router::new()
        .route("/users/:id", get(get_user_by_id))
        .route("/users/:id", put(update_user))
        .route("/users/:id", delete(delete_user))
        .layer(middleware::from_extractor::<AuthUser>())
        .layer(Extension(pool.clone()));

    let admin_routes = Router::new()
        .route("/admin/secret", get(|| async { "Admin Only" }))
        .layer(middleware::from_extractor::<AdminUser>())
        .layer(Extension(pool.clone()));


    Router::new()
        .merge(auth_routes)
        .merge(user_routes)
        .merge(admin_routes)
        .route("/", get(default_handler))
        .fallback(handler_404)
        .layer(Extension(pool))
        .layer(Extension(broadcaster))
}