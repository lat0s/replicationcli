const fs = require("fs");
const path = require("path");

const FileSystemUtils = require("./fileSystemUtils");
const { SimpleInput, colorize } = require("./simpleInput");
const LlmPrompts = require("./prompts/llmPrompts");
const LlmApiClient = require("./llmApiClient");

require("dotenv").config();

class RemovedFileApiService {
  constructor() {
    this.fileUtils = new FileSystemUtils();
    this.input = new SimpleInput();
    this.prompts = new LlmPrompts();

    this.modelsConfig = {
      gemini: {
        displayName: "🔮 Gemini 2.5 Flash (Google)",
        providerType: "gemini",
        folderName: "gemini",
        temperature: 0.1,
        maxTokens: 8000,
      },
      deepseek: {
        displayName: "🧠 DeepSeek R1 (DeepSeek)",
        providerType: "deepseek",
        folderName: "deepseek",
        temperature: 0.1,
        maxTokens: 4000,
        stream: false,
      },
      "openrouter-llama": {
        displayName: "🦙 Llama 3.1 70B Instruct (OpenRouter)",
        providerType: "openrouter",
        modelName: "meta-llama/llama-3.1-70b-instruct",
        folderName: "llama-3.1-70b",
        logName: "llama-3.1-70b",
        temperature: 0,
        maxTokens: 8000,
        stream: false,
        topP: 0.9,
        frequencyPenalty: 0.0,
        presencePenalty: 0.0,
      },
      "openrouter-phi4": {
        displayName: "🔬 Phi-4 Reasoning Plus (OpenRouter)",
        providerType: "openrouter",
        modelName: "microsoft/phi-4-reasoning-plus",
        folderName: "phi-4-reasoning-plus",
        logName: "phi-4-reasoning-plus",
        temperature: 0.1,
        maxTokens: 12000,
        stream: false,
        topP: 0.95,
        frequencyPenalty: 0.1,
        presencePenalty: 0.1,
        includeReasoning: false,
      },
    };

    this.removedFilesDir = path.join(
      process.cwd(),
      "parsedCodebase",
      "removed"
    );

    this.outputDir = path.join(process.cwd(), "generation_output");
    this.logsDir = path.join(process.cwd(), "logs");

    this.setupDirectories();

    this.lmStudioConfig = {
      host: "127.0.0.1",
      port: 1234,
      get url() {
        return `http://${this.host}:${this.port}`;
      },
      get modelsEndpoint() {
        return `${this.url}/v1/models`;
      },
      get completionsEndpoint() {
        return `${this.url}/v1/chat/completions`;
      },
    };
  }

  setupDirectories() {
    this.fileUtils.ensureDirectoryExists(this.outputDir);
    this.fileUtils.ensureDirectoryExists(this.logsDir);

    this.localOutputDir = path.join(this.outputDir, "local");
    this.fileUtils.ensureDirectoryExists(this.localOutputDir);

    Object.entries(this.modelsConfig).forEach(([modelKey, config]) => {
      if (config.providerType === "openrouter") {
        const outputDir = path.join(
          this.outputDir,
          "openrouter",
          config.folderName
        );
        const logsDir = path.join(
          this.logsDir,
          "openrouter",
          config.folderName
        );
        this.fileUtils.ensureDirectoryExists(
          path.join(this.outputDir, "openrouter")
        );
        this.fileUtils.ensureDirectoryExists(
          path.join(this.logsDir, "openrouter")
        );
        this.fileUtils.ensureDirectoryExists(outputDir);
        this.fileUtils.ensureDirectoryExists(logsDir);
      } else {
        const outputDir = path.join(this.outputDir, config.folderName);
        const logsDir = path.join(this.logsDir, config.folderName);
        this.fileUtils.ensureDirectoryExists(outputDir);
        this.fileUtils.ensureDirectoryExists(logsDir);
      }
    });

    this.lmStudioConfig = {
      host: "127.0.0.1",
      port: 1234,
      get url() {
        return `http://${this.host}:${this.port}`;
      },
      get modelsEndpoint() {
        return `${this.url}/v1/models`;
      },
      get completionsEndpoint() {
        return `${this.url}/v1/chat/completions`;
      },
    };

    this.geminiConfig = {
      apiKey: process.env.GEMINI_API_KEY,
      model: "gemini-2.5-flash",
    };

    this.deepSeekConfig = {
      apiKey: process.env.DEEPSEEK_API_KEY,
      endpoint: "https://api.deepseek.com/v1/chat/completions",
      model: "deepseek-reasoner",
    };

    this.openRouterConfig = {
      apiKey: process.env.OPENROUTER_API_KEY,
      endpoint: "https://openrouter.ai/api/v1/chat/completions",
      model: "meta-llama/llama-3.1-70b-instruct",
    };

    this.apiClient = new LlmApiClient({
      lmStudioConfig: this.lmStudioConfig,
      geminiConfig: this.geminiConfig,
      deepSeekConfig: this.deepSeekConfig,
      openRouterConfig: this.openRouterConfig,
    });
  }

