use utoipa::OpenApi;
use crate::payloads::{login_request::LoginRequest, register_request::RegisterRequest};
use crate::responses::login_responses::LoginResponse;
use crate::controllers::auth_controller::ErrorResponse;

#[derive(OpenApi)]
#[openapi(
    paths(
        crate::controllers::auth_controller::register_user,
        crate::controllers::auth_controller::login_user
    ),
    components(
        schemas(
            LoginRequest,
            RegisterRequest,
            LoginResponse,
            ErrorResponse
        )
    ),
    tags(
        (name = "Auth", description = "Authentication endpoints")
    )
)]
pub struct ApiDoc;
