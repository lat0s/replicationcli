const http = require("http");
const https = require("https");

const { GoogleGenAI } = require("@google/genai");

const { colorize } = require("./simpleInput");

class LlmApiClient {
  constructor(configs) {
    this.lmStudioConfig = configs.lmStudioConfig;
    this.geminiConfig = configs.geminiConfig;
    this.deepSeekConfig = configs.deepSeekConfig;
    this.openRouterConfig = configs.openRouterConfig;

    if (this.geminiConfig.apiKey) {
      this.genAI = new GoogleGenAI({ apiKey: this.geminiConfig.apiKey });
    }
  }

  async getCurrentModel() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.lmStudioConfig.host,
        port: this.lmStudioConfig.port,
        path: "/v1/models",
        method: "GET",
      };

      const req = http.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (response.data && response.data.length > 0) {
              resolve(response.data[0].id);
            } else {
              reject(
                new Error(
                  "No model is currently loaded in LM Studio. Please load a model first."
                )
              );
            }
          } catch (parseError) {
            reject(
              new Error("Failed to get model information from LM Studio.")
            );
          }
        });
      });

      req.on("error", () => {
        reject(
          new Error(
            "Cannot connect to LM Studio server to check loaded models."
          )
        );
      });

      req.setTimeout(5000, () => {
        req.destroy();
        reject(new Error("Timeout while checking for loaded models."));
      });

      req.end();
    });
  }

  async callLMStudioApi(prompt, model) {
    console.log(colorize("cyan", "\n🔄 Calling LM Studio API..."));
    console.log(colorize("gray", `   Model: ${model}`));
    console.log(
      colorize(
        "gray",
        `   Endpoint: ${this.lmStudioConfig.completionsEndpoint}`
      )
    );

    console.log(colorize("yellow", "\n📤 Prompt being sent to LLM:"));
    console.log(
      colorize("gray", "────────────────────────────────────────────────────")
    );
    console.log(
      colorize(
        "blue",
        prompt.substring(0, 700) + (prompt.length > 700 ? "..." : "")
      )
    );
    console.log(
      colorize("gray", "────────────────────────────────────────────────────")
    );
    if (prompt.length > 700) {
      console.log(
        colorize("gray", `   Full prompt length: ${prompt.length} characters`)
      );
    }

    const requestBody = JSON.stringify({
      model: model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.6,
      max_tokens: 8000,
      stream: false,
    });

    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.lmStudioConfig.host,
        port: this.lmStudioConfig.port,
        path: "/v1/chat/completions",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(requestBody),
        },
      };

      const req = http.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (response.error) {
              reject(
                new Error(
                  `LM Studio API error: ${response.error.message || response.error}`
                )
              );
            } else if (response.choices && response.choices.length > 0) {
              resolve(response.choices[0].message.content);
            } else {
              reject(new Error("No response generated from LM Studio"));
            }
          } catch (parseError) {
            reject(
              new Error(
                `Failed to parse LM Studio response: ${parseError.message}`
              )
            );
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`LM Studio API request failed: ${error.message}`));
      });

      req.write(requestBody);
      req.end();
    });
  }

  async callGeminiApi(prompt, modelConfig = {}) {
    console.log(colorize("cyan", "\n🔄 Calling Gemini API..."));
    console.log(colorize("gray", `   Model: ${this.geminiConfig.model}`));
    console.log(colorize("gray", `   Endpoint: Official Google GenAI SDK`));

    const temperature = modelConfig.temperature || 0.1;
    const maxTokens = modelConfig.maxTokens || 8000;

    console.log(colorize("gray", `   Temperature: ${temperature}`));
    console.log(colorize("gray", `   Max Tokens: ${maxTokens}`));

    console.log(colorize("yellow", "\n📤 Prompt being sent to LLM:"));
    console.log(
      colorize("gray", "────────────────────────────────────────────────────")
    );
    console.log(
      colorize(
        "blue",
        prompt.substring(0, 500) + (prompt.length > 500 ? "..." : "")
      )
    );
    console.log(
      colorize("gray", "────────────────────────────────────────────────────")
    );
    if (prompt.length > 500) {
      console.log(
        colorize("gray", `   Full prompt length: ${prompt.length} characters`)
      );
    }

    if (!this.genAI) {
      throw new Error(
        "Gemini API client not initialized. Please check your GEMINI_API_KEY."
      );
    }

    try {
      const response = await this.genAI.models.generateContent({
        model: this.geminiConfig.model,
        contents: prompt,
        config: {
          thinkingConfig: {
            thinkingBudget: 0,
          },
          temperature: temperature,
          maxOutputTokens: maxTokens,
        },
      });

      if (response && response.text) {
        return response.text;
      } else {
        throw new Error("No response generated from Gemini");
      }
    } catch (error) {
      if (error.message.includes("API_KEY")) {
        throw new Error(
          `Gemini API authentication error: Invalid API key. Please check your GEMINI_API_KEY environment variable.`
        );
      } else if (error.message.includes("quota")) {
        throw new Error(`Gemini API quota exceeded: ${error.message}`);
      } else if (error.message.includes("rate limit")) {
        throw new Error(`Gemini API rate limit exceeded: ${error.message}`);
      } else {
        throw new Error(`Gemini API error: ${error.message}`);
      }
    }
  }

  async callDeepSeekApi(prompt, modelConfig = {}) {
    console.log(colorize("cyan", "\n🔄 Calling DeepSeek API..."));
    console.log(colorize("gray", `   Model: ${this.deepSeekConfig.model}`));
    console.log(
      colorize("gray", `   Endpoint: ${this.deepSeekConfig.endpoint}`)
    );

    const temperature = modelConfig.temperature || 0.1;
    const maxTokens = modelConfig.maxTokens || 4000;
    const stream =
      modelConfig.stream !== undefined ? modelConfig.stream : false;

    console.log(colorize("gray", `   Temperature: ${temperature}`));
    console.log(colorize("gray", `   Max Tokens: ${maxTokens}`));

    console.log(colorize("yellow", "\n📤 Prompt being sent to LLM:"));
    console.log(
      colorize("gray", "────────────────────────────────────────────────────")
    );
    console.log(
      colorize(
        "blue",
        prompt.substring(0, 500) + (prompt.length > 500 ? "..." : "")
      )
    );
    console.log(
      colorize("gray", "────────────────────────────────────────────────────")
    );
    if (prompt.length > 500) {
      console.log(
        colorize("gray", `   Full prompt length: ${prompt.length} characters`)
      );
    }

    const requestBody = JSON.stringify({
      model: this.deepSeekConfig.model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: temperature,
      max_tokens: maxTokens,
      stream: stream,
    });

    const url = new URL(this.deepSeekConfig.endpoint);

    return new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.deepSeekConfig.apiKey}`,
          "Content-Length": Buffer.byteLength(requestBody),
        },
      };

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (response.error) {
              reject(
                new Error(
                  `DeepSeek API error: ${response.error.message || response.error}`
                )
              );
            } else if (response.choices && response.choices.length > 0) {
              resolve(response.choices[0].message.content);
            } else {
              reject(new Error("No response generated from DeepSeek"));
            }
          } catch (parseError) {
            reject(
              new Error(
                `Failed to parse DeepSeek response: ${parseError.message}`
              )
            );
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`DeepSeek API request failed: ${error.message}`));
      });

      req.write(requestBody);
      req.end();
    });
  }

  async callOpenRouterApi(prompt, modelConfig = {}) {
    console.log(colorize("cyan", "\n🔄 Calling OpenRouter API..."));
    console.log(colorize("gray", `   Model: ${this.openRouterConfig.model}`));
    console.log(
      colorize("gray", `   Endpoint: ${this.openRouterConfig.endpoint}`)
    );

    const temperature = modelConfig.temperature || 0.6;
    const maxTokens = modelConfig.maxTokens || 8000;
    const stream =
      modelConfig.stream !== undefined ? modelConfig.stream : false;
    const topP = modelConfig.topP || undefined;
    const frequencyPenalty = modelConfig.frequencyPenalty || undefined;
    const presencePenalty = modelConfig.presencePenalty || undefined;

    console.log(colorize("gray", `   Temperature: ${temperature}`));
    console.log(colorize("gray", `   Max Tokens: ${maxTokens}`));

    console.log(colorize("yellow", "\n📤 Prompt being sent to LLM:"));
    console.log(
      colorize("gray", "────────────────────────────────────────────────────")
    );
    console.log(
      colorize(
        "blue",
        prompt.substring(0, 500) + (prompt.length > 500 ? "..." : "")
      )
    );
    console.log(
      colorize("gray", "────────────────────────────────────────────────────")
    );
    if (prompt.length > 500) {
      console.log(
        colorize("gray", `   Full prompt length: ${prompt.length} characters`)
      );
    }

    const requestBody = {
      model: this.openRouterConfig.model,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: temperature,
      max_tokens: maxTokens,
      stream: stream,
    };

    if (topP !== undefined) requestBody.top_p = topP;
    if (frequencyPenalty !== undefined)
      requestBody.frequency_penalty = frequencyPenalty;
    if (presencePenalty !== undefined)
      requestBody.presence_penalty = presencePenalty;

    if (modelConfig.includeReasoning) {
      requestBody.include_reasoning = true;
      console.log(colorize("gray", "   Include Reasoning: enabled"));
    }

    const requestBodyString = JSON.stringify(requestBody);

    const url = new URL(this.openRouterConfig.endpoint);

    return new Promise((resolve, reject) => {
      const options = {
        hostname: url.hostname,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.openRouterConfig.apiKey}`,
          "HTTP-Referer": "https://github.com/lat0s/replicationcli",
          "X-Title": "Replication CLI",
          "Content-Length": Buffer.byteLength(requestBodyString),
        },
      };

      const req = https.request(options, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          try {
            const response = JSON.parse(data);
            if (response.error) {
              reject(
                new Error(
                  `OpenRouter API error: ${response.error.message || response.error}`
                )
              );
            } else if (response.choices && response.choices.length > 0) {
              const choice = response.choices[0];
              let finalResponse = choice.message.content;

              if (choice.message.reasoning && modelConfig.includeReasoning) {
                console.log(
                  colorize("cyan", "\n🧠 Reasoning Process Detected:")
                );
                console.log(
                  colorize(
                    "gray",
                    "────────────────────────────────────────────────────"
                  )
                );
                console.log(
                  colorize(
                    "yellow",
                    choice.message.reasoning.substring(0, 500) +
                      (choice.message.reasoning.length > 500 ? "..." : "")
                  )
                );
                console.log(
                  colorize(
                    "gray",
                    "────────────────────────────────────────────────────"
                  )
                );

                finalResponse = {
                  reasoning: choice.message.reasoning,
                  answer: choice.message.content,
                  hasReasoning: true,
                };
              }

              resolve(finalResponse);
            } else {
              reject(new Error("No response generated from OpenRouter"));
            }
          } catch (parseError) {
            reject(
              new Error(
                `Failed to parse OpenRouter response: ${parseError.message}`
              )
            );
          }
        });
      });

      req.on("error", (error) => {
        reject(new Error(`OpenRouter API request failed: ${error.message}`));
      });

      req.write(requestBodyString);
      req.end();
    });
  }

  async checkLMStudioServerStatus() {
    return new Promise((resolve) => {
      const req = http.get(this.lmStudioConfig.modelsEndpoint, (res) => {
        resolve(res.statusCode === 200);
      });

      req.on("error", () => {
        resolve(false);
      });

      req.setTimeout(5000, () => {
        req.destroy();
        resolve(false);
      });
    });
  }
}

module.exports = LlmApiClient;
