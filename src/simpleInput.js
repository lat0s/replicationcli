const colors = {
  reset: "\x1b[0m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  gray: "\x1b[90m",
  white: "\x1b[37m",
  magenta: "\x1b[35m",
  blue: "\x1b[34m",
};

const colorize = (color, text) => `${colors[color]}${text}${colors.reset}`;

class SimpleInput {
  constructor() {
    process.stdin.setEncoding("utf8");
  }

  async ask(question) {
    process.stdout.write(question);

    return new Promise((resolve) => {
      const onData = (data) => {
        process.stdin.removeListener("data", onData);
        resolve(data.toString().trim());
      };
      process.stdin.once("data", onData);
    });
  }

  async askWithValidation(question, validator) {
    while (true) {
      const answer = await this.ask(question);
      const validation = validator(answer);

      if (validation === true) {
        return answer;
      } else {
        console.log(colorize("red", validation));
      }
    }
  }

  async showMenu(title, options) {
    console.log(colorize("cyan", `\n${title}`));
    console.log(colorize("gray", "─".repeat(title.length)));

    options.forEach((option, index) => {
      console.log(colorize("yellow", `${index + 1}. ${option}`));
    });

    const choice = await this.askWithValidation(
      colorize("cyan", "\nSelect an option: "),
      (input) => {
        const num = parseInt(input);
        if (Number.isNaN(num) || num < 1 || num > options.length) {
          return `Please enter a number between 1 and ${options.length}`;
        }
        return true;
      }
    );

    return parseInt(choice) - 1;
  }

  async promptText(question) {
    return this.ask(colorize("cyan", `${question} `));
  }

  close() {
   
  }
}

module.exports = { SimpleInput, colorize };
