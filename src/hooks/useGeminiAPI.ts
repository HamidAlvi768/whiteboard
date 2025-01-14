import { useState } from "react";

const GEMINI_API_KEY = "AIzaSyAjQSf6sdN7rWy-TAA2kTrF_8ledYvLHwU";
const API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";

export const useGeminiAPI = () => {
  const [isProcessing, setIsProcessing] = useState(false);

  const processHandwriting = async (imageData: string): Promise<string> => {
    setIsProcessing(true);
    try {
      const base64Data = imageData.split(",")[1];

      const requestBody = {
        contents: [
          {
            parts: [
              {
                text: "You are a handwriting recognition expert. The image contains handwritten text. Extract and return ONLY the text content, exactly as written. Do not include any explanations or additional text in your response. If you see no text or the image is blank, respond with an empty string.Return ONLY the text or character drawn in the image. Do not include any descriptions, explanations, or additional text. For example, if you see the letter 'A', respond with just 'A'. If you see no text, respond with an empty string.",
              },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: base64Data,
                },
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          topK: 1,
          topP: 1,
          maxOutputTokens: 256,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE",
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE",
          },
        ],
      };

      const response = await fetch(`${API_URL}?key=${GEMINI_API_KEY}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        throw new Error(
          `Failed to process handwriting: ${
            errorData.error?.message || "Unknown error"
          }`
        );
      }

      const data = await response.json();
      const text = data.candidates[0].content.parts[0].text.trim();

      // Clean the response to remove any descriptions or explanations
      const cleanedText = text
        .replace(/^["']|["']$/g, "") // Remove quotes
        .replace(/^The image shows |^I see |^This is |^The image contains |^The letter |^The character |^The text |^It appears to be |^It shows |^It is |^This looks like /, "")
        .replace(/ drawn in the image$| in the image$| appears$| is shown$/, "")
        .replace(/^a |^an |^the /, "")
        .replace(/^hand-drawn |^handwritten /, "")
        .replace(/^uppercase letter |^lowercase letter |^letter /, "")
        .replace(/^character |^symbol /, "")
        .trim();

      return cleanedText;
    } catch (error) {
      console.error("Error processing handwriting:", error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  return {
    processHandwriting,
    isProcessing,
  };
};
