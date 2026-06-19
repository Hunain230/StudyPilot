const Groq = require('groq-sdk');
const dotenv = require('dotenv');
dotenv.config();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

async function main() {
  console.log("Testing Groq API connection...");
  console.log("Using model:", process.env.GROQ_MODEL || 'llama-3.1-8b-instant');
  try {
    const response = await groq.chat.completions.create({
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: 'Say hello in 5 words.' }],
    });
    console.log("Success! Response:", response.choices[0]?.message?.content);
  } catch (error) {
    console.error("Groq API Call Failed!");
    console.error("Status Code:", error.status);
    console.error("Error Message:", error.message || error);
  }
}

main();
