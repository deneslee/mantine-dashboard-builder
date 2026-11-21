import { z } from 'zod';

/** The parts of a service-account key file the plugin uses. */
export const serviceAccountKeySchema = z.object({
  client_email: z.email(),
  private_key: z.string().includes('PRIVATE KEY'),
  private_key_id: z.string().optional(),
  project_id: z.string().optional(),
});

/** A field that may be left empty: blank reads as absent. */
export const optionalText = z
  .string()
  .trim()
  .transform((value) => value || undefined)
  .optional();

export const googleSecretsSchema = z
  .object({
    /** A service-account key file's JSON. */
    serviceAccountKey: optionalText,
    /** An OAuth access token, e.g. from `gcloud auth print-access-token`; it expires within an hour. */
    accessToken: optionalText,
  })
  .superRefine((secrets, ctx) => {
    if (!secrets.serviceAccountKey && !secrets.accessToken)
      ctx.addIssue({
        code: 'custom',
        path: ['serviceAccountKey'],
        message: 'Add a service-account key or an access token.',
      });
    if (secrets.serviceAccountKey) {
      let json: unknown;
      try {
        json = JSON.parse(secrets.serviceAccountKey);
      } catch {
        json = null;
      }
      if (!serviceAccountKeySchema.safeParse(json).success)
        ctx.addIssue({
          code: 'custom',
          path: ['serviceAccountKey'],
          message: "That isn't a service-account key file (it needs client_email and private_key).",
        });
    }
  });

export type GoogleSecrets = z.infer<typeof googleSecretsSchema>;
