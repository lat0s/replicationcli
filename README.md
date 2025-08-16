# Replication Package CLI

A replication package for our Thesis: "Measuring the Impact of AI Generated Code in MERN Applications".

## Quick Start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the application:

   ```bash
   node index.js
   ```

3. Drop your codebase into the `codebase/` folder and follow the interactive prompts.

## Environment Setup

The `.env.example` file contains API key templates for online LLM services:

```bash
# API Keys for Online LLM Services
GEMINI_API_KEY=your_gemini_api_key_here      # Get from: https://makersuite.google.com/app/apikey
DEEPSEEK_API_KEY=your_deepseek_api_key_here  # Get from: https://platform.deepseek.com/
OPENROUTER_API_KEY=your_openrouter_key_here  # Get from: https://openrouter.ai/
```

Copy to `.env` and add your keys to enable online LLM features.

## Project Structure

```
replicationcli/
├── index.js                    # Main CLI entry point
├── package.json               # Node.js dependencies
├── .env.example               # Environment variables template
├── codebase/                  # Place your target codebase here
├── generation_output/         # AI-generated code outputs
│   ├── deepseek/
│   ├── gemini/
│   ├── local/
│   └── openrouter/
│       ├── llama-3.1-70b/
│       └── phi-4-reasoning-plus/
├── logs/                      # Detailed API call logs with timestamps
│   ├── deepseek/
│   ├── gemini/
│   └── openrouter/
├── parsedCodebase/           # Parsed codebase states
│   ├── original/             # Initial parsed codebase
│   └── removed/              # Modified codebase after file removal
└── src/                      # Core application modules
    ├── codebaseParser.js     # Codebase parsing and analysis
    ├── codebaseProcessor.js  # File management operations
    ├── fileSystemUtils.js    # File system utilities
    ├── llmApiClient.js       # LLM API integrations
    ├── parserMenu.js         # Parser interface
    ├── removedFileApiService.js # File regeneration service
    ├── simpleInput.js        # Input utilities
    └── prompts/
        └── llmPrompts.js     # LLM prompt template
```

## Usage Workflow

1. **Prepare Codebase**: Place your target codebase in the `codebase/` folder
2. **Parse Codebase**: Run the CLI and select "Parser" to analyze the codebase structure
3. **Remove Files**: Select files you want to regenerate and remove them from the parsed codebase
4. **Regenerate Files**: Use the File Regeneration Service with your preferred LLM provider
5. **Review Results**: Check `generation_output/` for regenerated files and `logs/` for detailed API interactions
