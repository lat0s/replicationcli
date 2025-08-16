const CodebaseParser = require("./codebaseParser");
const { SimpleInput, colorize } = require("./simpleInput");

class ParserMenu {
  constructor() {
    this.parser = new CodebaseParser();
    this.input = new SimpleInput();
  }

  async showParserMenu() {
    try {
      const choice = await this.input.showMenu("Parser Menu", [
        "Parse codebase",
        "Proceed with parsed codebase",
        colorize("red", "Back to main menu"),
      ]);

      switch (choice) {
        case 0:
          await this.parseCodebase();
          break;
        case 1:
          await this.proceedWithParsed();
          break;
        case 2:
          return;
      }
    } catch (error) {
      console.log(colorize("red", `❌ Error: ${error.message}`));
    }
  }

  async parseCodebase() {
    try {
      await this.parser.parseCodebase();
      console.log(colorize("yellow", "\nPress Enter to continue..."));
      await this.input.ask("");
    } catch (error) {
      console.log(colorize("red", `❌ Error: ${error.message}`));
      console.log(colorize("yellow", "\nPress Enter to continue..."));
      await this.input.ask("");
    }
  }

  async proceedWithParsed() {
    const files = this.parser.getParsedFiles();

    if (!files) {
      console.log(
        colorize(
          "red",
          "❌ No parsed codebase found. Please parse a codebase first."
        )
      );
      console.log(colorize("yellow", "\nPress Enter to continue..."));
      await this.input.ask("");
      return;
    }

    const choice = await this.input.showMenu("Parsed Codebase Actions", [
      "Cut file from the codebase",
      colorize("red", "Return"),
    ]);

    if (choice === 0) {
      await this.showFileList(files);
    }
  }

  async showFileList(files) {
    console.log(colorize("cyan", "\n📄 Files in parsed codebase:"));
    console.log(colorize("gray", "-".repeat(50)));

    files.forEach((file, index) => {
      console.log(colorize("yellow", `${index + 1}. ${file}`));
    });

    console.log(colorize("gray", "-".repeat(50)));
    console.log(
      colorize("cyan", 'Enter file number to remove, or type "back" to return')
    );

    const input = await this.input.ask(colorize("cyan", "\nYour choice: "));

    if (input.toLowerCase() === "back") {
      return;
    }

    const fileIndex = parseInt(input) - 1;

    if (Number.isNaN(fileIndex) || fileIndex < 0 || fileIndex >= files.length) {
      console.log(colorize("red", "❌ Invalid file number"));
      console.log(colorize("yellow", "\nPress Enter to continue..."));
      await this.input.ask("");
      return;
    }

    const success = this.parser.removeFileFromParsed(fileIndex, files);

    if (success) {
      console.log(colorize("yellow", "\nPress Enter to continue..."));
      await this.input.ask("");

      const updatedFiles = this.parser.getParsedFiles();
      if (updatedFiles && updatedFiles.length > 0) {
        await this.showFileList(updatedFiles);
      } else {
        console.log(colorize("gray", "No more files in parsed codebase."));
      }
    }
  }

  closeInput() {
    this.input.close();
  }
}

module.exports = ParserMenu;
