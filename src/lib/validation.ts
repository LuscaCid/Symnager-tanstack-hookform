import { z } from "zod"
import { isValidDocument, onlyDigits } from "./format"

/** Mesma política de senha da API: 8+ caracteres, ao menos uma letra e um número. */
export const passwordSchema = z
  .string()
  .min(8, "A senha precisa ter ao menos 8 caracteres")
  .max(128, "Senha muito longa")
  .regex(/[A-Za-z]/, "A senha precisa ter ao menos uma letra")
  .regex(/\d/, "A senha precisa ter ao menos um número")

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Mínimo de 3 caracteres")
  .max(32, "Máximo de 32 caracteres")
  .regex(/^[a-zA-Z0-9._-]+$/, "Use apenas letras, números, ponto, hífen ou sublinhado")

export const optionalEmail = z
  .string()
  .trim()
  .max(120)
  .refine((v) => !v || z.string().email().safeParse(v).success, "E-mail inválido")

export const optionalDocument = z
  .string()
  .trim()
  .refine((v) => !v || isValidDocument(v), "CPF/CNPJ inválido")
  .transform((v) => onlyDigits(v))

export const phoneSchema = z
  .string()
  .trim()
  .refine((v) => onlyDigits(v).length >= 10 && onlyDigits(v).length <= 13, "Telefone inválido (com DDD)")
