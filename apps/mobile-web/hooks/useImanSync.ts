import { useState, useCallback } from "react";
import { api } from "../lib/api";
import type { ImanSyncAnalyzeResponse } from "@imanifest/shared";

interface UseImanSyncReturn {
  /** Analysis result from the server */
  result: ImanSyncAnalyzeResponse | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if analysis failed */
  error: string | null;
  /** Trigger text analysis */
  analyze: (intentText: string) => Promise<void>;
  /** Trigger vision analysis (image + text) */
  analyzeVision: (intentText: string, imageBase64: string, imageUri?: string) => Promise<void>;
  /** Reset state to initial */
  reset: () => void;
}

export function useImanSync(): UseImanSyncReturn {
  const [result, setResult] = useState<ImanSyncAnalyzeResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const analyze = useCallback(async (intentText: string) => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await api.post<ImanSyncAnalyzeResponse>(
        "/iman-sync/analyze",
        { intentText },
      );
      setResult(response.data);
    } catch (err) {
      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Try again.";
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const analyzeVision = useCallback(
    async (intentText: string, imageBase64: string, imageUri?: string) => {
      setIsLoading(true);
      setError(null);
      setResult(null);

      try {
        // Detect MIME type from URI extension
        let mimeType = "image/jpeg";
        if (imageUri) {
          const ext = imageUri.toLowerCase().split(".").pop()?.split("?")[0];
          if (ext === "png") mimeType = "image/png";
        }

        const formData = new FormData();
        formData.append("intentText", intentText);

        // Create a blob from base64 for multipart upload
        const byteCharacters = atob(imageBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });
        const extension = mimeType === "image/png" ? "png" : "jpg";
        formData.append("image", blob, `image.${extension}`);

        const response = await api.post<ImanSyncAnalyzeResponse>(
          "/iman-sync/analyze-vision",
          formData,
          {
            headers: {
              "Content-Type": "multipart/form-data",
            },
            timeout: 15000,
          },
        );

        setResult(response.data);
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : "Vision analysis failed. Try again.";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const reset = useCallback(() => {
    setResult(null);
    setError(null);
    setIsLoading(false);
  }, []);

  return { result, isLoading, error, analyze, analyzeVision, reset };
}