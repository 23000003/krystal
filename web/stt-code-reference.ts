// import fs from "fs";

// const audioBuffer = await fs.promises.readFile("audio.wav");
// const base64Audio = audioBuffer.toString("base64");

// const response = await fetch("https://openrouter.ai/api/v1/audio/transcriptions", {
//   method: "POST",
//   headers: {
//     "Authorization": `Bearer ${<OPENROUTER_API_KEY>}`,
//     "Content-Type": "application/json",
//     "HTTP-Referer": "<YOUR_SITE_URL>", // Optional. Site URL for rankings on openrouter.ai.
//     "X-OpenRouter-Title": "<YOUR_SITE_NAME>", // Optional. Site title for rankings on openrouter.ai.
//   },
//   body: JSON.stringify({
//     model: "qwen/qwen3-asr-1.7b",
//     input_audio: {
//       data: base64Audio,
//       format: "wav"
//     }
//   })
// });

// const result = await response.json();
// console.log(result.text);