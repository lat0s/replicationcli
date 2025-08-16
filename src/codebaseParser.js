const path = require("path");

// Import utilities for colorizing terminal output and file system operations.
const { colorize } = require("./simpleInput");
const FileSystemUtils = require("./fileSystemUtils");

class CodebaseParser {
  constructor() {
    this.fileUtils = new FileSystemUtils();

    this.paths = {
      codebase: path.join(__dirname, "..", "codebase"), // Source code directory
      parsedOriginal: path.join(__dirname, "..", "parsedCodebase", "original"), // Original parsed files
      parsedRemoved: path.join(__dirname, "..", "parsedCodebase", "removed"), // Modified parsed files
    };

    this.markers = {
      fileStart: "<<<FILE_START>>>",
      fileEnd: "<<<FILE_END>>>",
    };

    this.config = {
      warningSize: 200 * 1024,
      maxDisplayLevel: 3,
    };
  }

  showCodebaseStructure() {
    console.log(colorize("cyan", "\n🔍 Analyzing codebase structure..."));
    this.fileUtils.showDirectoryTree(
      this.paths.codebase,
      this.config.maxDisplayLevel
    );
  }

  async parseCodebase() {
    if (!this.fileUtils.fileExists(this.paths.codebase)) {
      throw new Error(
        "🚫 No codebase folder found. Please set up a codebase directory first."
      );
    }

    console.log(colorize("cyan", "\n🚀 Starting codebase parsing process..."));
    this.showCodebaseStructure();

    const parseResult = this._parseAllFiles();
    this._saveAndReportResults(parseResult);

    return parseResult.filesIncluded;
  }

  getParsedFiles() {
    console.log(colorize("cyan", "\n📋 Retrieving parsed file list..."));

    const files = ["codebase_parsed_modified.txt", "codebase_parsed.txt"];

    for (const fileName of files) {
      const filePath = path.join(this.paths.parsedOriginal, fileName);
      if (this.fileUtils.fileExists(filePath)) {
        console.log(colorize("gray", `  📌 Using: ${fileName}`));
        return this._extractFileListFromParsed(filePath);
      }
    }

    console.log(colorize("red", "❌ No parsed files found"));
    return null;
  }

  removeFileFromParsed(fileIndex, files) {
    if (fileIndex < 0 || fileIndex >= files.length) {
      console.log(colorize("red", "❌ Invalid file index provided"));
      return false;
    }

    const targetFile = files[fileIndex];
    console.log(colorize("cyan", `\n🗑️  Removing file: ${targetFile}`));

    try {
      const originalFile = path.join(
        this.paths.parsedOriginal,
        "codebase_parsed.txt"
      );
      const originalContent =
        this.fileUtils.readFileContents(originalFile).content;

      const modifiedContent = this._removeFileBlock(
        originalContent,
        targetFile
      );
      const success = this._saveModifiedCodebase(modifiedContent, targetFile);

      if (success) {
        console.log(
          colorize("green", "✅ File successfully removed from parsed codebase")
        );
      }

      return success;
    } catch (error) {
      console.log(colorize("red", `❌ Error removing file: ${error.message}`));
      return false;
    }
  }

  _parseAllFiles() {
    const result = {
      content: "",
      included: 0,
      skipped: [],
      totalSize: 0,
      filesIncluded: [],
    };
    const promptParts = [];

    this.fileUtils.walkDirectory(
      this.paths.codebase,
      (itemPath, relativePath, isDirectory) => {
        if (isDirectory)
          return !this.fileUtils.shouldSkipDirectory(path.basename(itemPath));

        this._processFile(itemPath, relativePath, promptParts, result);
        return true;
      }
    );

    result.content = promptParts.join("");
    result.filesIncluded.sort();
    return result;
  }

  _saveAndReportResults(parseResult) {
    this.fileUtils.ensureDirectoryExists(this.paths.parsedOriginal);

    const outputFile = path.join(
      this.paths.parsedOriginal,
      "codebase_parsed.txt"
    );
    const writeSuccess = this.fileUtils.writeFile(
      outputFile,
      parseResult.content
    );

    if (!writeSuccess)
      throw new Error("Failed to write parsed content to file");

    this._displayParsingResults(parseResult, outputFile);
  }

