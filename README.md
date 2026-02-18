# System Agent - Knowledge Graph Extraction and Exploration

A Next.js application for extracting and exploring knowledge graphs from organizational documents using AI-powered analysis.

## Features

- **Document Upload & Processing**: Support for .txt, .md, .csv, .pdf, .docx files
- **Flexible AI Integration**: Choose between Claude (Anthropic), local models (Ollama), or manual mode
- **Interactive Visualizations**: 
  - Force-directed graph view for entities and relationships
  - Hexagonal territory map showing knowledge domains
  - Agent hierarchy tree visualization
- **Real-time Chat**: Query your knowledge graph using natural language
- **Insights Dashboard**: Automatically generated insights about data gaps and inconsistencies
- **Settings Management**: Configure AI providers and extraction preferences per project

## Tech Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS
- **Backend**: Next.js API routes, Prisma ORM
- **Database**: SQLite (development), PostgreSQL (production)
- **Visualizations**: D3.js
- **AI**: Anthropic Claude API
- **UI Components**: Custom components with shadcn/ui styling

## Setup

### Prerequisites

- Node.js 18+ (we detected v22.22.0)
- npm
- **Choose your AI provider:**
  - **Claude (recommended)**: Anthropic API key
  - **Local models**: Ollama installed locally
  - **Manual mode**: No additional setup required

### Installation

1. **Clone and install dependencies**:
   ```bash
   cd /Users/beelucky/.openclaw/workspace/system-agent-app
   npm install
   ```

2. **Configure environment variables**:
   ```bash
   # Basic setup - DATABASE_URL is required
   DATABASE_URL="file:./dev.db"
   
   # Optional: Set default Anthropic API key (can also be set per project)
   ANTHROPIC_API_KEY="your_anthropic_api_key_here"
   ```

3. **Initialize the database**:
   ```bash
   npm run db:push
   ```

4. **Start the development server**:
   ```bash
   npm run dev
   ```

