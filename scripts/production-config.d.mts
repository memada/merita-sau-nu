export function validateProductionConfig(env?: NodeJS.ProcessEnv): {
  configured: boolean;
  issues: string[];
};
