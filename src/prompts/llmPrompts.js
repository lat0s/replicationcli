const { colorize } = require("../simpleInput");

/**
 * Simple prompt manager for codebase file regeneration.
 * Contains a single prompt template for MERN stack file generation.
 */
class LlmPrompts {
  constructor() {
    // Simple universal prompt for MERN stack file generation
    this.template = `You are a MERN stack developer. Generate the missing file \`{filename}\` based on the complete codebase provided below.

**RULES:**
- Analyze the codebase to understand existing patterns, imports, and dependencies
- Only use imports and functions that exist in the provided codebase
- Follow the same coding style and structure as similar files
- DO NOT invent or hallucinate imports/libraries that don't exist in the codebase.
- DO NOT assume any other functions/files exist in the codebase apart from the ones i sent you.
- Component should be able to work correctly with the existing codebase without any changes.

The file will be saved at this path: \`{path}\` so make sure imports are correct.
Generate only the complete code for \`{filename}\` - no explanations, no markdown formatting, the response will be saved as \`{filename}\` and it should be good to go.

**CODEBASE:**
{codebase}`;

}

  /**
   * Format the prompt with the provided context data.
   * @param {object} context - Context data including filename, path, codebase
   * @returns {string} Formatted prompt ready to send to LLM
   */
  formatPrompt(context) {
    let formattedPrompt = this.template;

    // Replace placeholders with actual values
    if (context.filename) {
      formattedPrompt = formattedPrompt.replace(/{filename}/g, context.filename);
    }
    if (context.path) {
      formattedPrompt = formattedPrompt.replace(/{path}/g, context.path);
    }
    if (context.codebase) {
      formattedPrompt = formattedPrompt.replace(/{codebase}/g, context.codebase);
    }

    return formattedPrompt;
  }
}

module.exports = LlmPrompts;
