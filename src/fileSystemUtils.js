const fs = require("fs");
const path = require("path");

const { colorize } = require("./simpleInput");

class FileSystemUtils {
  constructor() {
    this.skipDirs = new Set([
      "node_modules",
      ".git",
      ".next",
      "dist",
      "build",
      "venv",
      "__pycache__",
      "coverage",
      ".vscode",
      ".idea",
    ]);

    this.skipFiles = new Set([
      "package-lock.json",
      "yarn.lock",
      ".DS_Store",
      ".env",
      ".env.local",
      ".env.example",
    ]);

    this.skipExtensions = new Set([
      ".png",
      ".jpg",
      ".jpeg",
      ".gif",
      ".svg",
      ".webp",
      ".ico",
      ".pdf",
      ".zip",
      ".tar",
      ".gz",
      ".mp4",
      ".mp3",
      ".woff",
      ".woff2",
      ".ttf",
      ".eot",
      ".exe",
      ".bin",
    ]);

    this.includeExtensions = new Set([
      ".js",
      ".jsx",
      ".ts",
      ".tsx",
      ".json",
      ".css",
      ".scss",
      ".html",
      ".py",
    ]);
  }

  shouldSkipDirectory(dirName) {
    return this.skipDirs.has(dirName);
  }

  shouldSkipFile(fileName) {
    const ext = path.extname(fileName).toLowerCase();

    if (fileName.startsWith(".") || this.skipFiles.has(fileName)) {
      return { skip: true, reason: "file/extension skip" };
    }

    if (this.skipExtensions.has(ext)) {
      return { skip: true, reason: "file/extension skip" };
    }

    if (this.includeExtensions.size > 0 && !this.includeExtensions.has(ext)) {
      return { skip: true, reason: "not in INCLUDE_EXTENSIONS" };
    }

    return { skip: false, reason: null };
  }

  readFileContents(filePath) {
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const stats = fs.statSync(filePath);

      return {
        success: true,
        content: content,
        size: stats.size,
        error: null,
      };
    } catch (error) {
      return {
        success: false,
        content: `[UNREADABLE FILE: ${error.message}]`,
        size: 0,
        error: error.message,
      };
    }
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  }

  showDirectoryTree(dirPath, maxLevel = 3) {
    console.log(colorize("cyan", "\n📁 Directory Structure:"));
    console.log(colorize("gray", `   Showing first ${maxLevel} levels`));
    console.log(
      colorize("gray", "────────────────────────────────────────────────────")
    );

    this._walkDirectoryTree(dirPath, 0, maxLevel);

    console.log(
      colorize("gray", "────────────────────────────────────────────────────")
    );
  }

  _walkDirectoryTree(dirPath, level, maxLevel) {
    if (level > maxLevel) return;

    try {
      const items = fs.readdirSync(dirPath);
      const indent = "  ".repeat(level);

      const directories = [];
      const files = [];

      items.forEach((item) => {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);

        if (stats.isDirectory()) {
          directories.push(item);
        } else {
          files.push(item);
        }
      });

      directories.forEach((dir) => {
        if (!this.shouldSkipDirectory(dir)) {
          console.log(colorize("yellow", `${indent}📂 ${dir}/`));
          if (level < maxLevel) {
            this._walkDirectoryTree(
              path.join(dirPath, dir),
              level + 1,
              maxLevel
            );
          }
        }
      });

      if (level < maxLevel) {
        files.forEach((file) => {
          const skipInfo = this.shouldSkipFile(file);
          if (!skipInfo.skip) {
            console.log(colorize("gray", `${indent}  📄 ${file}`));
          }
        });
      }
    } catch (error) {
      console.log(
        colorize(
          "red",
          `❌ Error reading directory ${dirPath}: ${error.message}`
        )
      );
    }
  }

  ensureDirectoryExists(dirPath) {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
      console.log(colorize("cyan", `📁 Created directory: ${dirPath}`));
    }
  }

  writeFile(filePath, content) {
    try {
      fs.writeFileSync(filePath, content, "utf8");
      return true;
    } catch (error) {
      console.log(
        colorize("red", `❌ Error writing file ${filePath}: ${error.message}`)
      );
      return false;
    }
  }

  fileExists(filePath) {
    return fs.existsSync(filePath);
  }

  getFileSize(filePath) {
    try {
      const stats = fs.statSync(filePath);
      return stats.size;
    } catch (error) {
      return 0;
    }
  }

  walkDirectory(rootPath, callback) {
    const walk = (currentPath) => {
      try {
        const items = this.readDirectory(currentPath);

        items.forEach((item) => {
          const itemPath = path.join(currentPath, item);
          const stats = this.getStats(itemPath);
          const relativePath = path.relative(rootPath, itemPath);

          if (stats.isDirectory()) {
            const shouldContinue = callback(itemPath, relativePath, true);
            if (shouldContinue) walk(itemPath);
          } else if (stats.isFile()) {
            callback(itemPath, relativePath, false);
          }
        });
      } catch (error) {
        console.log(
          colorize(
            "red",
            `❌ Error walking directory ${currentPath}: ${error.message}`
          )
        );
      }
    };

    walk(rootPath);
  }

  readDirectory(dirPath) {
    try {
      return fs.readdirSync(dirPath);
    } catch (error) {
      console.log(
        colorize(
          "red",
          `❌ Error reading directory ${dirPath}: ${error.message}`
        )
      );
      return [];
    }
  }

  getStats(itemPath) {
    return fs.statSync(itemPath);
  }
}

module.exports = FileSystemUtils;