  _removeFileBlock(content, targetFile) {
    const pattern = this._createFileBlockPattern(targetFile);
    const regex = new RegExp(pattern, "s");

    if (!content.match(regex)) {
      throw new Error(`File block not found for: ${targetFile}`);
    }

    return content.replace(regex, "");
  }

  _processFile(itemPath, relativePath, promptParts, result) {
    const fileName = path.basename(itemPath);
    const skipInfo = this.fileUtils.shouldSkipFile(fileName);

    if (skipInfo.skip) {
      result.skipped.push({ path: relativePath, reason: skipInfo.reason });
      return;
    }

    const fileResult = this.fileUtils.readFileContents(itemPath);
    const fileBlock = this._createFileBlock(relativePath, fileResult.content);

    promptParts.push(fileBlock);
    result.filesIncluded.push(relativePath);
    result.included++;
    result.totalSize += fileResult.size;

    if (!fileResult.success) {
      result.skipped.push({
        path: relativePath,
        reason: `unreadable (${fileResult.error})`,
      });
    }
  }

  _createFileBlock(relativePath, content) {
    return `\n${this.markers.fileStart}\nFILE: ${relativePath}\n${content}\n${this.markers.fileEnd}\n`;
  }

  _displayParsingResults(parseResult, outputFile) {
    console.log(colorize("green", "\n📊 Parsing Complete - Summary Report"));
    console.log(
      colorize("gray", "════════════════════════════════════════════════════")
    );
    console.log(
      colorize("green", `✅ Files included: ${parseResult.included}`)
    );
    console.log(
      colorize("yellow", `⏭️  Files skipped: ${parseResult.skipped.length}`)
    );
    console.log(
      colorize(
        "blue",
        `📦 Total size: ${this.fileUtils.formatFileSize(parseResult.totalSize)}`
      )
    );

    if (parseResult.totalSize > this.config.warningSize) {
      console.log(
        colorize(
          "red",
          `⚠️  Warning: Large output may exceed AI model context windows`
        )
      );
    }

    console.log(colorize("cyan", `💾 Saved to: ${outputFile}`));
    console.log(
      colorize("gray", "════════════════════════════════════════════════════")
    );
  }

  _extractFileListFromParsed(filePath) {
    const fileResult = this.fileUtils.readFileContents(filePath);
    if (!fileResult.success) return null;

    const files = [];
    const fileRegex = new RegExp(
      `${this.markers.fileStart}\\nFILE: (.+?)\\n`,
      "g"
    );
    let match;

    while ((match = fileRegex.exec(fileResult.content)) !== null) {
      files.push(match[1]);
    }

    console.log(
      colorize("green", `✅ Found ${files.length} files in parsed content`)
    );
    return files;
  }

  _createFileBlockPattern(targetFile) {
    const escapedFile = targetFile.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return `${this.markers.fileStart}\\nFILE: ${escapedFile}\\n.*?\\n${this.markers.fileEnd}`;
  }

  _saveModifiedCodebase(modifiedContent, targetFile) {
    this.fileUtils.ensureDirectoryExists(this.paths.parsedRemoved);

    const metadata = {
      removedFile: {
        filename: path.basename(targetFile),
        path: targetFile,
      },
    };

    const jsonHeader = `/* METADATA_START\n${JSON.stringify(metadata, null, 2)}\nMETADATA_END */\n\n`;

    const finalContent = jsonHeader + modifiedContent;

    const componentName = path.basename(targetFile, path.extname(targetFile));
    const fileName = `${componentName}_modified_codebase.txt`;
    const filePath = path.join(this.paths.parsedRemoved, fileName);

    const success = this.fileUtils.writeFile(filePath, finalContent);
    if (!success) {
      console.log(
        colorize("red", `❌ Failed to save modified codebase to ${filePath}`)
      );
      return false;
    }
    return success;
  }
}

module.exports = CodebaseParser;
