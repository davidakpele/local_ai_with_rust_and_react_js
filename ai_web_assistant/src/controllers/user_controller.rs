use axum::{
    extract::{Path, Extension},
    http::StatusCode,
    response::{IntoResponse, Response},
    Json,
};
use serde::{Deserialize, Serialize};
use sqlx::PgPool;

use crate::{repository::user_repository::UserRepository, responses::responses::SafeUser, services::user_service::UserService};

// Make sure ApiResponse derives Serialize
#[derive(Debug, Serialize)]
pub struct ApiResponse<T: Serialize> {
    pub data: Option<T>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateUserRequest {
    pub username: Option<String>,
    pub email: Option<String>,
}

// Implement IntoResponse for our ApiResponse wrapper
impl<T: Serialize> IntoResponse for ApiResponse<T> {
    fn into_response(self) -> Response {
        Json(self).into_response()
    }
}

fn api_response<T: Serialize>(
    status: StatusCode,
    data: Option<T>,
    error: Option<String>,
) -> impl IntoResponse {
    (status, Json(ApiResponse { data, error }))
}

pub async fn get_user_by_id(
    Extension(db): Extension<PgPool>,
    Path(user_id): Path<i32>,
) -> impl IntoResponse {
    let repository = UserRepository { db };
    let service = UserService::new(repository);

    match service.get_user_by_id(user_id).await {
        Ok(Some(user)) => {
            let public_user: SafeUser = user.into();
            api_response(StatusCode::OK, Some(public_user), None)
        },
        Ok(None) => {
            api_response(StatusCode::NOT_FOUND, None, Some("User not found".to_string()))
        },
        Err(e) => {
            api_response(StatusCode::INTERNAL_SERVER_ERROR, None, Some(e.to_string()))
        },
    }
}


pub async fn update_user(
    Extension(db): Extension<PgPool>,
    Path(user_id): Path<i32>,
    Json(payload): Json<UpdateUserRequest>,
) -> impl IntoResponse {
    let repository = UserRepository { db };
    let service = UserService::new(repository);
    
    match service.update_user_profile(user_id, payload).await {
        Ok(user) => api_response(StatusCode::OK, Some(user), None),
        Err(e) => api_response(StatusCode::BAD_REQUEST, None, Some(e.to_string())),
    }
}

pub async fn delete_user(
    Extension(db): Extension<PgPool>,
    Path(user_id): Path<i32>,
) -> impl IntoResponse {
    let repository = UserRepository { db };
    let service = UserService::new(repository);
    
    match service.remove_user(user_id).await {
        Ok(_) => api_response(StatusCode::NO_CONTENT, None::<()>, None),
        Err(e) => api_response(StatusCode::BAD_REQUEST, None::<()>, Some(e.to_string())),
    }
}