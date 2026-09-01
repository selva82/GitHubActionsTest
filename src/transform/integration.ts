import { AppError } from '../errors/AppError';
import { IntegrationType } from '../types';

type Settings = Record<string, unknown>;

function setting(settings: Settings, key: string, fallback: string): string {
  const value = settings[key];
  return typeof value === 'string' && value.length > 0 ? value : fallback;
}

export function normalizeIntegrationType(value: unknown): IntegrationType {
  const normalized = String(value ?? '').replace(/[-_\s]/g, '').toUpperCase();
  if (normalized === 'VPCLINK' || normalized === 'HTTP' || normalized === 'LAMBDA' || normalized === 'AWSSERVICE') {
    return normalized;
  }
  throw new AppError(`Unsupported integration type: ${String(value)}`);
}

export function createIntegration(typeValue: unknown, settings: Settings, method: string, path: string): Settings {
  const type = normalizeIntegrationType(typeValue);
  const httpMethod = method.toUpperCase();

  switch (type) {
    case 'VPCLINK':
      return {
        type: 'http_proxy',
        httpMethod,
        connectionType: 'VPC_LINK',
        connectionId: setting(settings, 'connection-id', '${stageVariables.vpcLinkId}'),
        uri: `${setting(settings, 'backend-url', '${stageVariables.backendUrl}')}${path}`
      };
    case 'HTTP':
      return {
        type: 'http_proxy',
        httpMethod,
        uri: `${setting(settings, 'backend-url', '${stageVariables.backendUrl}')}${path}`
      };
    case 'LAMBDA':
      return {
        type: 'aws_proxy',
        httpMethod: 'POST',
        uri: setting(settings, 'lambda-uri', '${stageVariables.lambdaUri}')
      };
    case 'AWSSERVICE':
      return {
        type: 'aws',
        httpMethod: setting(settings, 'aws-service-http-method', 'POST').toUpperCase(),
        uri: setting(settings, 'aws-service-uri', '${stageVariables.awsServiceUri}')
      };
  }
}