import { readFileSync } from 'node:fs';
import { load } from 'js-yaml';
import { AppError } from '../errors/AppError';
import { GatewayConfig } from '../types';

export function loadYamlFile<T>(filePath: string): T {
  try {
    const value = load(readFileSync(filePath, 'utf8'));
    if (!value || typeof value !== 'object') {
      throw new AppError(`YAML document is empty or invalid: ${filePath}`);
    }
    return value as T;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError(`Unable to read YAML file: ${filePath}`, error);
  }
}

export function loadGatewayConfig(filePath: string): GatewayConfig {
  const config = loadYamlFile<GatewayConfig>(filePath);
  const stages = config.aws?.['api-gateway']?.rest?.stages;
  if (!Array.isArray(stages) || stages.length === 0) {
    throw new AppError('Gateway configuration must define at least one REST stage.');
  }
  return config;
}