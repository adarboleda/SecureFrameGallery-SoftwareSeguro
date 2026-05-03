import { z } from "zod";

// Validación de Álbum (RF02) - Previene XSS y datos inválidos en el cliente
export const albumSchema = z.object({
  title: z.string().min(3, "El título debe tener al menos 3 caracteres").max(50),
  description: z.string().min(5, "Descripción muy corta").max(200),
  privacy: z.enum(["public", "private"], { message: "Selecciona la privacidad del álbum" }),
});

export type AlbumFormData = z.infer<typeof albumSchema>;
