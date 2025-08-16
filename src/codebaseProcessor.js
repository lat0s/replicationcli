const { SimpleInput, colorize } = require("./simpleInput");
const path = require("path");
const fs = require("fs");

class CodebaseProcessor {
  constructor() {
    this.sourcePath = null;
    this.targetPath = path.join(__dirname, "..", "codebase");
    this.input = new SimpleInput();
  }

  async getCodebasePath() {
    try {
      const codebasePath = await this.input.askWithValidation(
        "Enter the path to your codebase root directory: ",
        (input) => {
          if (!input.trim()) {
            return "Please enter a valid path";
          }

          const resolvedPath = path.resolve(input.trim());

          if (!fs.existsSync(resolvedPath)) {
            return "Path does not exist. Please enter a valid directory path.";
          }

          const stats = fs.statSync(resolvedPath);
          if (!stats.isDirectory()) {
            return "Path must be a directory, not a file.";
          }

          return true;
        }
      );

      this.sourcePath = path.resolve(codebasePath);

      console.log(
        colorize("green", `\n✅ Codebase path set to: ${this.sourcePath}`)
      );

      await this.displayDirectoryInfo();

      await this.copyCodebase();
    } catch (error) {
      console.log(colorize("red", `❌ Error: ${error.message}`));
      throw error;
    }
  }

  async displayDirectoryInfo() {
    try {
      const files = fs.readdirSync(this.sourcePath);
      const fileCount = files.length;

      console.log(
        colorize("blue", `\n📁 Directory contains ${fileCount} items`)
      );

      const previewFiles = files.slice(0, 5);
      console.log(colorize("gray", "Preview:"));
      previewFiles.forEach((file) => {
        const filePath = path.join(this.sourcePath, file);
        const stats = fs.statSync(filePath);
        const icon = stats.isDirectory() ? "📁" : "📄";
        console.log(colorize("gray", `  ${icon} ${file}`));
      });

      if (fileCount > 5) {
        console.log(colorize("gray", `  ... and ${fileCount - 5} more items`));
      }
    } catch (error) {
      console.log(
        colorize("red", `❌ Error reading directory: ${error.message}`)
      );
      throw error;
    }
  }

  async copyCodebase() {
    try {
      console.log(colorize("yellow", "\n📋 Copying codebase..."));

      await this.clearCodebase();

      if (!fs.existsSync(this.targetPath)) {
        fs.mkdirSync(this.targetPath, { recursive: true });
      }

      await this.copyRecursive(this.sourcePath, this.targetPath);

      console.log(colorize("green", "✅ Codebase copied successfully!"));
    } catch (error) {
      console.log(
        colorize("red", `❌ Error copying codebase: ${error.message}`)
      );
      throw error;
    }
  }

  async copyRecursive(src, dest) {
    const stats = fs.statSync(src);

    if (stats.isDirectory()) {
      const skipDirs = [
        "node_modules",
        ".git",
        "dist",
        "build",
        ".next",
        "coverage",
      ];
      const dirName = path.basename(src);

      if (skipDirs.includes(dirName)) {
        return;
      }

      if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
      }

      const items = fs.readdirSync(src);

      for (const item of items) {
        const srcPath = path.join(src, item);
        const destPath = path.join(dest, item);
        await this.copyRecursive(srcPath, destPath);
      }
    } else {
      const skipExtensions = [".log", ".tmp", ".cache"];
      const ext = path.extname(src);

      if (!skipExtensions.includes(ext)) {
        fs.copyFileSync(src, dest);
      }
    }
  }

  async clearCodebase() {
    try {
      if (fs.existsSync(this.targetPath)) {
        console.log(colorize("yellow", "🧹 Clearing existing codebase..."));
        fs.rmSync(this.targetPath, { recursive: true, force: true });
      }
    } catch (error) {
      console.log(
        colorize("red", `❌ Error clearing codebase: ${error.message}`)
      );
      throw error;
    }
  }

  async showClearCodebaseMenu() {
    try {
      const choice = await this.input.showMenu("Clear Codebase", [
        "Yes, clear the local codebase copy",
        "No, cancel",
      ]);

      if (choice === 0) {
        await this.clearCodebase();
        console.log(colorize("green", "✅ Codebase cleared successfully!"));
      } else {
        console.log(colorize("gray", "Clear operation cancelled."));
      }
    } catch (error) {
      console.log(colorize("red", `❌ Error: ${error.message}`));
      throw error;
    }
  }

  async showCodebaseMenu() {
    try {
      const choice = await this.input.showMenu("Codebase Management", [
        "Set new codebase path",
        "Clear current codebase",
        colorize("red", "Back to main menu"),
      ]);

      switch (choice) {
        case 0:
          await this.getCodebasePath();
          break;
        case 1:
          await this.showClearCodebaseMenu();
          break;
        case 2:
          return;
      }
    } catch (error) {
      console.log(colorize("red", `❌ Error: ${error.message}`));
      throw error;
    }
  }

  closeInput() {
    this.input.close();
  }
}

module.exports = CodebaseProcessor;
