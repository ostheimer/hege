import { validationError } from "./validation";

interface ParseImageUploadOptions {
  allowedContentTypes: readonly string[];
  maxSizeBytes: number;
}

export async function parseImageUploadFormData(
  request: Request,
  options: ParseImageUploadOptions
) {
  const contentType = request.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("multipart/form-data")) {
    throw validationError("Der Request-Body muss multipart/form-data sein.");
  }

  let formData: FormData;

  try {
    formData = await request.formData();
  } catch {
    throw validationError("Der Request-Body konnte nicht als multipart/form-data gelesen werden.");
  }

  const allowedKeys = new Set(["file", "title"]);

  for (const key of formData.keys()) {
    if (!allowedKeys.has(key)) {
      throw validationError("Nur die Felder file und title sind erlaubt.");
    }
  }

  const fileValues = formData.getAll("file");

  if (fileValues.length !== 1) {
    throw validationError("Genau eine Datei im Feld file ist erforderlich.");
  }

  const file = fileValues[0];

  if (!(file instanceof File)) {
    throw validationError("file muss eine Datei sein.");
  }

  if (file.size <= 0) {
    throw validationError("file darf nicht leer sein.");
  }

  if (file.size > options.maxSizeBytes) {
    throw validationError("Dateien dürfen maximal 10 MB groß sein.");
  }

  if (!options.allowedContentTypes.includes(file.type)) {
    throw validationError("Nur JPEG- und PNG-Dateien sind erlaubt.");
  }

  const titleValues = formData.getAll("title");

  if (titleValues.length > 1) {
    throw validationError("title darf nur einmal übermittelt werden.");
  }

  const titleValue = titleValues[0];

  if (titleValue != null && typeof titleValue !== "string") {
    throw validationError("title muss ein String sein.");
  }

  const title = typeof titleValue === "string" ? titleValue.trim() : undefined;

  return {
    file,
    title: title && title.length > 0 ? title : undefined
  };
}