  logApiCall(provider, prompt, response, metadata) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const sanitizedFileName = metadata.filename.replace(
        /[^a-zA-Z0-9.-]/g,
        "_"
      );
      const logFileName = `${provider}_${sanitizedFileName}_${timestamp}.log`;

      let logDirectory = this.logsDir;

      if (provider.startsWith("openrouter_")) {
        const modelName = provider.replace("openrouter_", "");
        logDirectory = path.join(this.logsDir, "openrouter", modelName);
      } else {
        const modelConfig = Object.values(this.modelsConfig).find(
          (config) => config.providerType === provider
        );
        if (modelConfig) {
          logDirectory = path.join(this.logsDir, modelConfig.folderName);
        }
      }

      const logPath = path.join(logDirectory, logFileName);

      const logContent = `
=== API CALL LOG ===
Provider: ${provider}
File: ${metadata.filename}
Path: ${metadata.path}
Timestamp: ${new Date().toISOString()}

=== PROMPT SENT ===
${prompt}

=== RESPONSE RECEIVED ===
${response}

=== END LOG ===
`;

      fs.writeFileSync(logPath, logContent, "utf8");
      console.log(colorize("gray", `📝 API call logged to: ${logFileName}`));
    } catch (error) {
      console.log(
        colorize("yellow", `⚠️ Failed to log API call: ${error.message}`)
      );
    }
  }

  startLoadingSpinner(message = "Processing") {
    const spinnerChars = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
    let spinnerIndex = 0;
    const startTime = Date.now();
    let stopped = false;

    const interval = setInterval(() => {
      if (stopped) return;

      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const spinner = spinnerChars[spinnerIndex % spinnerChars.length];

      process.stdout.write(
        `\r${colorize("cyan", spinner)} ${message}... ${colorize("gray", `(${elapsed}s)`)}`
      );
      spinnerIndex++;
    }, 100);

    return {
      stop: () => {
        stopped = true;
        clearInterval(interval);
        const totalTime = Math.floor((Date.now() - startTime) / 1000);
        process.stdout.write(
          `\r${colorize("green", "✓")} ${message} completed in ${colorize("cyan", totalTime + "s")}\n`
        );
      },
    };
  }

  async showApiServiceMenu() {
    let inMenu = true;

    while (inMenu) {
      try {
        const choice = await this.input.showMenu("File Regeneration Service", [
          "🏠 Local LLM (LM Studio)",
          "☁️  Online LLM (Gemini & DeepSeek)",
          colorize("red", "🔙 Back to main menu"),
        ]);

        switch (choice) {
          case 0:
            await this.runLocalLlmWorkflow();
            break;
          case 1:
            await this.runOnlineLlmWorkflow();
            break;
          case 2:
            inMenu = false;
            break;
        }
      } catch (error) {
        console.log(
          colorize("red", `❌ Error in API Service Menu: ${error.message}`)
        );
        await this.input.ask(
          colorize("yellow", "⏎ Press Enter to continue...")
        );
      }
    }
  }

  async runOnlineLlmWorkflow() {
    console.log(colorize("cyan", "\n☁️ Online LLM File Regeneration"));
    console.log(
      colorize("gray", "────────────────────────────────────────────────────")
    );

    try {
      if (
        !this.geminiConfig.apiKey ||
        !this.deepSeekConfig.apiKey ||
        !this.openRouterConfig.apiKey
      ) {
        console.log(colorize("red", "\n❌ Missing API keys"));
        console.log(
          colorize("yellow", "💡 Please configure your API keys in .env file:")
        );
        console.log(colorize("gray", "   GEMINI_API_KEY=your_gemini_key"));
        console.log(colorize("gray", "   DEEPSEEK_API_KEY=your_deepseek_key"));
        console.log(
          colorize("gray", "   OPENROUTER_API_KEY=your_openrouter_key")
        );
        await this.input.ask(
          colorize("yellow", "⏎ Press Enter to continue...")
        );
        return;
      }

      const provider = await this.selectOnlineLlmProvider();
      if (!provider) {
        return;
      }

      const selectedFile = await this.selectRemovedFile();
      if (!selectedFile) {
        return;
      }

      const { metadata, content } = this.extractFileContent(
        selectedFile.filePath
      );
      if (!metadata || !content) {
        console.log(
          colorize("red", "❌ Failed to extract file content or metadata")
        );
        return;
      }

      await this.processWithOnlineLlm({
        file: selectedFile,
        metadata,
        content,
        provider,
      });
    } catch (error) {
      console.log(
        colorize("red", `❌ Error in online workflow: ${error.message}`)
      );
      await this.input.ask(colorize("yellow", "⏎ Press Enter to continue..."));
    }
  }

  async runLocalLlmWorkflow() {
    console.log(colorize("cyan", "\n🏠 Local LLM File Regeneration"));
    console.log(
      colorize("gray", "────────────────────────────────────────────────────")
    );

    try {
      console.log(colorize("cyan", "🔍 Checking LM Studio server status..."));
      const isServerRunning = await this.apiClient.checkLMStudioServerStatus();
      if (!isServerRunning) {
        console.log(colorize("red", "\n❌ LM Studio server is not running"));
        console.log(
          colorize("yellow", "💡 Please start LM Studio server first:")
        );
        console.log(colorize("gray", "   1. Open LM Studio application"));
        console.log(
          colorize("gray", "   2. Start the local server on port 1234")
        );
        await this.input.ask(
          colorize("yellow", "⏎ Press Enter to continue...")
        );
        return;
      }
      console.log(colorize("green", "✅ LM Studio server is running"));

      const selectedFile = await this.selectRemovedFile();
      if (!selectedFile) {
        return;
      }

      const { metadata, content } = this.extractFileContent(
        selectedFile.filePath
      );
      if (!metadata || !content) {
        console.log(
          colorize("red", "❌ Failed to extract file content or metadata")
        );
        return;
      }

      console.log(colorize("cyan", "\n🤖 Getting current running model..."));
      const currentModel = await this.apiClient.getCurrentModel();
      console.log(colorize("green", `✅ Using model: ${currentModel}`));

      await this.processWithLlm({
        file: selectedFile,
        metadata,
        content,
        model: currentModel,
      });
    } catch (error) {
      console.log(colorize("red", `❌ Error in workflow: ${error.message}`));
      await this.input.ask(colorize("yellow", "⏎ Press Enter to continue..."));
    }
  }

  async selectOnlineLlmProvider() {
    console.log(colorize("cyan", "\n🤖 Select Online LLM Provider:"));

    const providerOptions = Object.entries(this.modelsConfig).map(
      ([key, config]) => config.displayName
    );
    providerOptions.push("Cancel");

    const choice = await this.input.showMenu(
      "LLM Provider Selection",
      providerOptions
    );

    const modelKeys = Object.keys(this.modelsConfig);
    if (choice < modelKeys.length) {
      return modelKeys[choice];
    }
    return null;
  }

  async processWithLlm(config) {
    const { file, metadata, content, model } = config;

    console.log(colorize("cyan", "\n🚀 Starting File Regeneration..."));
    console.log(colorize("gray", `   File: ${metadata.path}`));
    console.log(colorize("gray", `   Model: ${model}`));
    console.log(
      colorize("gray", "────────────────────────────────────────────────────")
    );

    try {
      const formattedPrompt = this.prompts.formatPrompt({
        filename: metadata.filename,
        path: metadata.path,
        codebase: content,
      });

      const spinner = this.startLoadingSpinner("Calling LM Studio API");
      const result = await this.apiClient.callLMStudioApi(
        formattedPrompt,
        model
      );
      spinner.stop();

      this.logApiCall("local", formattedPrompt, result, metadata);

      const outputFileName = await this.saveResult({
        originalFile: metadata,
        result: result,
        model: model,
        provider: "local",
        timestamp: new Date().toISOString(),
      });

      console.log(
        colorize("green", "\n✅ File regeneration completed successfully!")
      );
      console.log(colorize("cyan", `📄 Result saved to: ${outputFileName}`));
    } catch (error) {
      console.log(
        colorize("red", `\n❌ File regeneration failed: ${error.message}`)
      );
    }

    await this.input.ask(colorize("yellow", "\n⏎ Press Enter to continue..."));
  }

  async processWithOnlineLlm(config) {
    const { file, metadata, content, provider } = config;

    const modelConfig = this.modelsConfig[provider];
    if (!modelConfig) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const providerName = modelConfig.displayName;
    const modelName =
      modelConfig.modelName ||
      (modelConfig.providerType === "gemini"
        ? this.geminiConfig.model
        : modelConfig.providerType === "deepseek"
          ? this.deepSeekConfig.model
          : this.openRouterConfig.model);

    console.log(colorize("cyan", "\n🚀 Starting Online File Regeneration..."));
    console.log(colorize("gray", `   File: ${metadata.path}`));
    console.log(colorize("gray", `   Provider: ${providerName}`));
    console.log(colorize("gray", `   Model: ${modelName}`));
    console.log(
      colorize("gray", "────────────────────────────────────────────────────")
    );

    try {
      const formattedPrompt = this.prompts.formatPrompt({
        filename: metadata.filename,
        path: metadata.path,
        codebase: content,
      });

      let result;
      let spinner;
      const providerType = modelConfig.providerType;

      if (providerType === "gemini") {
        spinner = this.startLoadingSpinner("Calling Gemini API");
        result = await this.apiClient.callGeminiApi(
          formattedPrompt,
          modelConfig
        );
      } else if (providerType === "deepseek") {
        spinner = this.startLoadingSpinner("Calling DeepSeek API");
        result = await this.apiClient.callDeepSeekApi(
          formattedPrompt,
          modelConfig
        );
      } else if (providerType === "openrouter") {
        const originalModel = this.openRouterConfig.model;
        this.openRouterConfig.model = modelName;

        spinner = this.startLoadingSpinner("Calling OpenRouter API");
        result = await this.apiClient.callOpenRouterApi(
          formattedPrompt,
          modelConfig
        );

        this.openRouterConfig.model = originalModel;
      }
      spinner.stop();

      const logProvider =
        providerType === "openrouter"
          ? `openrouter_${modelConfig.logName}`
          : providerType;

      this.logApiCall(logProvider, formattedPrompt, result, metadata);

      const outputFileName = await this.saveResult({
        originalFile: metadata,
        result: result,
        model: modelName,
        provider: provider,
        timestamp: new Date().toISOString(),
      });

      console.log(
        colorize("green", "\n✅ File regeneration completed successfully!")
      );
      console.log(colorize("cyan", `📄 Result saved to: ${outputFileName}`));
    } catch (error) {
      console.log(
        colorize("red", `\n❌ File regeneration failed: ${error.message}`)
      );
    }

    await this.input.ask(colorize("yellow", "\n⏎ Press Enter to continue..."));
  }

  async selectRemovedFile() {
    const files = this.fileUtils.readDirectory(this.removedFilesDir);

    if (files.length === 0) {
      console.log(colorize("yellow", "\n📭 No removed files found"));
      await this.input.ask(colorize("yellow", "⏎ Press Enter to continue..."));
      return null;
    }

    console.log(colorize("cyan", "\n📁 Select a file to regenerate:"));

    const fileOptions = files.map((fileName) => {
      const filePath = path.join(this.removedFilesDir, fileName);
      const metadata = this.extractMetadata(filePath);
      const originalName = metadata ? metadata.filename : fileName;
      return `${originalName} (${metadata ? metadata.path : "No path"})`;
    });

    fileOptions.push("Cancel");

    const choice = await this.input.showMenu("File Selection", fileOptions);

    if (choice === fileOptions.length - 1) {
      return null;
    }

    const selectedFileName = files[choice];
    const selectedFilePath = path.join(this.removedFilesDir, selectedFileName);

    return {
      fileName: selectedFileName,
      filePath: selectedFilePath,
    };
  }

  extractMetadata(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");

      const metadataMatch = content.match(
        /\/\*\s*METADATA_START\s*([\s\S]*?)\s*METADATA_END\s*\*\//
      );

      if (metadataMatch) {
        const metadataJson = metadataMatch[1].trim();
        const metadata = JSON.parse(metadataJson);
        return metadata.removedFile;
      }

      return null;
    } catch (error) {
      console.log(
        colorize(
          "red",
          `❌ Error extracting metadata from ${filePath}: ${error.message}`
        )
      );
      return null;
    }
  }

  extractFileContent(filePath) {
    try {
      const fullContent = fs.readFileSync(filePath, "utf8");

      const metadata = this.extractMetadata(filePath);

      const metadataEndMatch = fullContent.match(
        /\/\*\s*METADATA_START[\s\S]*?METADATA_END\s*\*\//
      );
      let content = fullContent;

      if (metadataEndMatch) {
        content = fullContent
          .substring(metadataEndMatch.index + metadataEndMatch[0].length)
          .trim();
      }

      return { metadata, content };
    } catch (error) {
      console.log(
        colorize("red", `❌ Error extracting file content: ${error.message}`)
      );
      return { metadata: null, content: null };
    }
  }

  async saveResult(resultData) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const sanitizedFileName = resultData.originalFile.filename.replace(
      /[^a-zA-Z0-9.-]/g,
      "_"
    );
    const outputFileName = `${sanitizedFileName}`;

    let outputPath;
    const modelConfig = this.modelsConfig[resultData.provider];

    if (modelConfig) {
      if (modelConfig.providerType === "openrouter") {
        outputPath = path.join(
          this.outputDir,
          "openrouter",
          modelConfig.folderName,
          outputFileName
        );
      } else {
        outputPath = path.join(
          this.outputDir,
          modelConfig.folderName,
          outputFileName
        );
      }
    } else {
      outputPath = path.join(this.localOutputDir, outputFileName);
    }

    let contentToSave = resultData.result;

    if (
      typeof resultData.result === "object" &&
      resultData.result.hasReasoning
    ) {
      const reasoningFileName = `${sanitizedFileName.replace(/\.(js|jsx|ts|tsx)$/, "")}_reasoning.md`;
      const reasoningPath = outputPath.replace(
        sanitizedFileName,
        reasoningFileName
      );

      const reasoningContent = `# Reasoning Process for ${resultData.originalFile.filename}

## Model: ${resultData.model}
## Timestamp: ${resultData.timestamp}

---

${resultData.result.reasoning}

---

**Final Code Output:**
\`\`\`${resultData.originalFile.filename.split(".").pop()}
${resultData.result.answer}
\`\`\`
`;

      this.fileUtils.writeFile(reasoningPath, reasoningContent);
      console.log(
        colorize("cyan", `🧠 Reasoning saved to: ${reasoningFileName}`)
      );

      contentToSave = resultData.result.answer;
    }

    const success = this.fileUtils.writeFile(outputPath, contentToSave);
    if (!success) {
      throw new Error("Failed to save regenerated file");
    }

    return outputPath;
  }

  closeInput() {
    this.input.close();
  }
}

module.exports = RemovedFileApiService;
