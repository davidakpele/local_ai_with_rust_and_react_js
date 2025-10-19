# 🚀 Offline AI Assistant - Full-Stack Rust Application

A powerful, self-hosted AI coding assistant built with Rust, featuring a modern web interface and complete offline capabilities. This project demonstrates production-grade software architecture with a clean separation of concerns and real-time AI interactions.

## ✨ Features

- **🔒 Fully Offline** - All AI processing happens locally using Ollama models
- **⚡ Real-time AI Interactions** - WebSocket-powered streaming responses
- **🏗️ Clean Architecture** - Strict separation of concerns across all layers
- **🔐 Production-Ready** - Role-based auth, request tracing, and CORS handling
- **🎯 Type-Safe** - Leveraging Rust's powerful type system for reliability
- **🚀 High Performance** - Built on Axum and Tokio for exceptional throughput

## 🛠️ Tech Stack

### Backend
- **Rust** - Systems programming language for safety and performance
- **Axum** - Web framework built on Tokio for async HTTP services
- **Ollama** - Local AI model inference engine
- **Redis** - High-performance data storage and caching
- **WebSockets** - Real-time bidirectional communication

### Frontend
- **React** - Modern UI framework for dynamic interfaces
- **Real-time UI** - Streaming AI response handling

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   React Frontend│◄──►│   Rust API Layer │◄──►│   AI & Data     │
│                 │    │                  │    │                 │
│ - Real-time UI  │    │ • Routes         │    │ • Ollama Models │
│ - Streaming     │    │ • Controllers    │    │ • Redis DB      │
│   Responses     │    │ • Services       │    │ • WebSockets    │
└─────────────────┘    │ • Repositories   │    └─────────────────┘
                       │ • Middleware     │
                       └──────────────────┘
```

### Core Layers

1. **Routes Layer** - HTTP endpoint definition and request routing
2. **Controller Layer** - Request validation and response formatting
3. **Service Layer** - Business logic and AI coordination
4. **Repository Layer** - Data access and persistence
5. **Middleware Layer** - Auth, tracing, and cross-cutting concerns

## 🚀 Getting Started

### Prerequisites

- Rust 1.70+
- Redis 7.0+
- Ollama (with desired AI models)
- Node.js 18+ (for frontend)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/offline-ai-assistant
   cd offline-ai-assistant
   ```

2. **Set up the backend**
   ```bash
   cd backend
   cp .env.example .env
   # Configure your environment variables
   cargo run
   ```

3. **Set up the frontend**
   ```bash
   cd frontend
   npm install
   npm start
   ```

4. **Configure Ollama**
   ```bash
   ollama pull codellama:7b  # Or your preferred model
   ```

### Environment Configuration

```env
DATABASE_URL=redis://localhost:6379
OLLAMA_BASE_URL=http://localhost:11434
MODEL_NAME=codellama:7b
JWT_SECRET=your-secret-key
SERVER_PORT=3000
```

## 📚 API Endpoints

### AI Operations
- `POST /api/v1/chat` - Send messages to AI (WebSocket)
- `GET /api/v1/models` - List available Ollama models
- `POST /api/v1/models/switch` - Switch active AI model

### Session Management
- `POST /api/v1/auth/login` - User authentication
- `POST /api/v1/auth/register` - User registration
- `GET /api/v1/auth/me` - Get current user info

### Conversation Management
- `GET /api/v1/conversations` - List user conversations
- `GET /api/v1/conversations/:id` - Get specific conversation
- `DELETE /api/v1/conversations/:id` - Delete conversation

## 🎯 Usage Examples

### Code Generation
```
User: Write a Rust function to calculate Fibonacci numbers
AI: [Generates optimized Rust code with explanations]
```

### Debugging Assistance
```
User: Help me debug this async Rust code...
AI: [Analyzes code and suggests fixes with WebSocket streaming]
```

### Project Planning
```
User: How should I structure a microservices architecture?
AI: [Provides architectural guidance and code examples]
```

## 🔧 Development

### Running Tests
```bash
cargo test
cargo test -- --test-threads=1  # For integration tests
```

### Building for Production
```bash
cargo build --release
```

### Code Quality
```bash
cargo clippy
cargo fmt
```

## 🏗️ Project Structure

```
offline-ai-assistant/
├── backend/
│   ├── src/
│   │   ├── main.rs          # Application entry point
│   │   ├── routes/          # HTTP route definitions
│   │   ├── controllers/     # Request handlers
│   │   ├── services/        # Business logic
│   │   ├── repositories/    # Data access layer
│   │   ├── middleware/      # Custom middleware
│   │   └── models/          # Data structures
│   ├── Cargo.toml
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── hooks/           # Custom React hooks
│   │   ├── services/        # API client
│   │   └── styles/          # CSS/styling
│   └── package.json
└── README.md
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Ollama** for making local AI model inference accessible
- **Axum/Tokio** teams for the excellent Rust web ecosystem
- **Redis** for high-performance data storage

---

**Built with ❤️ using Rust, Axum, and modern software architecture principles.**

*⭐ Star this repo if you find it helpful!*