5. **Open your browser** and navigate to [http://localhost:3000](http://localhost:3000)

## AI Provider Setup

### Option 1: Claude (Anthropic) - Recommended

1. Get an API key from [Anthropic Console](https://console.anthropic.com/)
2. In your project, click the ⚙️ settings icon
3. Select "Claude (Anthropic)" as your AI provider
4. Paste your API key and test the connection
5. Choose extraction depth:
   - **Quick scan**: Uses Claude 3 Haiku (faster, cheaper)
   - **Deep analysis**: Uses Claude 3.5 Sonnet (slower, more thorough)

### Option 2: Local Models (Ollama) - Privacy-Focused

1. **Install Ollama**:
   ```bash
   # macOS
   brew install ollama
   
   # Or download from https://ollama.ai
   ```

2. **Start Ollama**:
   ```bash
   ollama serve
   ```

3. **Pull a model** (recommended):
   ```bash
   # For good performance
   ollama pull llama3
   
   # Or for lighter resource usage
   ollama pull llama3:8b
   ```

4. **Configure in settings**:
   - Click the ⚙️ settings icon in your project
   - Select "Local Model (Ollama)"
   - Verify URL (default: `http://localhost:11434`)
   - Set model name (e.g., `llama3`)
   - Test connection to verify setup

### Option 3: Manual Mode - No AI Required

1. In project settings, select "None (manual only)"
2. Upload documents and manually create entities and relationships
3. Chat functionality will be disabled
4. All extraction must be done manually through the interface

## Usage

### 1. Create a Project
- Click "New Project" on the home page
- Give it a name and description
- Click "Create"

### 2. Configure AI Settings (First Time)
- Click the ⚙️ settings icon in your project header
- Choose your preferred AI provider (Claude, Ollama, or Manual mode)
- Configure API keys or connection details
- Test the connection to ensure it works
- Save your settings

### 3. Upload Documents
- Click the 📄 button in the bottom-right corner
- Drag & drop files or click to browse
- Supported formats: .txt, .md, .csv, .pdf, .docx
- Click "Start Ingestion"

### 3. Explore Your Data
Switch between three main views:

- **GRAPH VIEW**: Interactive network of entities and relationships
- **GAME VIEW**: Hexagonal territory map showing knowledge domains
- **GEN-TIC VIEW**: Agent hierarchy managing different aspects of your data

### 4. Chat with Your Data
- Click the 💬 button to open the chat interface
- Ask questions about entities, relationships, or insights
- The AI assistant has full context of your knowledge graph

### 5. Review Insights
- Check the insights panel for automatically detected:
  - Data inconsistencies
  - Knowledge gaps
  - Risks and opportunities
  - Cultural observations

## Database Schema

The application uses these main models:
- **Project**: Container for all data
- **Document**: Uploaded files with extracted content
- **Entity**: People, organizations, systems, etc.
- **Edge**: Relationships between entities
- **Territory**: Clusters of related entities
- **Agent**: AI agents managing different domains
- **Insight**: Automatically generated observations
- **ChatMessage**: Conversation history

## API Endpoints

### Projects
- `GET /api/projects` - List all projects
- `POST /api/projects` - Create new project
- `GET /api/projects/[id]` - Get project details

### Documents
- `POST /api/projects/[id]/documents` - Upload documents
- `POST /api/projects/[id]/documents/[docId]/extract` - Extract knowledge

### Data
- `GET /api/projects/[id]/graph` - Get entities and relationships
- `GET /api/projects/[id]/territories` - Get territory data
- `GET /api/projects/[id]/agents` - Get agent hierarchy
- `GET /api/projects/[id]/insights` - Get insights

### Settings
- `GET /api/projects/[id]/settings` - Get project settings
- `PUT /api/projects/[id]/settings` - Update project settings
- `POST /api/projects/[id]/settings/test` - Test AI provider connection

### Chat
- `GET /api/projects/[id]/chat` - Get chat history
- `POST /api/projects/[id]/chat` - Send chat message

## Development

### Database Commands
```bash
# Push schema changes to database
npm run db:push

# Open Prisma Studio (database browser)
npm run db:studio

# Reset database (careful!)
rm dev.db && npm run db:push
```

### Project Structure
```
src/
├── app/
│   ├── api/          # API routes
│   ├── project/      # Project pages
│   ├── globals.css   # Global styles
│   ├── layout.tsx    # Root layout
│   └── page.tsx      # Home page
├── components/       # React components
│   ├── GraphView.tsx
│   ├── HexMapView.tsx
│   ├── AgentTreeView.tsx
│   ├── ChatView.tsx
│   ├── UploadPanel.tsx
│   ├── InsightsPanel.tsx
│   └── EntityDetail.tsx
└── lib/
    └── prisma.ts     # Database client
```

## Deployment

### Switching to PostgreSQL (Production)

1. **Update environment variables**:
   ```bash
   DATABASE_URL="postgresql://username:password@host:port/database"
   ```

2. **Update Prisma schema**:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```

3. **Push schema to production**:
   ```bash
   npm run db:push
   ```

### Vercel Deployment

1. **Connect your repository** to Vercel
2. **Set environment variables** in Vercel dashboard:
   - `ANTHROPIC_API_KEY`
   - `DATABASE_URL` (PostgreSQL connection string)
3. **Deploy** - Vercel will automatically build and deploy

## Configuration

### Anthropic API
- Get your API key from [Anthropic Console](https://console.anthropic.com/)
- Model used: Claude 3.5 Sonnet for extraction, Claude 3 Haiku for chat
- Ensure you have sufficient credits/quota

### File Upload Limits
- Default Next.js limits apply (1MB for API routes)
- For larger files, consider implementing streaming uploads
- Supported formats are defined in the upload components

## Troubleshooting

### Database Issues
- If you get "database locked" errors, restart the dev server
- Check that `dev.db` file exists and has proper permissions
- Use `npx prisma db push` to recreate the database if needed

### API Key Issues
- Verify your Anthropic API key is correct in `.env.local`
- Check that the key has sufficient credits
- Ensure the key has access to Claude 3.5 Sonnet

### Memory Issues
- Large documents may cause memory issues during extraction
- Consider splitting large files into smaller chunks
- Monitor your Anthropic API usage and token limits

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for demonstration and development purposes. Please respect the terms of service for all integrated APIs (Anthropic, etc.).