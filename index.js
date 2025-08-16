#!/usr/bin/env node

const CodebaseProcessor = require("./src/codebaseProcessor");
const ParserMenu = require("./src/parserMenu");
const RemovedFileApiService = require("./src/removedFileApiService");
const { SimpleInput, colorize } = require("./src/simpleInput");

class ReplicationCLI {
  constructor() {
    this.codebaseProcessor = new CodebaseProcessor();
    this.parserMenu = new ParserMenu();
    this.removedFileService = new RemovedFileApiService();
    this.input = new SimpleInput();
    this.running = true;
  }

  async start() {
    console.log(colorize("cyan", "\n🚀 Welcome to Replication CLI"));

    while (this.running) {
      await this.showMainMenu();
    }

    this.cleanup();
    process.exit(0); // Ensure process terminates after cleanup
  }

  async showMainMenu() {
    try {
      const choice = await this.input.showMenu("Main Menu", [
        "Codebase Management",
        "Parser",
        "File Regeneration Service",
        colorize("red", "Exit"),
      ]);

      switch (choice) {
        case 0:
          await this.codebaseProcessor.showCodebaseMenu();
          break;
        case 1:
          await this.parserMenu.showParserMenu();
          break;
        case 2:
          await this.removedFileService.showApiServiceMenu();
          break;
        case 3:
          console.log(
            colorize("green", "\n👋 Thank you for using Replication CLI!")
          );
          this.running = false;
          break;
      }
    } catch (error) {
      console.log(colorize("red", `❌ Error: ${error.message}`));
      this.running = false;
    }
  }

  cleanup() {
    this.input.close();
    this.codebaseProcessor.closeInput();
    this.parserMenu.closeInput();
    this.removedFileService.closeInput();
  }
}

// Run the CLI
const cli = new ReplicationCLI();
cli.start().catch((error) => {
  console.log(colorize("red", `❌ Fatal error: ${error.message}`));
  process.exit(1);
});
